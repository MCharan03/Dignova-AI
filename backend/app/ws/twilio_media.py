"""
twilio_media.py — Gemini Live ↔ Twilio Audio Bridge
Bidirectional real-time audio with live transcript saving and emergency auto-escalation.
"""
import json
import base64
import asyncio
import os
import audioop
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from ..extensions import AsyncSessionLocal
from .. import models as domain
from sqlalchemy import select
from ..services.ai_service import SentientOrchestrator
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter()

client = genai.Client(api_key=GEMINI_API_KEY, http_options={"api_version": "v1alpha"})
MODEL_ID = "gemini-2.0-flash-exp"

# Save transcript to DB every N assistant turns (reduces write overhead)
TRANSCRIPT_SAVE_INTERVAL = 3


async def _update_call_record(call_sid: str | None, transcript_chunk: str, severity: str | None = None):
    """Append transcript chunk and optionally update severity for a call."""
    if not call_sid:
        return
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(domain.Call).where(domain.Call.twilio_call_sid == call_sid)
            call = await session.scalar(stmt)
            if call:
                call.transcript = (call.transcript or "") + transcript_chunk
                if severity:
                    call.severity = severity
                await session.commit()
    except Exception as e:
        print(f"⚠️ Transcript save failed: {e}")


async def _escalate_emergency(call_sid: str | None, transcript: str):
    """Auto-escalate: mark severity CRITICAL and trigger n8n alert."""
    await _update_call_record(call_sid, "", severity="CRITICAL")
    try:
        from ..services.n8n_services import N8nService
        # Minimal payload — reuse existing n8n webhook
        await N8nService.trigger_onboarding("emergency@dignova.ai", "CRITICAL_PATIENT")
    except Exception as e:
        print(f"⚠️ Emergency escalation failed: {e}")


@router.websocket("/ws/twilio-media")
async def twilio_media_handler(websocket: WebSocket):
    """
    WebSocket bridge: Twilio Media Streams ↔ Gemini Live API.
    - Converts Twilio 8kHz mulaw ↔ Gemini 16kHz PCM
    - Saves running transcript to DB every TRANSCRIPT_SAVE_INTERVAL turns
    - Auto-escalates on [EMERGENCY_DETECTED] signal
    """
    await websocket.accept()

    stream_sid = None
    call_sid   = None

    # ── Wait for Twilio 'start' event ──────────────────────────────────────
    try:
        while True:
            msg = json.loads(await websocket.receive_text())
            if msg["event"] == "connected":
                continue
            if msg["event"] == "start":
                stream_sid = msg["start"]["streamSid"]
                call_sid   = msg["start"].get("customParameters", {}).get("callSid") \
                             or msg["start"].get("callSid")
                print(f"✅ Twilio stream started: {stream_sid} | call: {call_sid}")
                break
    except Exception as e:
        print(f"⚠️ Twilio start error: {e}")
        await websocket.close()
        return

    # ── Gemini Live session ────────────────────────────────────────────────
    orchestrator = SentientOrchestrator(persona="TRIAGE", philosophy="balanced")
    config = types.LiveConnectConfig(
        system_instruction=types.Content(
            parts=[types.Part(text=orchestrator.system_instruction)]
        ),
        generation_config=types.GenerateContentConfig(
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Aoede"  # Composed, authoritative professional doctor voice
                    )
                )
            )
        ),
        response_modalities=["AUDIO", "TEXT"],
    )

    assistant_turn_count  = 0
    accumulated_transcript = ""

    try:
        async with client.aio.live.connect(model=MODEL_ID, config=config) as gemini_session:
            print("✅ Connected to Gemini Live API")

            # Send greeting immediately
            await gemini_session.send(
                input=(
                    "Hello! This is Dr. Dignova AI, your autonomous medical assistant. "
                    "I'm here to help you right now. "
                    "Please tell me — what symptoms are you experiencing today?"
                ),
                end_of_turn=True,
            )

            # ── Twilio → Gemini (patient audio in) ────────────────────────
            async def twilio_to_gemini():
                try:
                    while True:
                        msg = json.loads(await websocket.receive_text())
                        if msg["event"] == "media":
                            mulaw  = base64.b64decode(msg["media"]["payload"])
                            lin8k  = audioop.ulaw2lin(mulaw, 2)
                            lin16k, _ = audioop.ratecv(lin8k, 2, 1, 8000, 16000, None)
                            await gemini_session.send({
                                "realtime_input": {
                                    "media_chunks": [{
                                        "data": base64.b64encode(lin16k).decode(),
                                        "mime_type": "audio/pcm;rate=16000",
                                    }]
                                }
                            })
                        elif msg["event"] == "stop":
                            print("📞 Twilio stream stopped.")
                            break
                except WebSocketDisconnect:
                    print("📞 Twilio WebSocket disconnected during receive.")
                except Exception as e:
                    print(f"⚠️ twilio→gemini error: {e}")

            # ── Gemini → Twilio (AI audio out + transcript logging) ────────
            async def gemini_to_twilio():
                nonlocal assistant_turn_count, accumulated_transcript
                try:
                    async for message in gemini_session.receive():
                        sc = message.server_content
                        if not sc:
                            continue

                        # Collect text for transcript + escalation check
                        if sc.model_turn:
                            for part in sc.model_turn.parts:
                                if part.text:
                                    accumulated_transcript += f"ASSISTANT: {part.text}\n"

                                if part.inline_data:
                                    # Audio: convert 16kHz PCM → 8kHz mulaw → send to Twilio
                                    pcm8k, _ = audioop.ratecv(part.inline_data.data, 2, 1, 16000, 8000, None)
                                    mulaw    = audioop.lin2ulaw(pcm8k, 2)
                                    await websocket.send_json({
                                        "event": "media",
                                        "streamSid": stream_sid,
                                        "media": {"payload": base64.b64encode(mulaw).decode()},
                                    })

                        # On turn complete: save transcript, check for emergency
                        if sc.turn_complete:
                            assistant_turn_count += 1

                            # Emergency detection
                            if "[EMERGENCY_DETECTED]" in accumulated_transcript:
                                await _escalate_emergency(call_sid, accumulated_transcript)
                                accumulated_transcript = accumulated_transcript.replace("[EMERGENCY_DETECTED]", "")

                            # Periodic DB save
                            if assistant_turn_count % TRANSCRIPT_SAVE_INTERVAL == 0 and accumulated_transcript:
                                await _update_call_record(call_sid, accumulated_transcript)
                                accumulated_transcript = ""

                except Exception as e:
                    print(f"⚠️ gemini→twilio error: {e}")
                finally:
                    # Flush any remaining transcript
                    if accumulated_transcript:
                        await _update_call_record(call_sid, accumulated_transcript)

            await asyncio.gather(twilio_to_gemini(), gemini_to_twilio())

    except WebSocketDisconnect:
        print("📞 Twilio WebSocket disconnected.")
    except Exception as e:
        print(f"⚠️ Twilio media bridge error: {e}")
    finally:
        # Flush final transcript on any exit path
        if accumulated_transcript:
            await _update_call_record(call_sid, accumulated_transcript)
