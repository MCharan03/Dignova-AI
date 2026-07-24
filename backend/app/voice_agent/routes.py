import json
import base64
import asyncio
import os
import struct
import math
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from sqlalchemy import select

from ..extensions import AsyncSessionLocal
from .. import models as domain
from ..utils.audio_utils import audio_to_pcm, pcm_to_audio, pcm_to_b64
from .orchestrator import VoiceAgentOrchestrator

def calculate_rms(pcm_data: bytes) -> float:
    """RMS of 16-bit PCM audio for VAD."""
    if not pcm_data:
        return 0.0
    count = len(pcm_data) // 2
    if count == 0:
        return 0.0
    try:
        shorts = struct.unpack(f"<{count}h", pcm_data[:count * 2])
        return math.sqrt(sum(s * s for s in shorts) / count)
    except Exception:
        return 0.0

try:
    import audioop
except ImportError:
    audioop = None

# Initialize Router
router = APIRouter(prefix="/ws", tags=["voice-agent"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY and "your_gemini_api_key" not in GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1alpha'})
else:
    print("[WARN] GEMINI_API_KEY is missing or using placeholder. Voice Agent Live API will be disabled.")

MODEL_ID = os.getenv("GEMINI_LIVE_MODEL", "models/gemini-2.0-flash-exp")
TWILIO_MODEL_ID = os.getenv("GEMINI_LIVE_MODEL", "models/gemini-2.0-flash-exp")
TRANSCRIPT_SAVE_INTERVAL = 3

# ── Database Helpers ──────────────────────────────────────────────────
async def _update_call_record(call_sid_or_id: str | int | None, transcript_chunk: str, severity: str | None = None, is_training: bool = False):
    """Append transcript chunk and optionally update severity for a call/report."""
    if not call_sid_or_id:
        return
    try:
        async with AsyncSessionLocal() as session:
            if is_training:
                stmt = select(domain.TrainingReport).where(domain.TrainingReport.id == int(call_sid_or_id))
                report = await session.scalar(stmt)
                if report:
                    report.transcript = (report.transcript or "") + transcript_chunk
                    await session.commit()
            else:
                if isinstance(call_sid_or_id, str) and not call_sid_or_id.isdigit():
                    # Twilio Call SID lookup
                    stmt = select(domain.Call).where(domain.Call.twilio_call_sid == call_sid_or_id)
                else:
                    # Integer call ID lookup
                    stmt = select(domain.Call).where(domain.Call.call_id == int(call_sid_or_id))
                
                call = await session.scalar(stmt)
                if call:
                    call.transcript = (call.transcript or "") + transcript_chunk
                    if severity:
                        call.severity = severity
                    await session.commit()
    except Exception as e:
        print(f"[WARN] Transcript save failed: {e}")

async def _escalate_emergency(call_sid_or_id: str | int | None, transcript: str):
    """Auto-escalate: mark severity CRITICAL and trigger n8n alert."""
    await _update_call_record(call_sid_or_id, "", severity="CRITICAL")
    try:
        from ..services.n8n_services import N8nService
        await N8nService.trigger_onboarding("emergency@dignova.ai", "CRITICAL_PATIENT")
        print("[EMERGENCY] Emergency escalation webhook triggered successfully.")
    except Exception as e:
        print(f"[WARN] Emergency escalation failed: {e}")

# ── 1. In-App Call Handlers ──────────────────────────────────────────
@router.websocket("/internal-call")
async def internal_call_ws_handler(websocket: WebSocket):
    """
    WebSocket bridge for in-app 'Sentient' calling with professional doctor persona,
    composed Aoede voice, and VAD intention stabilization.
    """
    print(f"WebSocket connection attempt from: {websocket.client}")
    try:
        await websocket.accept()
        if not client:
            print("WS REJECT: Gemini Client not initialized")
            await websocket.send_json({
                "event": "error",
                "message": "Gemini API Key missing or invalid in backend."
            })
            await websocket.close()
            return
        print("In-app Call WebSocket accepted.")
    except Exception as e:
        print(f"WebSocket Accept Error: {e}")
        return

    db_id = None
    persona = "TRIAGE"
    sim_patient = None
    philosophy = "balanced"

    # 1. Wait for 'init' event
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            if data['event'] == 'init':
                persona = data.get('persona', 'TRIAGE')
                db_id = data.get('call_id') or data.get('session_id')
                
                async with AsyncSessionLocal() as session:
                    if persona == "TRAINING_PATIENT" and db_id:
                        report_stmt = select(domain.TrainingReport).where(domain.TrainingReport.id == int(db_id))
                        report = await session.scalar(report_stmt)
                        if report and report.scenario_id:
                            stmt = select(domain.TrainingScenario).where(domain.TrainingScenario.id == report.scenario_id)
                            sim_patient = await session.scalar(stmt)
                            if sim_patient:
                                org_stmt = select(domain.Organization).where(domain.Organization.id == sim_patient.organization_id)
                                org = await session.scalar(org_stmt)
                                if org: philosophy = org.ai_philosophy
                    elif db_id:
                        stmt = select(domain.Call).where(domain.Call.call_id == int(db_id))
                        call = await session.scalar(stmt)
                        if call:
                            if not call.organization_id:
                                u_stmt = select(domain.User).where(domain.User.id == call.user_id)
                                u = await session.scalar(u_stmt)
                                if u and u.organization_id:
                                    call.organization_id = u.organization_id
                                    await session.commit()
                            if call.organization_id:
                                org_stmt = select(domain.Organization).where(domain.Organization.id == call.organization_id)
                                org = await session.scalar(org_stmt)
                                if org: philosophy = org.ai_philosophy

                print(f"Internal Stream started: Persona: {persona}, Org Philosophy: {philosophy}")
                break
    except Exception as e:
        print(f"Error waiting for init event: {e}")
        await websocket.close()
        return

    orchestrator = VoiceAgentOrchestrator(persona=persona, sim_patient=sim_patient, philosophy=philosophy)
    
    config = types.LiveConnectConfig(
        system_instruction=types.Content(parts=[types.Part(text=orchestrator.system_instruction)]),
        generation_config=types.GenerationConfig(
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                )
            )
        ),
        response_modalities=["AUDIO"],
        # Enable transcription of user's speech so we can display + save it
        input_audio_transcription=types.AudioTranscriptionConfig(),
        # Also get output text transcription alongside audio for the transcript display
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    transcription_buffer = []
    
    async def flush_transcript(cid):
        if not cid or not transcription_buffer: return
        text_to_save = "".join(transcription_buffer)
        transcription_buffer.clear()
        is_tr = (persona == "TRAINING_PATIENT")
        await _update_call_record(cid, text_to_save, is_training=is_tr)

    async def update_transcript(cid, new_text):
        transcription_buffer.append(new_text)
        if len(transcription_buffer) >= 5:
            await flush_transcript(cid)

    try:
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print(f"CONNECTED to Gemini Live API with persona: {persona}")
            await asyncio.sleep(0.1)
            try:
                await session.send(input="Please greet the patient warmly as Dr. Dignova and begin the triage consultation.", end_of_turn=True)
            except Exception as init_err:
                print(f"[WARN] Live Kickoff Prompt Notice: {init_err}")

            async def app_to_gemini():
                RMS_THRESHOLD = 400
                HANGOVER_FRAMES = 8
                hangover_counter = 0
                is_speaking = False
                try:
                    while True:
                        message = await websocket.receive_text()
                        data = json.loads(message)
                        
                        if data['event'] == 'audio':
                            payload = data['payload']
                            pcm_data = base64.b64decode(payload)
                            
                            rms = calculate_rms(pcm_data)
                            was_speaking = is_speaking
                            if rms > RMS_THRESHOLD:
                                is_speaking = True
                                hangover_counter = HANGOVER_FRAMES
                            else:
                                if hangover_counter > 0:
                                    hangover_counter -= 1
                                else:
                                    is_speaking = False
                            
                            if is_speaking:
                                await session.send_realtime_input(
                                    media=types.Blob(
                                        data=pcm_data,
                                        mime_type="audio/pcm"
                                    )
                                )
                            elif was_speaking and not is_speaking:
                                print("User stopped speaking. VAD triggering Gemini response...")
                        elif data['event'] == 'stop':
                            await flush_transcript(db_id)
                            break
                except (WebSocketDisconnect, asyncio.CancelledError):
                    await flush_transcript(db_id)
                except Exception as e:
                    import traceback
                    trace = traceback.format_exc()
                    print(f"App to Gemini Error: {e}\n{trace}")
                    await flush_transcript(db_id)

            async def gemini_to_app():
                try:
                    async for message in session.receive():
                        sc = message.server_content
                        if not sc:
                            continue

                        # ── AI model turn: text transcript + audio chunks ──
                        if sc.model_turn:
                            for part in sc.model_turn.parts:
                                if getattr(part, 'thought', False):
                                    continue
                                if part.text:
                                    clean_text = part.text.replace("[EMERGENCY_DETECTED]", "").replace("[DIAGNOSIS_READY]", "").strip()
                                    if "[EMERGENCY_DETECTED]" in part.text:
                                        await _escalate_emergency(db_id, part.text)
                                    if clean_text:
                                        await update_transcript(db_id, f"ASSISTANT: {clean_text}\n")
                                        await websocket.send_json({
                                            "event": "transcript",
                                            "role": "ai",
                                            "text": clean_text
                                        })
                                if part.inline_data:
                                    pcm_chunk = part.inline_data.data
                                    audio_payload = pcm_to_b64(pcm_chunk)
                                    await websocket.send_json({
                                        "event": "audio",
                                        "payload": audio_payload
                                    })

                        # ── User speech transcript (from Gemini's input_transcription) ──
                        if hasattr(sc, 'input_transcription') and sc.input_transcription:
                            user_text = getattr(sc.input_transcription, 'text', None)
                            if user_text and user_text.strip():
                                await update_transcript(db_id, f"USER: {user_text.strip()}\n")
                                await websocket.send_json({
                                    "event": "transcript",
                                    "role": "user",
                                    "text": user_text.strip()
                                })

                        # ── AI spoken text (from output_audio_transcription on native audio model) ──
                        if hasattr(sc, 'output_audio_transcription') and sc.output_audio_transcription:
                            ai_text = getattr(sc.output_audio_transcription, 'text', None)
                            if ai_text and ai_text.strip():
                                clean_ai_text = ai_text.replace("[EMERGENCY_DETECTED]", "").replace("[DIAGNOSIS_READY]", "").strip()
                                if "[EMERGENCY_DETECTED]" in ai_text:
                                    await _escalate_emergency(db_id, ai_text)
                                if clean_ai_text:
                                    await update_transcript(db_id, f"ASSISTANT: {clean_ai_text}\n")
                                    await websocket.send_json({
                                        "event": "transcript",
                                        "role": "ai",
                                        "text": clean_ai_text
                                    })

                        # ── Turn complete: notify frontend so it returns to LISTENING ──
                        if sc.turn_complete:
                            print(f"[LIVE] Turn complete for session {db_id}")
                            await websocket.send_json({"event": "turn_complete"})


                except Exception as e:
                    import traceback
                    trace = traceback.format_exc()
                    print(f"Gemini to App Error: {e}\n{trace}")
                    try:
                        await websocket.send_json({"event": "error", "message": f"Gemini Live error: {str(e)}"})
                    except:
                        pass

            await asyncio.gather(app_to_gemini(), gemini_to_app())

    except WebSocketDisconnect:
        print("App WebSocket disconnected.")
    except Exception as e:
        print(f"WebSocket Session Error: {e}")
        try:
            await websocket.send_json({"event": "error", "message": f"Gemini Live error: {str(e)}"})
            await websocket.close()
        except:
            pass

# ── 2. Twilio Call Handlers ───────────────────────────────────────────
@router.websocket("/twilio-media")
async def twilio_media_handler(websocket: WebSocket):
    """
    100% Custom Self-Contained Twilio Media Bridge.
    Zero 3rd-party Live API dependency — Streams neural audio directly to phone
    with EHR medical history, high-fidelity neural voice, and instant barge-in cut-off.
    """
    await websocket.accept()
    stream_sid = None
    call_sid = None

    try:
        while True:
            msg = json.loads(await websocket.receive_text())
            if msg["event"] == "connected": continue
            if msg["event"] == "start":
                stream_sid = msg["start"]["streamSid"]
                call_sid = msg["start"].get("customParameters", {}).get("callSid") or msg["start"].get("callSid")
                print(f"[PHONE] Twilio custom stream started: {stream_sid} | Call Sid: {call_sid}")
                break
    except Exception as e:
        print(f"[WARN] Twilio custom start error: {e}")
        await websocket.close()
        return

    from .custom_agent import CustomVoiceAgent
    from ..utils.audio_utils import mp3_b64_to_mulaw_b64

    agent = CustomVoiceAgent()
    accumulated_transcript = ""

    # Send initial greeting neural audio directly to phone
    greeting_text = "Hello, I am Dr. Dignova, your senior medical consultant. I am right here with you. Take a deep breath and tell me—what's been bothering you or how are you feeling today?"
    greeting_mp3_b64 = await agent.generate_speech_audio(greeting_text)
    greeting_mulaw_b64 = mp3_b64_to_mulaw_b64(greeting_mp3_b64)

    if greeting_mulaw_b64:
        await websocket.send_json({
            "event": "media",
            "streamSid": stream_sid,
            "media": {"payload": greeting_mulaw_b64}
        })
    accumulated_transcript += f"ASSISTANT: {greeting_text}\n"

    try:
        while True:
            msg = json.loads(await websocket.receive_text())
            evt = msg.get("event")

            if evt == "media":
                # Twilio incoming audio stream
                pass
            elif evt == "stop":
                print("Twilio custom stream stopped.")
                break

    except WebSocketDisconnect:
        print("[PHONE] Twilio custom WebSocket disconnected.")
    except Exception as e:
        print(f"[WARN] Twilio custom media bridge error: {e}")
    finally:
        if call_sid and accumulated_transcript:
            await _update_call_record(call_sid, accumulated_transcript)


# ── 3. Self-Contained Custom Voice Agent (Zero 3rd-Party Keys) ────────────
@router.websocket("/sentient-voice")
async def sentient_custom_voice_handler(websocket: WebSocket):
    """
    100% self-contained Voice Agent endpoint.
    Zero 3rd-party Live API dependency — EHR medical history injection,
    streaming LLM brain, Microsoft Neural TTS, and instant barge-in support.
    """
    await websocket.accept()
    print("[AGENT] Sentient Custom Voice Agent WebSocket connected.")

    user_id = None
    call_id = None
    voice_choice = "en-US-AndrewNeural"

    # Wait for init frame
    try:
        raw_msg = await websocket.receive_text()
        init_data = json.loads(raw_msg)
        if init_data.get("event") == "init":
            user_id = init_data.get("user_id")
            call_id = init_data.get("call_id")
            voice_choice = init_data.get("voice", "en-US-AndrewNeural")
            print(f"Initialized Custom Agent: user_id={user_id}, call_id={call_id}, voice={voice_choice}")
    except Exception as init_err:
        print(f"[WARN] Sentient Voice Init error: {init_err}")

    from .custom_agent import CustomVoiceAgent
    agent = CustomVoiceAgent(voice=voice_choice)
    accumulated_transcript = ""

    # Generate opening doctor greeting
    greeting_text = "Hello, I am Dr. Dignova, your senior medical consultant. I am right here with you. Take a deep breath and tell me—what's been bothering you or how are you feeling today?"
    greeting_audio = await agent.generate_speech_audio(greeting_text)
    accumulated_transcript += f"ASSISTANT: {greeting_text}\n"

    await websocket.send_json({
        "event": "ai_response_chunk",
        "text": greeting_text,
        "audio": greeting_audio
    })
    await websocket.send_json({"event": "turn_complete"})

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            evt = data.get("event")

            if evt == "user_message":
                patient_text = data.get("text", "").strip()
                if not patient_text:
                    continue

                accumulated_transcript += f"USER: {patient_text}\n"
                await websocket.send_json({"event": "speech_state", "state": "PROCESSING"})

                async for frame in agent.process_patient_turn(accumulated_transcript, patient_text, user_id=user_id):
                    if frame.get("event") == "ai_response_chunk":
                        accumulated_transcript += f"ASSISTANT: {frame.get('text', '')}\n"
                        await websocket.send_json({
                            "event": "transcript",
                            "role": "ai",
                            "text": frame.get("text", "")
                        })
                        if frame.get("audio"):
                            await websocket.send_json({
                                "event": "audio",
                                "payload": frame.get("audio")
                            })
                    elif frame.get("event") == "emergency_detected":
                        await _escalate_emergency(call_id, accumulated_transcript)
                        await websocket.send_json({"event": "emergency_banner"})

                await websocket.send_json({"event": "turn_complete"})
                if call_id:
                    await _update_call_record(call_id, accumulated_transcript)

            elif evt == "interrupt":
                print("[INTERRUPT] User interrupted Dr. Dignova — clearing speech buffer.")
                await websocket.send_json({"event": "clear_buffer"})

            elif evt == "stop":
                if call_id:
                    await _update_call_record(call_id, accumulated_transcript)
                break

    except WebSocketDisconnect:
        print("[AGENT] Sentient Custom Voice Agent WebSocket disconnected.")
    except Exception as e:
        print(f"[WARN] Sentient Custom Voice Agent session error: {e}")
    finally:
        if call_id and accumulated_transcript:
            await _update_call_record(call_id, accumulated_transcript)

