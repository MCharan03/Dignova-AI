"""
twilio_routes.py - Dignova AI Call Bot Controller
Full Twilio Voice integration: inbound bot, outbound escalation, status callbacks.
"""
import os
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
from twilio.twiml.voice_response import VoiceResponse, Connect, Say
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/twilio", tags=["Twilio Voice Bot"])

BACKEND_URL    = os.getenv("BACKEND_URL", "https://dignova-ai.onrender.com").rstrip('/')
BACKEND_URL_WS = os.getenv("BACKEND_URL_WS", "wss://dignova-ai.onrender.com").rstrip('/')
ACCOUNT_SID    = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN     = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_NUMBER  = os.getenv("TWILIO_PHONE_NUMBER", "")


def _twilio_client() -> Client:
    if not ACCOUNT_SID or not AUTH_TOKEN:
        raise HTTPException(status_code=503, detail="Twilio credentials not configured")
    return Client(ACCOUNT_SID, AUTH_TOKEN)


def _time_greeting() -> str:
    hour = datetime.utcnow().hour + 5  # IST offset
    if hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    return "Good evening"


# ── Inbound call webhook ────────────────────────────────────────────────────

@router.api_route("/incoming", methods=["GET", "POST"])
async def handle_incoming_call(request: Request):
    """
    Twilio webhook for inbound calls.
    Extracts caller phone number (From), links to registered user dynamically,
    and connects caller to Dr. Dignova.
    """
    if request.method == "POST":
        form = await request.form()
        call_sid = form.get("CallSid", "unknown")
        from_number = form.get("From")
    else:
        call_sid = request.query_params.get("CallSid", "unknown")
        from_number = request.query_params.get("From")

    # Log to DB asynchronously with caller phone matching
    import asyncio
    asyncio.create_task(_log_inbound_call(call_sid, from_number))

    greeting = _time_greeting()
    response = VoiceResponse()
    response.say(
        f"{greeting}. You've reached Dignova AI. I'm your autonomous medical assistant. "
        "Please hold for just a moment while I connect.",
        voice="Polly.Joanna",
        language="en-US",
    )

    connect = Connect()
    connect.stream(
        url=f"{BACKEND_URL_WS}/ws/twilio-media",
        track="inbound_track",
    )
    response.append(connect)

    # Fallback if WS bridge drops
    response.say(
        "I'm sorry, there was a connection issue. Please call back or use the app. Goodbye.",
        voice="Polly.Joanna",
    )

    return Response(content=str(response), media_type="application/xml")


async def _log_inbound_call(call_sid: str, from_number: str | None = None):
    """Background task: create a Call record for this Twilio inbound call and auto-match caller phone to User."""
    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            user_id = None
            if from_number:
                clean_phone = from_number.strip().replace(" ", "").replace("-", "")
                if len(clean_phone) >= 10:
                    stmt = select(domain.User).where(domain.User.phone_number.like(f"%{clean_phone[-10:]}%"))
                    matched_user = await session.scalar(stmt)
                    if matched_user:
                        user_id = matched_user.id
                        print(f"[INBOUND] Matched caller {from_number} to User #{user_id} ({matched_user.name})")

            call = domain.Call(
                twilio_call_sid=call_sid,
                user_id=user_id,
                start_time=datetime.utcnow(),
                state="active",
                source="phone"
            )
            session.add(call)
            await session.commit()
    except Exception as e:
        print(f"[WARN] Twilio call log failed: {e}")


# ── Status callback ─────────────────────────────────────────────────────────

