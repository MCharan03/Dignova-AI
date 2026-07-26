"""
voice_routes.py - STT+LLM+TTS Fallback Pipeline
Handles the text-based fallback for voice triage when Gemini Live WebSocket
audio is unavailable. The frontend sends recognized speech text here and
gets streamed AI text back which it reads aloud via Web Speech Synthesis.
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from ..extensions import get_db, AsyncSessionLocal
from .. import models as domain
from ..utils.auth import get_current_user
from ..services.ai_service import SentientOrchestrator
from ..services.tts_service import tts_service

router = APIRouter(prefix="/api", tags=["Voice Triage"])


class VoiceTextRequest(BaseModel):
    text: str
    call_id: int


@router.post("/calls/{call_id}/voice-text")
async def voice_text_triage(
    call_id: int,
    request: VoiceTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: domain.User = Depends(get_current_user),
):
    """
    Enhanced Voice Triage Endpoint.
    Accepts recognized speech text from the frontend,
    runs it through the Triage AI, and STREAMS THE AUDIO response back.
    Uses OpenAI TTS for low-latency, high-fidelity voice.
    """
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")

    if db_call.user_id != current_user.id and current_user.role not in [
        domain.UserRole.super_admin,
        domain.UserRole.org_admin,
        domain.UserRole.doctor,
    ]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get organisation philosophy
    philosophy = "balanced"
    if db_call.organization_id:
        org_stmt = select(domain.Organization).where(
            domain.Organization.id == db_call.organization_id
        )
        org = await db.scalar(org_stmt)
        if org:
            philosophy = org.ai_philosophy

    agent = SentientOrchestrator(philosophy=philosophy)

    # Append user message to transcript
    user_line = f"PATIENT: {request.text}\n"
    db_call.transcript = (db_call.transcript or "") + user_line
    await db.commit()

    current_transcript = db_call.transcript or ""

    if not tts_service.client:
        # No OpenAI API Key -> Fallback to returning text for frontend native TTS
        full_response = ""
        for chunk in agent.process_message_stream(current_transcript, request.text):
            full_response += chunk
            
        db_call.transcript += f"ASSISTANT: {full_response}\n"
        if "[EMERGENCY_DETECTED]" in full_response:
            db_call.severity = "CRITICAL"
        elif "[DIAGNOSIS_READY]" in full_response:
            db_call.severity = "ELEVATED"
            
        await db.commit()
        return {"text": full_response.replace("[EMERGENCY_DETECTED]", "").replace("[DIAGNOSIS_READY]", "").strip()}

    # Mutable container so the generator can write to it and we can read after
    response_holder = {"text": ""}

    async def audio_stream_generator():
        # 1. We need to wrap the agent's sync generator into an async one for TTSService
        async def text_gen():
            for chunk in agent.process_message_stream(current_transcript, request.text):
                response_holder["text"] += chunk
                yield chunk

        # 2. Stream the audio from OpenAI TTS
        async for audio_chunk in tts_service.stream_speech(text_gen()):
            yield audio_chunk

        # 3. Save AI response to DB (after audio stream finishes)
        full_response = response_holder["text"]
        async with AsyncSessionLocal() as session:
            c_stmt = select(domain.Call).where(domain.Call.call_id == call_id)
            inner_call = await session.scalar(c_stmt)
            if inner_call:
                inner_call.transcript = (
                    inner_call.transcript or ""
                ) + f"ASSISTANT: {full_response}\n"

                # Auto-escalation detection
                if "[EMERGENCY_DETECTED]" in full_response:
                    inner_call.severity = "CRITICAL"
                elif "[DIAGNOSIS_READY]" in full_response:
                    inner_call.severity = "ELEVATED"

                await session.commit()

    return StreamingResponse(
        audio_stream_generator(),
        media_type="audio/mpeg",
        headers={
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/calls/{call_id}/summary")
async def get_call_summary(
    call_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: domain.User = Depends(get_current_user),
):
    """
    Returns a structured AI summary of the call for the post-call screen.
    Includes emotional telemetry (stress level and primary emotion).
    """
    try:
        stmt = select(domain.Call).where(domain.Call.call_id == call_id)
        db_call = await db.scalar(stmt)
        if not db_call:
            raise HTTPException(status_code=404, detail="Call not found")

        agent = SentientOrchestrator()
        summary = agent.evaluate_performance(db_call.transcript or "")

        stress_level = float(summary.get("stress_level", 0.5))
        primary_emotion = summary.get("primary_emotion", "calm")

        # Update patient's average stress level in the database
        if db_call.user_id:
            user_stmt = select(domain.User).where(domain.User.id == db_call.user_id)
            db_user = await db.scalar(user_stmt)
            if db_user:
                db_user.avg_stress_level = stress_level
                await db.commit()

        duration = 0
        if db_call.end_time and db_call.start_time:
            duration = int((db_call.end_time - db_call.start_time).total_seconds())

        return {
            "call_id": call_id,
            "duration_seconds": duration,
            "severity": db_call.severity or "NORMAL",
            "diagnosis": db_call.diagnosis_given or summary.get("diagnosis", "Assessment in progress"),
            "summary": summary.get("summary", ""),
            "recommended_resource": summary.get("recommended_resource", "General"),
            "transcript": db_call.transcript or "",
            "stress_level": stress_level,
            "primary_emotion": primary_emotion,
        }
    except Exception as e:
        print(f"CRITICAL: Summary generation failed: {e}")
        # Return a safe partial response instead of 500
        return {
            "call_id": call_id,
            "duration_seconds": 0,
            "severity": "NORMAL",
            "diagnosis": "Summary generation failed",
            "summary": str(e),
            "recommended_resource": "General",
            "transcript": "",
            "stress_level": 0.5,
            "primary_emotion": "calm",
        }
