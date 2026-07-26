"""
n8n Services - Dignova AI Nervous System
==========================================
All outbound triggers to n8n webhooks live here.
n8n handles: Telegram delivery, email orchestration, Google Calendar, scheduling.
Backend handles: AI logic, database, PDF generation.
"""

import httpx
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()


class N8nService:
    """
    The Nervous System Bridge.
    Thin layer - just posts structured payloads to n8n webhook URLs.
    All AI logic is done BEFORE calling these methods.
    """

    BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678")

    @staticmethod
    async def trigger_workflow(webhook_path: str, payload: Dict[str, Any]) -> bool:
        """Triggers a specific n8n webhook with fail-safe error handling."""
        if not N8nService.BASE_URL or "placeholder" in N8nService.BASE_URL:
            print(f"⏩ n8n Skip: Base URL not configured for {webhook_path}")
            return False

        url = f"{N8nService.BASE_URL}/webhook/{webhook_path}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                print(f"📡 Attempting production webhook: {url}")
                response = await client.post(url, json=payload)
                if response.status_code == 404:
                    print(f"[WARN] Production webhook 404'd. Attempting test webhook...")
                    test_url = f"{N8nService.BASE_URL}/webhook-test/{webhook_path}"
                    print(f"📡 Attempting test webhook: {test_url}")
                    response = await client.post(test_url, json=payload)
                
                print(f"📥 n8n response code: {response.status_code}")
                response.raise_for_status()
                print(f"[OK] n8n trigger OK: {webhook_path}")
                return True
            except httpx.ConnectError:
                print(f"[WARN] n8n Offline: Could not connect to {N8nService.BASE_URL}. Is your tunnel active?")
                return False
            except Exception as e:
                print(f"[WARN] n8n trigger failed ({webhook_path}): {e}")
                return False

    @staticmethod
    async def dispatch(event_type: str, payload: Dict[str, Any]) -> bool:
        """
        The Unified Master Dispatcher.
        Routes all clinical events through a single 'dignova-master-orchestrator' webhook.
        """
        full_payload = {
            "metadata": {
                "event": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "system": "Dignova Sentient OS"
            },
            "data": payload
        }
        return await N8nService.trigger_workflow("dignova-master-orchestrator", full_payload)

    # ── Onboarding ──────────────────────────────────────────────────────── #

    @staticmethod
    async def trigger_onboarding(user_data: Dict[str, Any]) -> bool:
        """
        Fired on new user registration.
        n8n sends: HTML welcome email + Telegram bot greeting (if chat_id known).
        """
        return await N8nService.trigger_workflow("dignova-onboarding", {
            "event":            "user_registered",
            "email":            user_data.get("email"),
            "name":             user_data.get("name"),
            "phone":            user_data.get("phone"),
            "role":             user_data.get("role", "user"),
            "telegram_chat_id": user_data.get("telegram_chat_id"),
            "verify_url":       user_data.get("verify_url", "")
        })

    # ── Prescription Delivery ────────────────────────────────────────────── #

    @staticmethod
    async def send_prescription_alert(
        patient_data: Dict[str, Any],
        pdf_url: str,
        diagnosis: str = None,
        is_auto: bool = False
    ) -> bool:
        """
        Triggers prescription delivery workflow.
        n8n sends: Telegram document (PDF) + email receipt.
        """
        return await N8nService.trigger_workflow("dignova-prescription", {
            "event":            "prescription_finalized",
            "patient_name":     patient_data.get("name"),
            "patient_email":    patient_data.get("email"),
            "telegram_chat_id": patient_data.get("telegram_chat_id"),
            "phone":            patient_data.get("phone"),
            "pdf_url":          pdf_url,
            "doctor_name":      patient_data.get("doctor_name", "Dignova AI"),
            "diagnosis":        diagnosis or "General Prescription",
            "is_auto_generated": is_auto
        })

    # ── Doctor Escalation ────────────────────────────────────────────────── #

    @staticmethod
    async def trigger_doctor_escalation(
        patient_data: Dict[str, Any],
        highlight_card: Dict[str, Any],
        call_id: int,
        doctor_telegram_chat_id: Optional[str] = None
    ) -> bool:
        """
        Fires when AI detects red flags.
        n8n sends the Highlight Card to doctor's Telegram with Approve/Modify inline buttons.
        The callback_data will carry call_id so doctor's response routes back correctly.
        """
        if isinstance(highlight_card, list) and len(highlight_card) > 0:
            highlight_card = highlight_card[0]
        elif not isinstance(highlight_card, dict):
            highlight_card = {}

        return await N8nService.trigger_workflow("dignova-escalate", {
            "event":                   "doctor_escalation",
            "call_id":                 call_id,
            "patient_name":            patient_data.get("name"),
            "patient_email":           patient_data.get("email"),
            "patient_telegram_chat_id":patient_data.get("telegram_chat_id"),
            "doctor_telegram_chat_id": doctor_telegram_chat_id,  # n8n sends to this chat
            "highlight_title":         highlight_card.get("title", "Patient Alert"),
            "symptoms":                highlight_card.get("symptoms", []),
            "red_flags":               highlight_card.get("red_flags", []),
            "urgency":                 highlight_card.get("urgency", "URGENT"),
            "suggested_action":        highlight_card.get("suggested_action", "Manual Review"),
            "patient_vitals_note":     highlight_card.get("patient_vitals_note", ""),
            # n8n builds inline keyboard with callback_data containing call_id
            "approve_callback":        f"approve_{call_id}",
            "modify_callback":         f"modify_{call_id}"
        })

    # ── Aftercare Pings ──────────────────────────────────────────────────── #

    @staticmethod
    async def trigger_aftercare_ping(
        patient_data: Dict[str, Any],
        prescription_id: int,
        medication_summary: str
    ) -> bool:
        """
        Sends day-3 aftercare message with inline Yes/No buttons.
        n8n delivers via Telegram and waits for inline button callback.
        """
        return await N8nService.trigger_workflow("dignova-aftercare", {
            "event":            "aftercare_ping",
            "prescription_id":  prescription_id,
            "patient_name":     patient_data.get("name"),
            "telegram_chat_id": patient_data.get("telegram_chat_id"),
            "medication_summary": medication_summary,
            "yes_callback":     f"aftercare_yes_{prescription_id}",
            "no_callback":      f"aftercare_no_{prescription_id}"
        })

    # ── Calendar / Appointment ───────────────────────────────────────────── #

    @staticmethod
    async def trigger_calendar_reminder(
        patient_data: Dict[str, Any],
        appointment_id: int,
        slot_time: str,
        doctor_name: str
    ) -> bool:
        """
        Sends 24-hour appointment reminder with Confirm/Reschedule buttons.
        """
        return await N8nService.trigger_workflow("dignova-calendar", {
            "event":            "appointment_reminder",
            "appointment_id":   appointment_id,
            "patient_name":     patient_data.get("name"),
            "telegram_chat_id": patient_data.get("telegram_chat_id"),
            "patient_email":    patient_data.get("email"),
            "slot_time":        slot_time,
            "doctor_name":      doctor_name,
            "confirm_callback": f"cal_confirm_{appointment_id}",
            "reschedule_callback": f"cal_reschedule_{appointment_id}"
        })

    # ── Geofence Check-in Alert ──────────────────────────────────────────── #

    @staticmethod
    async def trigger_patient_arriving(
        patient_data: Dict[str, Any],
        doctor_data: Dict[str, Any],
        distance_meters: float
    ) -> bool:
        """
        Fires when patient enters the 500m hospital geofence.
        n8n: confirms to patient + alerts doctor that patient is arriving.
        """
        return await N8nService.trigger_workflow("dignova-geofence", {
            "event":                   "patient_arriving",
            "patient_name":            patient_data.get("name"),
            "patient_telegram_chat_id":patient_data.get("telegram_chat_id"),
            "doctor_name":             doctor_data.get("name"),
            "doctor_telegram_chat_id": doctor_data.get("telegram_chat_id"),
            "distance_meters":         round(distance_meters),
            "estimated_minutes":       max(1, round(distance_meters / 80))  # ~80m/min walking
        })

    # ── Preventive Care ──────────────────────────────────────────────────── #

    @staticmethod
    async def trigger_preventive_nudge(
        patient_data: Dict[str, Any],
        message: str,
        months_overdue: int
    ) -> bool:
        """
        Proactive preventive care message.
        n8n sends Telegram message with a [Book Now] button.
        """
        return await N8nService.trigger_workflow("dignova-preventive", {
            "event":            "preventive_nudge",
            "patient_name":     patient_data.get("name"),
            "patient_email":    patient_data.get("email"),
            "telegram_chat_id": patient_data.get("telegram_chat_id"),
            "message":          message,
            "months_overdue":   months_overdue,
            "book_callback":    f"book_checkup_{patient_data.get('id')}"
        })

    # ── Neural Training ─────────────────────────────────────────────────── #

    @staticmethod
    async def trigger_training_result(
        intern_data: Dict[str, Any],
        score: int,
        feedback: str,
        missed_red_flags: List[str]
    ) -> bool:
        """
        Fired when an intern simulation is evaluated.
        n8n sends a stylized performance dossier to the intern's Telegram.
        """
        return await N8nService.trigger_workflow("dignova-training-result", {
            "event":            "training_evaluated",
            "telegram_chat_id": intern_data.get("telegram_chat_id"),
            "intern_name":      intern_data.get("name"),
            "score":            score,
            "feedback":         feedback,
            "missed_red_flags": missed_red_flags
        })

    # ── IoT Pill Reminder (legacy, kept for compatibility) ───────────────── #

    @staticmethod
    async def trigger_pill_reminder(patient_name: str, medication: str) -> bool:
        return await N8nService.trigger_workflow("dignova-iot-pill", {
            "event":          "pill_reminder",
            "device_command": "flash_led",
            "patient_name":   patient_name,
            "medication":     medication
        })
