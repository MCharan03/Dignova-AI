"""
Bot Webhooks — Dignova AI
==========================
All n8n → Backend webhook receivers.
n8n handles Telegram delivery; Backend handles all logic.

Endpoints:
  POST /api/n8n/webhook/register-telegram   — Link Telegram chat_id to user
  POST /api/n8n/webhook/triage              — Text message triage  
  POST /api/n8n/webhook/voice               — Audio → Whisper → AI → auto-rx or escalate
  POST /api/n8n/webhook/doctor-approval     — Doctor approve/modify via Telegram button
  POST /api/n8n/webhook/aftercare-response  — Patient day-3 inline button (Yes/No)
  POST /api/n8n/webhook/geofence-checkin    — Live location → 500m hospital check-in
  POST /api/n8n/webhook/calendar-action     — Appointment confirm/reschedule
  POST /api/n8n/webhook/preventive-check    — Cron: find overdue patients for nudging
"""

import os
import json
import math
import tempfile
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from ..extensions import get_db, AsyncSessionLocal
from .. import models as domain
from ..services.openrouter_service import OpenRouterService
from ..services.gemini_service import GeminiService
from ..services.n8n_services import N8nService
from ..utils.pdf_generator import generate_prescription_pdf
from ..utils.email_utils import send_diagnosis_receipt, send_appointment_reminder
from ..utils.geofencing import GeofencingService

router = APIRouter(prefix="/api/n8n/webhook", tags=["Bot Webhooks"])

# ─── Schemas ───────────────────────────────────────────────────────────────── #

class RegisterTelegramRequest(BaseModel):
    telegram_chat_id: str
    telegram_username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    sync_token: Optional[str] = None

class BotMessageRequest(BaseModel):
    session_id: str          # telegram_chat_id
    message: str
    source: str              # "Telegram" | "WhatsApp"
    metadata: Optional[Dict[str, Any]] = None

class DoctorApprovalRequest(BaseModel):
    call_id: int
    action: str              # "approve" | "modify"
    doctor_telegram_chat_id: str
    modified_medications: Optional[List[Dict[str, Any]]] = None  # only for "modify"
    notes: Optional[str] = None

class AftercareResponseRequest(BaseModel):
    prescription_id: int
    patient_telegram_chat_id: str
    response: str            # "yes_better" | "no_still_sick"

class GeofenceCheckinRequest(BaseModel):
    telegram_chat_id: str
    latitude: float
    longitude: float

class CalendarActionRequest(BaseModel):
    appointment_id: int
    patient_telegram_chat_id: str
    action: str              # "confirm" | "reschedule"
    new_slot_time: Optional[str] = None  # ISO string, only for reschedule

class PreventiveCheckRequest(BaseModel):
    mode: str = "annual"     # "annual" | "blood_test"


# ─── Helpers ───────────────────────────────────────────────────────────────── #

BACKEND_URL = os.getenv("BACKEND_URL", "https://dignova-ai-1.onrender.com")

def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two GPS coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

async def _get_or_create_session(telegram_chat_id: str, db: AsyncSession) -> domain.TelegramSession:
    """Gets or creates a TelegramSession for a given chat_id."""
    stmt = select(domain.TelegramSession).where(
        domain.TelegramSession.telegram_chat_id == telegram_chat_id
    )
    session = await db.scalar(stmt)
    if not session:
        session = domain.TelegramSession(
            telegram_chat_id=telegram_chat_id,
            state="idle",
            last_interaction=datetime.utcnow()
        )
        db.add(session)
        await db.flush()
    return session

async def _resolve_user_by_chat(telegram_chat_id: str, db: AsyncSession) -> Optional[domain.User]:
    """Finds a User linked to a Telegram chat_id."""
    stmt = select(domain.User).where(domain.User.telegram_chat_id == telegram_chat_id)
    return await db.scalar(stmt)

