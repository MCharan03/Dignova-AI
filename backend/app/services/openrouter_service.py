"""
OpenRouter AI Service - Dignova AI
===================================
Handles all AI inference for the Telegram bot:
  1. Audio transcription via Whisper
  2. Medical triage + risk scoring
  3. Zero-touch prescription generation (low-risk cases)

Uses OpenRouter REST API so you can swap models without changing code.
Default model: google/gemini-flash-1.5 (free tier available on OpenRouter)
Whisper model: openai/whisper-large-v3
"""

import os
import json
import base64
import httpx
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY  = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL    = os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Headers required by OpenRouter (site is optional but good practice)
_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type":  "application/json",
    "HTTP-Referer":  "https://dignova.ai",
    "X-Title":       "Dignova AI"
}

_OR_AVAILABLE = bool(OPENROUTER_API_KEY and OPENROUTER_API_KEY != "your_openrouter_api_key_here")


class OpenRouterService:
    """
    Async AI service for the Telegram bot pipeline.
    All methods are async and safe to call from FastAPI background tasks.
    """

    # ─── Medical triage system prompt ────────────────────────────────────── #
    TRIAGE_SYSTEM = """You are Dignova, an autonomous AI medical triage assistant.
Analyze the patient's message and return ONLY a JSON object with this exact structure:
{
  "response": "Your empathetic, clear reply to the patient (plain text, 1-3 sentences)",
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "confidence": 0.0-1.0,
  "diagnosis": "Preliminary diagnosis or 'Insufficient information'",
  "red_flags": ["list", "of", "detected", "red", "flags"],
  "medications": [
    {"name": "DrugName", "dosage": "Xmg", "frequency": "Twice daily", "duration": "5 days"}
  ],
  "auto_prescribe": true or false,
  "escalate_to_doctor": true or false,
  "escalation_reason": "reason if escalate_to_doctor is true"
}

Rules:
- Set auto_prescribe=true ONLY if risk_level is LOW and confidence >= 0.90 and it is a minor, common condition (e.g. seasonal allergy, mild cold, routine refill).
- Set escalate_to_doctor=true if red_flags are detected, risk_level >= MEDIUM, or confidence < 0.80.
- medications list should only be populated if auto_prescribe=true.
- NEVER auto-prescribe for: chest pain, stroke symptoms, high fever (>103 deg F/39.4 deg C for 3+ days), breathing difficulty, severe abdominal pain, pediatric cases under 5, pregnancy-related complaints.
- Keep 'response' human and compassionate - this goes directly to the patient on Telegram."""

    # ─── Highlight card prompt for doctor ────────────────────────────────── #
    HIGHLIGHT_CARD_SYSTEM = """You are a medical summarisation assistant.
Given a patient's complaint, create a concise doctor briefing card as JSON:
{
  "title": "Patient Alert - One line summary",
  "symptoms": ["list", "of", "symptoms"],
  "duration": "how long symptoms have been present",
  "red_flags": ["specific", "red", "flags"],
  "urgency": "IMMEDIATE | URGENT | ROUTINE",
  "suggested_action": "Brief doctor action recommendation",
  "patient_vitals_note": "Any vitals or history mentioned"
}
Be clinical and precise. Doctors read this in 10 seconds."""

    @staticmethod
    async def transcribe_audio(audio_bytes: bytes, filename: str = "voice.ogg") -> Optional[str]:
        """
        Transcribes audio bytes using OpenAI Whisper via OpenRouter.
        Returns the transcribed text or None on failure.
        """
        if not _OR_AVAILABLE:
            print("[!] OpenRouter not configured - transcription unavailable")
            return None

        try:
            # OpenRouter supports audio via base64 in messages
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

            payload = {
                "model": "openai/whisper-large-v3",
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Transcribe the following audio accurately. Return only the transcription text."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:audio/ogg;base64,{audio_b64}"
                            }
                        }
                    ]
                }]
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=_HEADERS,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()

        except Exception as e:
            print(f"[X] Whisper transcription error: {e}")
            return None

    @staticmethod
    async def triage_message(
        conversation_history: str,
        new_message: str,
        patient_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Runs AI triage on a patient message. Returns structured JSON.
        Fallback response on failure so the bot never goes silent.
        """
        if not _OR_AVAILABLE:
            return {
                "response": "Our AI is currently warming up. Please describe your symptoms and a doctor will assist you shortly.",
                "risk_level": "MEDIUM",
                "confidence": 0.0,
                "diagnosis": "AI Unavailable",
                "red_flags": [],
                "medications": [],
                "auto_prescribe": False,
                "escalate_to_doctor": True,
                "escalation_reason": "AI service offline"
            }

        patient_context = ""
        if patient_info:
            patient_context = (
                f"\nPatient profile: Name={patient_info.get('name', 'Unknown')}, "
                f"Age={patient_info.get('age', 'Unknown')}, "
                f"Blood Group={patient_info.get('blood_group', 'Unknown')}, "
                f"Allergies={patient_info.get('allergies', 'None')}, "
                f"Chronic Conditions={patient_info.get('chronic_conditions', 'None')}"
            )

        user_content = (
            f"{patient_context}\n\n"
            f"Previous conversation:\n{conversation_history or 'None'}\n\n"
            f"Patient's message: {new_message}"
        )

        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": OpenRouterService.TRIAGE_SYSTEM + "\nIMPORTANT: Return ONLY raw JSON. No markdown backticks."},
                {"role": "user",   "content": user_content}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=_HEADERS,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                return result

        except json.JSONDecodeError as e:
            print(f"[X] JSON parse error in triage: {e}")
            return {
                "response": "I'm having trouble processing your request. Let me connect you with a doctor.",
                "risk_level": "MEDIUM",
                "confidence": 0.0,
                "diagnosis": "Parse Error",
                "red_flags": [],
                "medications": [],
                "auto_prescribe": False,
                "escalate_to_doctor": True,
                "escalation_reason": "AI response parse failure"
            }
        except Exception as e:
            print(f"[X] OpenRouter triage error: {e}")
            return {
                "response": "I'm experiencing a technical issue. A doctor will be notified to assist you.",
                "risk_level": "HIGH",
                "confidence": 0.0,
                "diagnosis": "Service Error",
                "red_flags": ["system_error"],
                "medications": [],
                "auto_prescribe": False,
                "escalate_to_doctor": True,
                "escalation_reason": f"API error: {str(e)}"
            }

    @staticmethod
    async def generate_highlight_card(
        complaint: str,
        patient_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates a concise doctor Highlight Card from a patient complaint.
        This is sent to the doctor's Telegram when escalation is triggered.
        """
        if not _OR_AVAILABLE:
            return {
                "title": "Patient Alert - Review Required",
                "symptoms": [complaint[:100]],
                "duration": "Unknown",
                "red_flags": ["Manual review needed"],
                "urgency": "URGENT",
                "suggested_action": "Please review patient's complaint",
                "patient_vitals_note": "No vitals recorded"
            }

        patient_context = f"Patient complaint: {complaint}"
        if patient_info:
            patient_context += (
                f"\nAge: {patient_info.get('age', 'N/A')}, "
                f"Allergies: {patient_info.get('allergies', 'None')}, "
                f"Conditions: {patient_info.get('chronic_conditions', 'None')}"
            )

        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": OpenRouterService.HIGHLIGHT_CARD_SYSTEM},
                {"role": "user",   "content": patient_context}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=_HEADERS,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                return json.loads(data["choices"][0]["message"]["content"])
        except Exception as e:
            print(f"[X] Highlight card error: {e}")
            return {
                "title": "Patient Alert - Review Required",
                "symptoms": [complaint[:100]],
                "duration": "Unknown",
                "red_flags": ["AI card generation failed"],
                "urgency": "URGENT",
                "suggested_action": "Please review patient complaint manually",
                "patient_vitals_note": ""
            }

    @staticmethod
    async def generate_preventive_message(patient_name: str, months_since_checkup: int) -> str:
        """
        Generates a warm, personalised preventive care nudge message.
        """
        if not _OR_AVAILABLE:
            return (
                f"Hi {patient_name}! 👋 It's been a while since your last health check-up. "
                "Staying ahead of your health is key! Tap below to book a quick 15-minute slot. 💙"
            )

        prompt = (
            f"Write a warm, friendly Telegram message (max 2 sentences + 1 emoji) "
            f"reminding {patient_name} that it has been {months_since_checkup} months since their last "
            f"health check-up and encouraging them to book a 15-minute slot. "
            f"Do NOT use clinical jargon. Be human and caring."
        )
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=_HEADERS,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"[X] Preventive message error: {e}")
            return (
                f"Hi {patient_name}! 💙 It's been {months_since_checkup} months since your last check-up. "
                "Your health matters - book a quick slot below!"
            )