@router.api_route("/status-callback", methods=["GET", "POST"])
async def call_status_callback(request: Request):
    """
    Twilio posts here when call status changes (completed, failed, no-answer).
    Configure as 'Status Callback URL' on the Twilio phone number.
    """
    if request.method == "POST":
        form = await request.form()
        call_sid    = form.get("CallSid")
        status      = form.get("CallStatus", "unknown")
        duration    = int(form.get("CallDuration", 0))
        recording   = form.get("RecordingUrl")
    else:
        params      = request.query_params
        call_sid    = params.get("CallSid")
        status      = params.get("CallStatus", "unknown")
        duration    = int(params.get("CallDuration", 0))
        recording   = params.get("RecordingUrl")

    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            stmt = select(domain.Call).where(domain.Call.twilio_call_sid == call_sid)
            call = await session.scalar(stmt)
            if call:
                call.state    = "completed" if status == "completed" else status
                call.end_time = datetime.utcnow()
                # Store duration + optional recording URL in transcript metadata
                note = f"\n[CALL_META] duration={duration}s status={status}"
                if recording:
                    note += f" recording={recording}"
                call.transcript = (call.transcript or "") + note
                await session.commit()
    except Exception as e:
        print(f"[WARN] Status callback DB update failed: {e}")

    return Response(content="<?xml version='1.0'?><Response/>", media_type="application/xml")


# ── Outbound call (escalation / manual trigger) ─────────────────────────────

class OutboundCallRequest(BaseModel):
    phone_number: str          # E.164 format: +91xxxxxxxxxx
    patient_name: str = "Patient"
    call_id: int | None = None  # Link to an existing Call record if available


@router.post("/outbound")
async def trigger_outbound_call(body: OutboundCallRequest):
    """
    Trigger an outbound call from Dignova AI to a patient's phone.
    Twilio calls them → they answer → gets connected to Gemini Live AI bot.
    Used for: CRITICAL escalation auto-dial, or manual doctor-triggered callback.
    """
    client = _twilio_client()

    from urllib.parse import quote
    encoded_name = quote(body.patient_name)
    twiml_url = f"{BACKEND_URL}/api/twilio/outbound-twiml?name={encoded_name}"

    call = client.calls.create(
        to=body.phone_number,
        from_=TWILIO_NUMBER,
        url=twiml_url,
        method="GET",
        status_callback=f"{BACKEND_URL}/api/twilio/status-callback",
        status_callback_method="POST",
    )

    return {
        "call_sid": call.sid,
        "to": body.phone_number,
        "status": call.status,
        "message": "Dignova AI is calling the patient now.",
    }


@router.api_route("/outbound-twiml", methods=["GET", "POST"])
async def outbound_twiml(request: Request, name: str = "Patient"):
    """
    TwiML served to the outbound call leg.
    Supports speech and DTMF keypress for Twilio Trial accounts.
    Creates a DB Call row so the session is tracked in history.
    """
    if request.method == "POST":
        form = await request.form()
        call_sid = form.get("CallSid", "unknown")
        phone_number = form.get("To")
    else:
        call_sid = request.query_params.get("CallSid", "unknown")
        phone_number = request.query_params.get("To")

    param_name = request.query_params.get("name") or name

    # Phase 1.1 — Create DB Call row for this outbound session
    import asyncio
    asyncio.create_task(_create_outbound_call_record(call_sid, param_name, phone_number))

    greeting = _time_greeting()
    response = VoiceResponse()

    # Say a quick fallback greeting in case websocket takes a second
    response.say(
        f"{greeting} {param_name}. Please hold while I connect you to Dr. Dignova.",
        voice="Polly.Joanna",
        language="en-US"
    )

    connect = Connect()
    connect.stream(
        url=f"{BACKEND_URL_WS}/ws/twilio-media",
        track="inbound_track",
    )
    response.append(connect)

    # Fallback if no input detected or stream fails
    response.say("I did not hear your response. Please call back or use the Dignova app. Take care.", voice="Polly.Joanna")
    return Response(content=str(response), media_type="application/xml")