async def _finalize_prescription_background(
    call_id: int,
    patient_id: int,
    doctor_id: Optional[int],
    medications: List[Dict],
    diagnosis: str,
    is_auto: bool,
    notes: str = None
):
    """
    Background task: saves prescription, generates PDF, sends email + n8n trigger.
    Runs async so the webhook can respond instantly to n8n (< 1 second).
    """
    async with AsyncSessionLocal() as db:
        # 1. Fetch patient
        patient = await db.scalar(select(domain.User).where(domain.User.id == patient_id))
        if not patient:
            return

        # 2. Fetch doctor (may be None for auto-prescriptions)
        doctor = None
        if doctor_id:
            doctor = await db.scalar(select(domain.User).where(domain.User.id == doctor_id))

        # 3. Generate PDF
        pdf_filename = f"prescription_{call_id}_{int(datetime.utcnow().timestamp())}.pdf"
        pdf_dir = os.path.join("app", "static", "prescriptions")
        os.makedirs(pdf_dir, exist_ok=True)
        pdf_path = os.path.join(pdf_dir, pdf_filename)
        pdf_url  = f"{BACKEND_URL}/static/prescriptions/{pdf_filename}"

        generate_prescription_pdf(
            patient_name=patient.name,
            age=patient.age or 0,
            medications=medications,
            doctor_name=doctor.name if doctor else "Dignova AI",
            file_path=pdf_path,
            diagnosis=diagnosis,
            notes=notes,
            blood_group=patient.blood_group,
            prescription_id=f"RX-{call_id}"
        )

        # 4. Save Prescription to DB
        rx = domain.Prescription(
            call_id=call_id,
            patient_id=patient.id,
            doctor_id=doctor.id if doctor else None,
            medications=medications,
            pdf_path=pdf_path,
            diagnosis=diagnosis,
            notes=notes,
            is_auto_generated=is_auto,
            approved_by_doctor=True if is_auto else None
        )
        db.add(rx)

        # 5. Update call state
        call_stmt = select(domain.Call).where(domain.Call.call_id == call_id)
        db_call = await db.scalar(call_stmt)
        if db_call:
            db_call.state = "completed"
            db_call.end_time = datetime.utcnow()
            db_call.diagnosis_given = diagnosis

        await db.commit()
        await db.refresh(rx)

        # 6. Schedule aftercare ping (day 3)
        aftercare = domain.AftercarePing(
            prescription_id=rx.id,
            patient_id=patient.id,
            scheduled_for=datetime.utcnow() + timedelta(days=3)
        )
        db.add(aftercare)
        await db.commit()

        # 7. Send email receipt
        if patient.email:
            send_diagnosis_receipt(
                to=patient.email,
                patient_name=patient.name,
                diagnosis=diagnosis,
                medications=medications,
                doctor_name=doctor.name if doctor else "Dignova AI",
                pdf_url=pdf_url,
                call_id=call_id,
                is_auto=is_auto
            )

        # 8. Trigger n8n for Telegram PDF delivery
        patient_data = {
            "name":             patient.name,
            "email":            patient.email,
            "telegram_chat_id": patient.telegram_chat_id,
            "phone":            patient.phone_number,
            "doctor_name":      doctor.name if doctor else "Dignova AI"
        }
        await N8nService.send_prescription_alert(patient_data, pdf_url, diagnosis, is_auto)


# ─── Endpoint 1: Register Telegram ────────────────────────────────────────── #

