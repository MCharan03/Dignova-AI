"""
custom_agent.py - Dignova Sentient Self-Contained Custom Voice Engine
========================================================================
100% independent custom Voice Agent pipeline:
- EHR Patient Medical History Injection (allergies, chronic conditions, vitals)
- Multimodal Senior Doctor Persona (Internal Medicine, Triage, Cardiology)
- Zero-API-Key Neural Speech Synthesis (via edge-tts)
- Instant Interruption & Red-Flag Escalation ([EMERGENCY_DETECTED])
"""

import os
import json
import base64
import asyncio
import io
from typing import Dict, Any, Optional, AsyncGenerator
from sqlalchemy import select

from ..extensions import AsyncSessionLocal
from .. import models as domain
from ..services.ai_service import SentientOrchestrator

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False


class CustomVoiceAgent:
    """
    Self-contained Senior Multi-Specialist Doctor Voice Engine.
    Handles EHR context enrichment, streaming response generation, and neural audio synthesis.
    """

    DEFAULT_VOICE = "en-US-AndrewNeural" # Senior Doctor Voice (Male)
    FEMALE_VOICE  = "en-US-AvaNeural"    # Senior Doctor Voice (Female)

    def __init__(self, voice: str = "en-US-AndrewNeural"):
        self.voice = voice
        self.orchestrator = SentientOrchestrator(persona="TRIAGE")

    async def get_patient_ehr_context(self, user_id: Optional[int]) -> str:
        """Fetch patient's electronic health record (EHR) context from database."""
        if not user_id:
            return "Patient History: Anonymous walk-in patient. No prior EHR charts on file."

        try:
            async with AsyncSessionLocal() as session:
                stmt = select(domain.User).where(domain.User.id == user_id)
                user = await session.scalar(stmt)
                if not user:
                    return "Patient History: New patient record."

                ehr_summary = f"""PATIENT EHR CHART:
- Name: {user.name}
- Age: {user.age or 'Not specified'} | Blood Group: {user.blood_group or 'Unknown'}
- Known Allergies: {user.allergies or 'None reported'}
- Current Medications: {user.medications or 'None reported'}
- Chronic Conditions: {user.chronic_conditions or 'None reported'}
- Vitals: Weight {user.weight_kg or '-'} kg, Height {user.height_cm or '-'} cm
- Historical Stress Index: {user.avg_stress_level or 0.5:.2f}
"""
                return ehr_summary
        except Exception as e:
            print(f"[WARN] EHR Context fetch notice: {e}")
            return "Patient History: Standard consultation."

    def build_custom_doctor_prompt(self, ehr_context: str, philosophy: str = "balanced") -> str:
        """Build Dr. Dignova's system prompt enriched with patient EHR context."""
        return f"""You are Dr. Dignova, a senior consultant physician conducting a live clinical consultation.
You are warm, attentive, and highly natural. Speak like a real human doctor sitting with a patient. Never sound robotic or pre-programmed.

{ehr_context}

Clinical Voice Protocol:
1. ALWAYS acknowledge what the patient just said with warm empathy (e.g. "I understand...", "I see, that sounds uncomfortable...", "Thank you for sharing that...").
2. Ask targeted follow-up clinical questions to explore symptom location, intensity (1-10 scale), duration, and accompanying symptoms (fever, nausea, breathlessness, dizziness).
3. DO NOT deliver a final diagnosis on early turns (turn 1 or 2). Ask clarifying follow-up questions first to get complete details.
4. Only when you have gathered sufficient clinical information (after at least 2-3 turns of dialogue), state your diagnostic impression, provide recommended self-care, and append [DIAGNOSIS_READY] at the end.
5. If dangerous red flags are mentioned (chest pain, shortness of breath, collapse), advise immediate emergency care and append [EMERGENCY_DETECTED].
6. Keep spoken replies to 2-3 natural sentences suitable for a live voice call. Do NOT use markdown symbols, stage directions, or metadata tags.
"""

    async def generate_speech_audio(self, text: str) -> Optional[str]:
        """Synthesize neural audio for text using edge-tts and return base64 MP3 payload."""
        if not HAS_EDGE_TTS or not text or not text.strip():
            return None

        clean_text = text.replace("[EMERGENCY_DETECTED]", "").replace("[DIAGNOSIS_READY]", "").strip()
        if not clean_text:
            return None

        try:
            communicate = edge_tts.Communicate(clean_text, self.voice)
            audio_data = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])

            if audio_data:
                return base64.b64encode(audio_data).decode("utf-8")
        except Exception as e:
            print(f"[WARN] Neural TTS Error: {e}")

        return None

    async def process_patient_turn(self, transcript: str, new_text: str, user_id: Optional[int] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process incoming patient turn:
        1. Inject EHR context
        2. Generate response via streaming LLM
        3. Convert output to neural audio base64 payload
        4. Yield dict frames for WebSocket delivery
        """
        ehr = await self.get_patient_ehr_context(user_id)
        self.orchestrator.system_instruction = self.build_custom_doctor_prompt(ehr)

        full_response = ""
        sentence_buffer = ""

        for chunk in self.orchestrator.process_message_stream(transcript, new_text):
            full_response += chunk
            sentence_buffer += chunk

            # Synthesize audio on sentence boundaries for fluid streaming
            if any(p in sentence_buffer for p in [". ", "? ", "! ", ".\n", "?\n", "!\n", ". ", "...\n"]):
                clean_text = sentence_buffer.strip()
                if clean_text:
                    audio_b64 = await self.generate_speech_audio(clean_text)
                    yield {
                        "event": "ai_response_chunk",
                        "text": clean_text,
                        "audio": audio_b64
                    }
                sentence_buffer = ""

        # Flush remaining buffer
        if sentence_buffer.strip():
            clean_text = sentence_buffer.strip()
            audio_b64 = await self.generate_speech_audio(clean_text)
            yield {
                "event": "ai_response_chunk",
                "text": clean_text,
                "audio": audio_b64
            }

        # Check triggers
        if "[EMERGENCY_DETECTED]" in full_response:
            yield {"event": "emergency_detected", "text": "Emergency escalation triggered."}
        if "[DIAGNOSIS_READY]" in full_response:
            yield {"event": "diagnosis_ready", "text": "Clinical assessment finalized."}