async def _create_outbound_call_record(call_sid: str, patient_name: str, phone_number: str | None = None):
    """Background task: create a Call DB record for an outbound phone consultation and link to User."""
    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            user_id = None
            if phone_number:
                clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
                if len(clean_phone) >= 10:
                    stmt = select(domain.User).where(domain.User.phone_number.like(f"%{clean_phone[-10:]}%"))
                    matched_user = await session.scalar(stmt)
                    if matched_user:
                        user_id = matched_user.id
                        print(f"[OUTBOUND] Matched recipient {phone_number} to User #{user_id} ({matched_user.name})")

            call = domain.Call(
                twilio_call_sid=call_sid,
                user_id=user_id,
                call_type=domain.CallType.triage,
                start_time=datetime.utcnow(),
                state="active",
                source="phone",
                transcript=f"[OUTBOUND CALL] Patient: {patient_name}\n"
            )
            session.add(call)
            await session.commit()
            print(f"[DB] Outbound call record created: {call_sid} (user_id={user_id})")
    except Exception as e:
        print(f"[WARN] Outbound call DB create failed: {e}")


PHONE_TRANSCRIPTS: Dict[str, str] = {}

@router.api_route("/phone-turn", methods=["GET", "POST"])
async def phone_turn(request: Request):
    """
    Handles interactive phone turn exchanges with Dr. Dignova.
    Maintains complete conversation memory across turns so Dr. Dignova remembers symptoms
    and provides accurate, non-repeating clinical assessments.
    """
    form = await request.form()
    speech_result = form.get("SpeechResult", "").strip()
    digits_result = form.get("Digits", "").strip()
    call_sid = form.get("CallSid", "unknown")

    response = VoiceResponse()

    # If patient pressed a DTMF key (trial account prompt), immediately gather their speech
    if digits_result and not speech_result:
        gather = response.gather(
            input="speech",
            action=f"{BACKEND_URL}/api/twilio/phone-turn",
            method="POST",
            speech_timeout="3",
            language="en-IN"
        )
        return Response(content=str(response), media_type="application/xml")

    if not speech_result:
        gather = response.gather(
            input="speech",
            action=f"{BACKEND_URL}/api/twilio/phone-turn",
            method="POST",
            speech_timeout="3",
            language="en-IN"
        )
        gather.say("I am listening. Please describe how you are feeling or what symptoms you have.", voice="Polly.Joanna", language="en-US")
        return Response(content=str(response), media_type="application/xml")

    print(f"[PHONE] Phone Patient ({call_sid}) said: {speech_result}")

    # Phase 1.2 — Fetch real EHR context from DB if call is linked to a user
    ehr_context = ""
    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            stmt = select(domain.Call).where(domain.Call.twilio_call_sid == call_sid)
            db_call = await session.scalar(stmt)
            if db_call and db_call.user_id:
                user = await session.get(domain.User, db_call.user_id)
                if user:
                    parts = []
                    if user.allergies: parts.append(f"Allergies: {user.allergies}")
                    if user.chronic_conditions: parts.append(f"Chronic conditions: {user.chronic_conditions}")
                    if user.medications: parts.append(f"Current medications: {user.medications}")
                    if user.blood_group: parts.append(f"Blood group: {user.blood_group}")
                    if parts:
                        ehr_context = "Patient Medical History: " + ". ".join(parts) + ".\n"
    except Exception as e:
        print(f"[WARN] EHR fetch skipped: {e}")

    # Load prior call history for this patient (cross-session memory)
    prior_history = ""
    try:
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            stmt = select(domain.Call).where(
                domain.Call.twilio_call_sid == call_sid
            )
            db_call = await session.scalar(stmt)
            if db_call and db_call.user_id:
                hist_stmt = select(domain.Call).where(
                    domain.Call.user_id == db_call.user_id,
                    domain.Call.state == "completed",
                    domain.Call.transcript != None
                ).order_by(domain.Call.start_time.desc()).limit(3)
                prior_calls = (await session.execute(hist_stmt)).scalars().all()
                if prior_calls:
                    excerpts = []
                    for pc in prior_calls:
                        date_str = pc.start_time.strftime("%b %d") if pc.start_time else "recent"
                        excerpt = (pc.transcript or "")[:200].replace("\n", " ")
                        excerpts.append(f"- {date_str}: {excerpt}")
                    prior_history = "Prior consultations:\n" + "\n".join(excerpts) + "\n"
    except Exception as e:
        print(f"[WARN] Prior history load failed: {e}")

    # Fetch prior conversation memory
    prior_transcript = PHONE_TRANSCRIPTS.get(call_sid, "")
    current_transcript = prior_transcript + f"Patient: {speech_result}\n"

    from ..services.ai_service import SentientOrchestrator
    orchestrator = SentientOrchestrator(persona="TRIAGE")

    prompt = f"""You are Dr. Dignova, a senior consultant physician conducting a live phone clinical consultation.
You are warm, attentive, and highly natural. Speak like a real human doctor sitting with a patient. Never sound robotic or pre-programmed.

{ehr_context}
{prior_history}
Conversation so far:
{current_transcript}

Patient's latest response: "{speech_result}"

Clinical Voice Protocol:
1. ALWAYS acknowledge what the patient just said with warm empathy (e.g. "I understand...", "I see, that sounds uncomfortable...", "Thank you for sharing that...").
2. Ask targeted follow-up clinical questions to explore symptom location, intensity (1-10 scale), duration, and accompanying symptoms (fever, nausea, breathlessness, dizziness).
3. DO NOT deliver a final diagnosis on early turns (turn 1 or 2). Ask clarifying follow-up questions first to get complete details.
4. Only when you have gathered sufficient clinical information (after at least 2-3 turns of dialogue), state your diagnostic impression, provide recommended self-care, and append [DIAGNOSIS_READY] at the end.
5. If dangerous red flags are mentioned (chest pain, shortness of breath, collapse), advise immediate emergency care and append [EMERGENCY_DETECTED].
6. Keep spoken replies to 2-3 natural sentences suitable for a phone call.
"""

    doctor_reply = orchestrator.process_message(prompt, speech_result)
    clean_doctor_text = doctor_reply.replace("[EMERGENCY_DETECTED]", "").replace("[DIAGNOSIS_READY]", "").strip()

    # Phase 1.1 — Persist this turn to DB transcript
    full_turn = f"Patient: {speech_result}\nDr. Dignova: {clean_doctor_text}\n"
    import asyncio
    asyncio.create_task(_append_call_transcript(call_sid, full_turn))

    # Update in-memory conversation memory
    PHONE_TRANSCRIPTS[call_sid] = current_transcript + f"Dr. Dignova: {clean_doctor_text}\n"

    if "[EMERGENCY_DETECTED]" in doctor_reply:
        response.say("I am concerned about these symptoms. They require immediate medical evaluation. I am escalating your care to an emergency responder right now.", voice="Polly.Joanna", language="en-US")
        # Trigger SOS alert logic
        asyncio.create_task(_finalize_call_record(call_sid, "EMERGENCY: Immediate hospital escalation required", current_transcript))
        PHONE_TRANSCRIPTS.pop(call_sid, None)
        return Response(content=str(response), media_type="application/xml")

    # Count turns in history
    turn_count = current_transcript.count("Patient:")
    explicit_done_phrases = ["that's all i wanted", "that's all doctor", "goodbye doctor", "bye doctor", "thank you goodbye", "that is all doctor"]
    is_explicit_done = any(phrase in speech_result.lower() for phrase in explicit_done_phrases)

    # Only finalize if doctor is ready after at least 2 turns, or patient explicitly says goodbye
    if ("[DIAGNOSIS_READY]" in doctor_reply and turn_count >= 2) or is_explicit_done:
        final_speech = clean_doctor_text or "Based on our consultation, please get plenty of rest, stay hydrated, and consult a physician if symptoms persist."
        response.say(final_speech, voice="Polly.Joanna", language="en-US")
        response.say("Thank you for consulting Dr. Dignova. Take care and stay safe. Goodbye.", voice="Polly.Joanna", language="en-US")
        # Phase 1.1 — Finalize call in DB with diagnosis summary
        import asyncio
        full_transcript = PHONE_TRANSCRIPTS.get(call_sid, "")
        asyncio.create_task(_finalize_call_record(call_sid, final_speech, full_transcript))
        PHONE_TRANSCRIPTS.pop(call_sid, None)
        return Response(content=str(response), media_type="application/xml")

    # Speak doctor's specific clinical question and gather next patient response
    gather = response.gather(
        input="speech",
        action=f"{BACKEND_URL}/api/twilio/phone-turn",
        method="POST",
        speech_timeout="3",
        language="en-IN"
    )
    gather.say(clean_doctor_text, voice="Polly.Joanna", language="en-US")

    # Fallback if patient is silent after prompt
    response.say("I am still right here with you. Are you experiencing any other symptoms or discomfort?", voice="Polly.Joanna", language="en-US")
    response.redirect(f"{BACKEND_URL}/api/twilio/phone-turn", method="POST")

    return Response(content=str(response), media_type="application/xml")


