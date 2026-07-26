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

BACKEND_URL    = os.getenv("BACKEND_URL", "https://dignova-ai-1.onrender.com")
BACKEND_URL_WS = os.getenv("BACKEND_URL_WS", "wss://dignova-ai-1.onrender.com")
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
    Greets the caller, then bridges to the Gemini Live AI via WebSocket.
    Configure this URL in Twilio Console → Phone Number → Voice webhook.
    """
    if request.method == "POST":
        form = await request.form()
        call_sid = form.get("CallSid", "unknown")
    else:
        call_sid = request.query_params.get("CallSid", "unknown")

    # Log to DB asynchronously - don't block TwiML response
    import asyncio
    asyncio.create_task(_log_inbound_call(call_sid))

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


async def _log_inbound_call(call_sid: str):
    """Background task: create a Call record for this Twilio inbound call."""
    try:
        from ..extensions import AsyncSessionLocal
        from .. import models as domain
        async with AsyncSessionLocal() as session:
            call = domain.Call(
                twilio_call_sid=call_sid,
                start_time=datetime.utcnow(),
                state="active",
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
    """
    param_name = request.query_params.get("name") or name
    greeting = _time_greeting()
    response = VoiceResponse()

    gather = response.gather(
        input="speech dtmf",
        num_digits=1,
        action=f"{BACKEND_URL}/api/twilio/phone-turn",
        method="POST",
        speech_timeout="auto",
        language="en-US"
    )
    gather.say(
        f"{greeting} {param_name}. I am Dr. Dignova, your senior medical consultant. "
        "I am right here with you. Take a deep breath and tell me-what's been bothering you or how are you feeling today?",
        voice="Polly.Joanna",
        language="en-US"
    )

    # Fallback if no input detected
    response.say("I didn't hear your response. Please call back or use the Dignova app. Take care.", voice="Polly.Joanna")
    return Response(content=str(response), media_type="application/xml")


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
            speech_timeout="auto",
            language="en-US"
        )
        return Response(content=str(response), media_type="application/xml")

    if not speech_result:
        gather = response.gather(
            input="speech",
            action=f"{BACKEND_URL}/api/twilio/phone-turn",
            method="POST",
            speech_timeout="auto",
            language="en-US"
        )
        gather.say("I am listening. Please describe how you are feeling or what symptoms you have.", voice="Polly.Joanna", language="en-US")
        return Response(content=str(response), media_type="application/xml")

    print(f"[PHONE] Phone Patient ({call_sid}) said: {speech_result}")

    # Fetch prior conversation memory
    prior_transcript = PHONE_TRANSCRIPTS.get(call_sid, "")
    current_transcript = prior_transcript + f"Patient: {speech_result}\n"

    from ..services.ai_service import SentientOrchestrator
    orchestrator = SentientOrchestrator(persona="TRIAGE")

    prompt = f"""You are Dr. Dignova, an empathetic Senior Multi-Specialist Consultant Physician conducting a phone consultation.

Patient Conversation History so far:
{current_transcript}

Patient's latest response: "{speech_result}"

Rules for your response:
1. Speak in warm, caring, reassuring clinical English (2-3 short sentences max for phone clarity). Do NOT use markdown or tags.
2. Ask specific, intelligent diagnostic questions (e.g. asking about shortness of breath, chills, headache, fluid intake, or duration) instead of generic "tell me more".
3. If the patient indicates they have shared all symptoms (e.g. "that's all", "that's it", "nothing else", "no more"), provide a warm clinical diagnostic assessment, self-care guidance (hydration, rest, fever thresholds), and advise when to seek ER care, then append [DIAGNOSIS_READY].
4. If red-flag emergency symptoms are present (chest pressure, severe breathlessness, sudden weakness), append [EMERGENCY_DETECTED].
"""

    doctor_reply = orchestrator.process_message(prompt, speech_result)
    clean_doctor_text = doctor_reply.replace("[EMERGENCY_DETECTED]", "").replace("[DIAGNOSIS_READY]", "").strip()

    # Update conversation memory
    PHONE_TRANSCRIPTS[call_sid] = current_transcript + f"Dr. Dignova: {clean_doctor_text}\n"

    if "[EMERGENCY_DETECTED]" in doctor_reply:
        try:
            from ..services.n8n_services import N8nService
            await N8nService.trigger_onboarding("emergency@dignova.ai", f"CRITICAL_PHONE_PATIENT_{call_sid}")
        except Exception as e:
            print(f"[WARN] Emergency trigger error: {e}")

    # Patient requested to complete consultation or diagnosis ready
    user_done_phrases = ["that's all", "that is all", "that's it", "that is it", "proceed", "go next", "no more", "nothing else"]
    is_patient_done = any(phrase in speech_result.lower() for phrase in user_done_phrases)

    if "[DIAGNOSIS_READY]" in doctor_reply or is_patient_done:
        final_speech = clean_doctor_text or "Based on your symptoms of fever, cold, running nose, and dizziness, please rest well, stay hydrated, and consult a doctor if fever persists above 101 Fahrenheit."
        response.say(final_speech, voice="Polly.Joanna", language="en-US")
        response.say("Thank you for consulting Dr. Dignova. Take care and stay safe. Goodbye.", voice="Polly.Joanna", language="en-US")
        PHONE_TRANSCRIPTS.pop(call_sid, None)
        return Response(content=str(response), media_type="application/xml")

    # Speak doctor's specific clinical question and gather next patient response
    gather = response.gather(
        input="speech",
        action=f"{BACKEND_URL}/api/twilio/phone-turn",
        method="POST",
        speech_timeout="auto",
        language="en-US"
    )
    gather.say(clean_doctor_text, voice="Polly.Joanna", language="en-US")

    # Fallback if patient is silent after prompt
    response.say("I am still right here with you. Are you experiencing any other symptoms or discomfort?", voice="Polly.Joanna", language="en-US")
    response.redirect(f"{BACKEND_URL}/api/twilio/phone-turn", method="POST")

    return Response(content=str(response), media_type="application/xml")