@router.post("/register-telegram")
async def register_telegram(
    request: RegisterTelegramRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Links a Telegram chat_id to an existing Dignova user.
    """
    user = None
    from ..utils.auth_utils import confirm_sync_token

    # 1. Try Sync Token lookup (One-Click)
    if request.sync_token:
        user_id = confirm_sync_token(request.sync_token)
        if user_id:
            user = await db.scalar(select(domain.User).where(domain.User.id == user_id))

    # 2. Try email lookup
    if not user and request.email:
        user = await db.scalar(
            select(domain.User).where(domain.User.email == request.email)
        )

    # 3. Try phone lookup
    if not user and request.phone:
        user = await db.scalar(
            select(domain.User).where(domain.User.phone_number == request.phone)
        )

    if user:
        user.telegram_chat_id  = request.telegram_chat_id
        user.telegram_username = request.telegram_username

    # Create / update TelegramSession
    session = await _get_or_create_session(request.telegram_chat_id, db)
    if user:
        session.user_id = user.id

    await db.commit()

    if user:
        return {
            "status":  "linked",
            "user_id": user.id,
            "name":    user.name,
            "message": f"Welcome back, {user.name}! Your Telegram is now linked to Dignova AI. 🎉"
        }
    else:
        return {
            "status":  "guest",
            "message": "You're connected as a guest. Register at dignova.ai to link your account."
        }


# ─── Endpoint 2: Text Triage ──────────────────────────────────────────────── #

@router.post("/triage")
async def bot_triage_webhook(
    request: BotMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Main text-message triage endpoint.
    """
    try:
        telegram_chat_id = request.session_id
        tg_session = await _get_or_create_session(telegram_chat_id, db)
        user = await _resolve_user_by_chat(telegram_chat_id, db)

        # Get or start an active call
        db_call = None
        if tg_session.active_call_id:
            db_call = await db.scalar(
                select(domain.Call).where(
                    domain.Call.call_id == tg_session.active_call_id,
                    domain.Call.state == "active"
                )
            )

        if not db_call:
            db_call = domain.Call(
                user_id=user.id if user else None,
                call_type=domain.CallType.triage,
                state="active",
                source="telegram",
                transcript=f"[BOT SESSION via {request.source}]\n",
                organization_id=user.organization_id if user else None
            )
            db.add(db_call)
            await db.flush()
            tg_session.active_call_id = db_call.call_id
            tg_session.state = "triage"

        # Build patient info dict for AI context
        patient_info = None
        if user:
            patient_info = {
                "name": user.name, "age": user.age, "blood_group": user.blood_group,
                "allergies": user.allergies, "chronic_conditions": user.chronic_conditions
            }

        # Run AI triage (async — awaited here)
        from ..services.openrouter_service import OpenRouterService
        ai_result = await OpenRouterService.triage_message(
            conversation_history=db_call.transcript or "",
            new_message=request.message,
            patient_info=patient_info
        )

        print(f"🤖 AI Triage Result for {telegram_chat_id}:")
        print(json.dumps(ai_result, indent=2))

        # Update transcript
        speaker = f"USER ({request.source})"
        ai_msg = ai_result.get('response','')
        if not ai_msg:
             ai_msg = "I've noted your symptoms. Let me analyze this further."

        db_call.transcript = (db_call.transcript or "") + (
            f"{speaker}: {request.message}\nASSISTANT: {ai_msg}\n"
        )

        # Store AI context on session
        tg_session.context_json = {
            "risk_level":    ai_result.get("risk_level"),
            "diagnosis":     ai_result.get("diagnosis"),
            "confidence":    ai_result.get("confidence"),
            "red_flags":     ai_result.get("red_flags"),
            "medications":   ai_result.get("medications"),
            "last_message":  request.message
        }
        tg_session.last_interaction = datetime.utcnow()
        db_call.severity = ai_result.get("risk_level", "UNKNOWN")

        auto_prescription_triggered = False
        escalation_triggered = False

        if ai_result.get("auto_prescribe") and user:
            # ── Zero-Touch Auto-Prescription ──────────────────────────────────── #
            tg_session.state = "completed"
            db_call.state = "evaluation"
            auto_prescription_triggered = True

            # Find on-duty doctor for attribution (Org Scoped or Global Fallback)
            stmt = select(domain.User).where(
                domain.User.role == domain.UserRole.doctor,
                domain.User.is_online == True
            )
            if db_call.organization_id:
                stmt = stmt.where(domain.User.organization_id == db_call.organization_id)
            
            doctor = await db.scalar(stmt)

            background_tasks.add_task(
                _finalize_prescription_background,
                db_call.call_id,
                user.id,
                doctor.id if doctor else None,
                ai_result.get("medications", []),
                ai_result.get("diagnosis", "General"),
                True  # is_auto
            )

        elif ai_result.get("escalate_to_doctor") and user:
            # ── Doctor Escalation ─────────────────────────────────────────────── #
            tg_session.state = "awaiting_doctor"
            db_call.severity = "ELEVATED"

            highlight_card = await OpenRouterService.generate_highlight_card(
                complaint=request.message, patient_info=patient_info
            )

            # Find ALL on-duty doctors (Org Scoped or Global Fallback)
            stmt = select(domain.User).where(
                domain.User.role == domain.UserRole.doctor,
                domain.User.is_online == True
            )
            if db_call.organization_id:
                stmt = stmt.where(domain.User.organization_id == db_call.organization_id)
            
            doctors = await db.scalars(stmt)
            doctors_list = doctors.all()

            if doctors_list:
                db_call.forwarded_to_doctor_id = doctors_list[0].id # Assign to first one for DB record
                escalation_triggered = True
                patient_data = {
                    "name":             user.name,
                    "email":            user.email,
                    "telegram_chat_id": user.telegram_chat_id,
                }
                
                # Notify EVERY online doctor
                for doc in doctors_list:
                    print(f"📣 Notifying Doctor: {doc.name} ({doc.telegram_chat_id})")
                    background_tasks.add_task(
                        N8nService.trigger_doctor_escalation,
                        patient_data,
                        highlight_card,
                        db_call.call_id,
                        doc.telegram_chat_id
                    )

        await db.commit()

        return {
            "response":                   ai_msg,
            "call_id":                    db_call.call_id,
            "risk_level":                 ai_result.get("risk_level"),
            "auto_prescription_triggered":auto_prescription_triggered,
            "escalation_triggered":       escalation_triggered,
            "escalation_reason":          ai_result.get("escalation_reason", ""),
            "source":                     request.source
        }
    except Exception as e:
        print(f"❌ CRITICAL ERROR in bot_triage_webhook: {e}")
        import traceback
        traceback.print_exc()
        return {
            "response": "I'm having a bit of trouble processing that. Could you please re-describe your symptoms?",
            "call_id": 0,
            "risk_level": "UNKNOWN",
            "auto_prescription_triggered": False,
            "escalation_triggered": False,
            "error": str(e)
        }


# ─── Endpoint 3: Voice Note → Whisper → AI ────────────────────────────────── #

@router.post("/voice")
async def voice_triage_webhook(
    background_tasks: BackgroundTasks,
    telegram_chat_id: str = Form(...),
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives an audio file from n8n (Telegram voice note).
    Transcribes via Whisper, then runs full AI triage pipeline.
    n8n receives a response within ~3 seconds.
    """
    audio_bytes = await audio.read()
    tg_session  = await _get_or_create_session(telegram_chat_id, db)
    user        = await _resolve_user_by_chat(telegram_chat_id, db)

    # 1. Transcribe
    transcript_text = await OpenRouterService.transcribe_audio(audio_bytes, audio.filename)
    if not transcript_text:
        return {
            "response": "I couldn't understand the voice message. Could you type your symptoms instead?",
            "transcribed": "",
            "auto_prescription_triggered": False,
            "escalation_triggered": False
        }

    # 2. Get or create active call
    db_call = None
    if tg_session.active_call_id:
        db_call = await db.scalar(
            select(domain.Call).where(
                domain.Call.call_id == tg_session.active_call_id,
                domain.Call.state == "active"
            )
        )

    if not db_call:
        db_call = domain.Call(
            user_id=user.id if user else None,
            call_type=domain.CallType.triage,
            state="active",
            source="telegram",
            transcript=f"[VOICE BOT SESSION]\n"
        )
        db.add(db_call)
        await db.flush()
        tg_session.active_call_id = db_call.call_id

    # 3. Run AI triage on the transcription
    patient_info = None
    if user:
        patient_info = {
            "name": user.name, "age": user.age, "blood_group": user.blood_group,
            "allergies": user.allergies, "chronic_conditions": user.chronic_conditions
        }

    ai_result = await OpenRouterService.triage_message(
        conversation_history=db_call.transcript or "",
        new_message=transcript_text,
        patient_info=patient_info
    )

    # 4. Update transcript with transcription + AI response
    db_call.transcript += f"USER (voice): {transcript_text}\nASSISTANT: {ai_result.get('response','')}\n"
    db_call.severity = ai_result.get("risk_level", "UNKNOWN")
    tg_session.last_interaction = datetime.utcnow()
    tg_session.context_json = {
        "risk_level":  ai_result.get("risk_level"),
        "diagnosis":   ai_result.get("diagnosis"),
        "confidence":  ai_result.get("confidence"),
        "medications": ai_result.get("medications"),
        "red_flags":   ai_result.get("red_flags")
    }

    auto_prescription_triggered = False
    escalation_triggered = False

    if ai_result.get("auto_prescribe") and user:
        tg_session.state = "completed"
        db_call.state = "evaluation"
        auto_prescription_triggered = True
        doctor = await db.scalar(
            select(domain.User).where(
                domain.User.role == domain.UserRole.doctor,
                domain.User.is_online == True,
                domain.User.organization_id == db_call.organization_id
            )
        )
        background_tasks.add_task(
            _finalize_prescription_background,
            db_call.call_id, user.id,
            doctor.id if doctor else None,
            ai_result.get("medications", []),
            ai_result.get("diagnosis", "General"),
            True
        )

    elif ai_result.get("escalate_to_doctor") and user:
        tg_session.state = "awaiting_doctor"
        db_call.severity = "ELEVATED"
        escalation_triggered = True
        highlight_card = await OpenRouterService.generate_highlight_card(
            complaint=transcript_text, patient_info=patient_info
        )
        # Find on-duty doctor (Org Scoped)
        doctor = await db.scalar(
            select(domain.User).where(
                domain.User.role == domain.UserRole.doctor,
                domain.User.is_online == True,
                domain.User.organization_id == db_call.organization_id
            )
        )

        if doctor:
            db_call.forwarded_to_doctor_id = doctor.id
            background_tasks.add_task(
                N8nService.trigger_doctor_escalation,
                {"name": user.name, "email": user.email, "telegram_chat_id": user.telegram_chat_id},
                highlight_card,
                db_call.call_id,
                doctor.telegram_chat_id
            )

    await db.commit()

    return {
        "response":                    ai_result.get("response"),
        "transcribed":                 transcript_text,
        "call_id":                     db_call.call_id,
        "risk_level":                  ai_result.get("risk_level"),
        "auto_prescription_triggered": auto_prescription_triggered,
        "escalation_triggered":        escalation_triggered,
        "escalation_reason":           ai_result.get("escalation_reason", ""),
        "source":                      "Telegram Voice"
    }


# ─── Endpoint 4: Doctor Approval ──────────────────────────────────────────── #

@router.post("/doctor-approval")
async def doctor_approval_webhook(
    request: DoctorApprovalRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives doctor's Approve/Modify response from Telegram inline button.
    If approved → finalises prescription using original or modified meds.
    If rejected → marks call for manual follow-up.
    """
    # Find the doctor by their telegram_chat_id
    doctor = await db.scalar(
        select(domain.User).where(
            domain.User.telegram_chat_id == request.doctor_telegram_chat_id
        )
    )
    if not doctor or doctor.role not in [domain.UserRole.doctor, domain.UserRole.super_admin, domain.UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Unauthorized: not a registered doctor")

    # Fetch the call
    db_call = await db.scalar(
        select(domain.Call).where(domain.Call.call_id == request.call_id)
    )
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")

    # Get patient
    patient = await db.scalar(
        select(domain.User).where(domain.User.id == db_call.user_id)
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if request.action == "approve":
        # Get medications from the pending TelegramSession context
        tg_session_stmt = select(domain.TelegramSession).where(
            domain.TelegramSession.user_id == patient.id
        )
        tg_session = await db.scalar(tg_session_stmt)
        context = tg_session.context_json if tg_session else {}
        medications = request.modified_medications or context.get("medications", [])
        diagnosis   = context.get("diagnosis", "Doctor Reviewed")

        tg_session.state = "completed" if tg_session else None
        await db.commit()

        background_tasks.add_task(
            _finalize_prescription_background,
            db_call.call_id,
            patient.id,
            doctor.id,
            medications,
            diagnosis,
            False,  # not auto
            request.notes
        )

        return {
            "status":  "approved",
            "message": f"Prescription approved by Dr. {doctor.name}. Sending to patient now."
        }

    elif request.action == "modify":
        if not request.modified_medications:
            raise HTTPException(status_code=400, detail="modified_medications required for modify action")

        tg_session = await db.scalar(
            select(domain.TelegramSession).where(domain.TelegramSession.user_id == patient.id)
        )
        diagnosis = tg_session.context_json.get("diagnosis", "Doctor Modified") if tg_session else "Modified"
        await db.commit()

        background_tasks.add_task(
            _finalize_prescription_background,
            db_call.call_id,
            patient.id,
            doctor.id,
            request.modified_medications,
            diagnosis,
            False,
            request.notes
        )

        return {
            "status":  "modified",
            "message": f"Modified prescription approved by Dr. {doctor.name}. Sending to patient."
        }

    else:
        # Doctor rejected — mark for manual follow-up
        db_call.state = "evaluation"
        db_call.severity = "ELEVATED"
        await db.commit()
        return {
            "status":  "rejected",
            "message": "Prescription rejected. Patient will be notified to contact clinic."
        }


# ─── Endpoint 5: Aftercare Response ──────────────────────────────────────────#

@router.post("/aftercare-response")
async def aftercare_response_webhook(
    request: AftercareResponseRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives patient's Day-3 inline button response (Yes / No).
    If No → flags doctor for follow-up.
    """
    is_better = "better" in request.response or "yes" in request.response
    
    # 1. Update AftercarePing if prescription_id exists
    if request.prescription_id:
        ping_stmt = select(domain.AftercarePing).where(
            domain.AftercarePing.prescription_id == request.prescription_id
        )
        ping = await db.scalar(ping_stmt)
        if ping:
            ping.patient_response = request.response
            ping.responded_at = datetime.utcnow()
            if not is_better:
                ping.doctor_flagged = True

    # 2. Update the latest Call for this user
    user = await _resolve_user_by_chat(request.patient_telegram_chat_id, db)
    if user:
        stmt = select(domain.Call).where(
            domain.Call.user_id == user.id
        ).order_by(domain.Call.start_time.desc()).limit(1)
        
        last_call = await db.scalar(stmt)
        if last_call:
            last_call.is_recovered = is_better
            await db.commit()

    if is_better:
        return {"status": "ok", "message": "Wonderful news! Glad you're feeling better! Stay healthy. 💙"}
    else:
        # Find online doctors for escalation
        doc_stmt = select(domain.User).where(
            domain.User.role == domain.UserRole.doctor,
            domain.User.is_online == True
        )
        doctors = await db.scalars(doc_stmt)
        online_docs = doctors.all()
        
        if online_docs:
            for doc in online_docs:
                background_tasks.add_task(
                    N8nService.trigger_workflow,
                    "dignova-escalate",
                    {
                        "event": "sick_patient_alert",
                        "patient_name": user.name if user else "Patient",
                        "doctor_telegram_chat_id": doc.telegram_chat_id,
                        "highlight_title": "Aftercare Alert: Patient Not Recovering",
                        "symptoms": ["Patient reported 'Still Sick' during 3-day follow-up."],
                        "urgency": "ELEVATED",
                        "suggested_action": "Urgent Medical Review"
                    }
                )

        return {"status": "flagged", "message": "Clinical team notified. Someone will follow up soon."}


# ─── Endpoint 6: Geofence Check-in ───────────────────────────────────────── #

@router.post("/geofence-checkin")
async def geofence_checkin_webhook(
    request: GeofenceCheckinRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives live location from n8n when a patient shares location on Telegram.
    If within 500m of hospital, auto-checks patient in and alerts doctor.
    """
    HOSPITAL_LAT, HOSPITAL_LON = GeofencingService.HOSPITAL_COORDS
    RADIUS_METERS = 500

    distance = _haversine_meters(
        request.latitude, request.longitude, HOSPITAL_LAT, HOSPITAL_LON
    )

    if distance > RADIUS_METERS:
        return {
            "status":   "too_far",
            "distance": round(distance),
            "message":  f"You are {round(distance)}m from the hospital. Check-in activates within 500m."
        }

    # Patient is within range — check them in
    user = await _resolve_user_by_chat(request.telegram_chat_id, db)

    # Find their most recent appointment
    appointment = None
    if user:
        apt_stmt = select(domain.AppointmentSlot).where(
            domain.AppointmentSlot.patient_id == user.id,
            domain.AppointmentSlot.status == "confirmed"
        ).order_by(domain.AppointmentSlot.slot_time.desc())
        appointment = await db.scalar(apt_stmt)

    patient_data = {
        "name":             user.name if user else "Guest",
        "telegram_chat_id": request.telegram_chat_id,
        "email":            user.email if user else None,
    }

    doctor_data = {"name": "your doctor", "telegram_chat_id": None}
    if appointment and appointment.doctor_id:
        doctor = await db.scalar(
            select(domain.User).where(domain.User.id == appointment.doctor_id)
        )
        if doctor:
            doctor_data = {"name": doctor.name, "telegram_chat_id": doctor.telegram_chat_id}

    background_tasks.add_task(
        N8nService.trigger_patient_arriving,
        patient_data,
        doctor_data,
        distance
    )

    return {
        "status":   "checked_in",
        "distance": round(distance),
        "message":  f"✅ You're {round(distance)}m away. You've been automatically checked in! Dr. {doctor_data['name']} has been notified of your arrival."
    }


# ─── Endpoint 7: Calendar Action ─────────────────────────────────────────── #

@router.post("/calendar-action")
async def calendar_action_webhook(
    request: CalendarActionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives Telegram inline button: Confirm or Reschedule appointment.
    Updates DB and triggers n8n for Google Calendar sync.
    """
    apt_stmt = select(domain.AppointmentSlot).where(
        domain.AppointmentSlot.id == request.appointment_id
    )
    appointment = await db.scalar(apt_stmt)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = await db.scalar(
        select(domain.User).where(domain.User.id == appointment.patient_id)
    )
    doctor = await db.scalar(
        select(domain.User).where(domain.User.id == appointment.doctor_id)
    ) if appointment.doctor_id else None

    if request.action == "confirm":
        appointment.status = "confirmed"
        await db.commit()

        # Send email confirmation
        if patient:
            send_appointment_reminder(
                to=patient.email,
                patient_name=patient.name,
                slot_time=appointment.slot_time.strftime("%A, %d %B %Y at %I:%M %p"),
                doctor_name=doctor.name if doctor else "Dignova AI",
                appointment_id=appointment.id
            )

        return {
            "status":  "confirmed",
            "message": f"Appointment confirmed ✅ See you on {appointment.slot_time.strftime('%d %B at %I:%M %p')}!"
        }

    elif request.action == "reschedule":
        appointment.status = "rescheduled"
        await db.commit()

        # Trigger n8n to show available slots to patient
        background_tasks.add_task(
            N8nService.trigger_workflow,
            "dignova-reschedule",
            {
                "event":            "reschedule_requested",
                "appointment_id":   appointment.id,
                "patient_name":     patient.name if patient else "Guest",
                "telegram_chat_id": request.patient_telegram_chat_id,
                "doctor_name":      doctor.name if doctor else "Dignova AI",
                "doctor_id":        appointment.doctor_id
            }
        )

        return {
            "status":  "rescheduling",
            "message": "No problem! I'll show you available slots. 📅"
        }

    raise HTTPException(status_code=400, detail="Invalid action")


# ─── Endpoint 8: Preventive Check (Cron Trigger) ─────────────────────────── #

@router.post("/preventive-check")
async def preventive_check_webhook(
    request: PreventiveCheckRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Called by n8n's daily cron job (6:00 AM).
    Finds patients overdue for check-ups and triggers personalised nudges.
    Returns a count of nudges fired.
    """
    now = datetime.utcnow()
    nudge_count = 0
    results = []

    # Query users who have a telegram_chat_id (bot users)
    users_stmt = select(domain.User).where(
        domain.User.role == domain.UserRole.user,
        domain.User.telegram_chat_id != None
    )
    users_result = await db.execute(users_stmt)
    all_users = users_result.scalars().all()

    for user in all_users:
        months_since = None
        overdue_type = None

        if request.mode == "annual" or request.mode == "both":
            if user.last_checkup_date is None:
                months_since = 24  # Never had a checkup → very overdue
                overdue_type = "annual"
            else:
                delta = now - user.last_checkup_date
                months = delta.days / 30.44
                if months >= 12:
                    months_since = round(months)
                    overdue_type = "annual"

        if (request.mode == "blood_test" or request.mode == "both") and not overdue_type:
            age = user.age or 0
            if age >= 40:  # Blood test every 6 months for 40+
                if user.last_blood_test_date is None:
                    months_since = 12
                    overdue_type = "blood_test"
                else:
                    delta = now - user.last_blood_test_date
                    months = delta.days / 30.44
                    if months >= 6:
                        months_since = round(months)
                        overdue_type = "blood_test"

        if months_since is not None and overdue_type:
            # Generate personalised AI message
            message = await OpenRouterService.generate_preventive_message(
                user.name, months_since
            )

            patient_data = {
                "id":               user.id,
                "name":             user.name,
                "email":            user.email,
                "telegram_chat_id": user.telegram_chat_id,
            }
            background_tasks.add_task(
                N8nService.trigger_preventive_nudge,
                patient_data,
                message,
                months_since
            )

            results.append({
                "user_id":     user.id,
                "name":        user.name,
                "overdue_type":overdue_type,
                "months_since":months_since
            })
            nudge_count += 1

    return {
        "status":      "complete",
        "nudges_sent": nudge_count,
        "patients":    results
    }