# ── Phase 1.1 DB Helper Functions ───────────────────────────────────────────

async def _append_call_transcript(call_sid: str, turn_text: str):
    """Background task: append a conversation turn to the Call DB record."""
    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            stmt = select(domain.Call).where(domain.Call.twilio_call_sid == call_sid)
            call = await session.scalar(stmt)
            if call:
                call.transcript = (call.transcript or "") + turn_text
                await session.commit()
    except Exception as e:
        print(f"[WARN] Transcript append failed: {e}")


async def _finalize_call_record(call_sid: str, diagnosis_text: str, full_transcript: str):
    """Background task: mark call as completed and save final diagnosis summary."""
    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            stmt = select(domain.Call).where(domain.Call.twilio_call_sid == call_sid)
            call = await session.scalar(stmt)
            if call:
                call.state = "completed"
                call.end_time = datetime.utcnow()
                call.diagnosis_given = diagnosis_text[:500] if diagnosis_text else None
                call.transcript = full_transcript or call.transcript
                # Auto-tag severity based on transcript keywords
                transcript_lower = full_transcript.lower()
                if any(w in transcript_lower for w in ["chest pain", "can't breathe", "unconscious", "stroke", "heart attack"]):
                    call.severity = "CRITICAL"
                elif any(w in transcript_lower for w in ["fever", "vomiting", "severe", "bleeding", "emergency"]):
                    call.severity = "HIGH"
                elif any(w in transcript_lower for w in ["cold", "cough", "headache", "mild", "tired"]):
                    call.severity = "MEDIUM"
                else:
                    call.severity = "LOW"

                # Phase 3.2 — Auto-assign an online doctor for HIGH/CRITICAL calls
                if call.severity in ("HIGH", "CRITICAL") and call.organization_id:
                    try:
                        doc_stmt = select(domain.User).where(
                            domain.User.role == domain.UserRole.doctor,
                            domain.User.organization_id == call.organization_id,
                            domain.User.is_online == True,
                            domain.User.tier != domain.DoctorTier.intern
                        ).limit(1)
                        assigned_doctor = await session.scalar(doc_stmt)
                        if assigned_doctor:
                            call.diagnosis_given = (call.diagnosis_given or "") + f" [ASSIGNED: Dr. {assigned_doctor.name}]"
                            print(f"[ASSIGN] Call {call_sid} ({call.severity}) assigned to Dr. {assigned_doctor.name}")
                    except Exception as ae:
                        print(f"[WARN] Doctor auto-assign failed: {ae}")

                # Phase 5.3 — Flag call for proactive follow-up (MEDIUM+ severity)
                if call.severity in ("MEDIUM", "HIGH", "CRITICAL"):
                    from datetime import timedelta
                    # Store follow-up due time in transcript metadata
                    follow_up_time = datetime.utcnow() + timedelta(hours=6)
                    call.transcript = (call.transcript or "") + f"\n[FOLLOW_UP_DUE] {follow_up_time.isoformat()}"
                    print(f"[FOLLOW-UP] Call {call_sid} flagged for follow-up at {follow_up_time}")

                await session.commit()
                print(f"[DB] Call {call_sid} finalized. Severity: {call.severity}")
    except Exception as e:
        print(f"[WARN] Call finalize failed: {e}")


