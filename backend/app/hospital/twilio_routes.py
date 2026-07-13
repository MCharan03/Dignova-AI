"""
twilio_routes.py — Dignova AI Call Bot Controller
Full Twilio Voice integration: inbound bot, outbound escalation, status callbacks.
"""
import os
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

@router.post("/incoming")
async def handle_incoming_call(request: Request):
    """
    Twilio webhook for inbound calls.
    Greets the caller, then bridges to the Gemini Live AI via WebSocket.
    Configure this URL in Twilio Console → Phone Number → Voice webhook.
    """
    form = await request.form()
    call_sid = form.get("CallSid", "unknown")

    # Log to DB asynchronously — don't block TwiML response
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
        track="both_tracks",
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
        print(f"⚠️ Twilio call log failed: {e}")


# ── Status callback ─────────────────────────────────────────────────────────

@router.post("/status-callback")
async def call_status_callback(request: Request):
    """
    Twilio posts here when call status changes (completed, failed, no-answer).
    Configure as 'Status Callback URL' on the Twilio phone number.
    """
    form = await request.form()
    call_sid    = form.get("CallSid")
    status      = form.get("CallStatus", "unknown")
    duration    = int(form.get("CallDuration", 0))
    recording   = form.get("RecordingUrl")

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
        print(f"⚠️ Status callback DB update failed: {e}")

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
        status_callback=f"{BACKEND_URL}/api/twilio/status-callback",
        status_callback_method="POST",
    )

    return {
        "call_sid": call.sid,
        "to": body.phone_number,
        "status": call.status,
        "message": "Dignova AI is calling the patient now.",
    }


@router.post("/outbound-twiml")
async def outbound_twiml(name: str = "Patient"):
    """
    TwiML served to the outbound call leg.
    Greets by name, then bridges to the same Gemini Live WS bot.
    """
    greeting = _time_greeting()
    response = VoiceResponse()
    response.say(
        f"{greeting} {name}. This is Dignova AI, your medical assistant. "
        "I'm connecting you to our AI Doctor now. Please describe your symptoms when ready.",
        voice="Polly.Joanna",
        language="en-US",
    )

    connect = Connect()
    connect.stream(
        url=f"{BACKEND_URL_WS}/ws/twilio-media",
        track="both_tracks",
    )
    response.append(connect)

    response.say(
        "I'm sorry, I lost the connection. Please call back or use the Dignova app. Take care.",
        voice="Polly.Joanna",
    )

    return Response(content=str(response), media_type="application/xml")
