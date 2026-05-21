import json
import base64
import asyncio
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from ..extensions import AsyncSessionLocal
from .. import models as domain
from sqlalchemy import select, update
from ..services.ai_service import SentientOrchestrator
from ..utils.audio_utils import audio_to_pcm, pcm_to_audio
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter()

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1alpha'})
MODEL_ID = "gemini-3.1-flash-live-preview"

@router.websocket("/ws/internal-call")
async def internal_call_ws_handler(websocket: WebSocket):
    """
    Generic WebSocket handler for in-app 'Sentient' calling.
    Handles bidirectional audio streaming via Gemini Live API.
    """
    print(f"WebSocket connection attempt from: {websocket.client}")
    try:
        await websocket.accept()
        print("In-app Call WebSocket accepted.")
    except Exception as e:
        print(f"WebSocket Accept Error: {e}")
        return

    db_id = None
    persona = "TRIAGE" # Default
    sim_patient = None
    philosophy = "balanced"

    # 1. Wait for 'init' event from App to get persona/id
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            if data['event'] == 'init':
                persona = data.get('persona', 'TRIAGE')
                db_id = data.get('call_id') or data.get('session_id')
                
                async with AsyncSessionLocal() as session:
                    if persona == "TRAINING_PATIENT" and db_id:
                        # Fetch TrainingReport
                        report_stmt = select(domain.TrainingReport).where(domain.TrainingReport.id == int(db_id))
                        report = await session.scalar(report_stmt)
                        if report and report.scenario_id:
                            # Fetch TrainingScenario
                            stmt = select(domain.TrainingScenario).where(domain.TrainingScenario.id == report.scenario_id)
                            sim_patient = await session.scalar(stmt)
                            if sim_patient:
                                # Get Org philosophy
                                org_stmt = select(domain.Organization).where(domain.Organization.id == sim_patient.organization_id)
                                org = await session.scalar(org_stmt)
                                if org: philosophy = org.ai_philosophy
                    elif db_id:
                        # Fetch Call to find Org philosophy
                        stmt = select(domain.Call).where(domain.Call.call_id == int(db_id))
                        call = await session.scalar(stmt)
                        if call:
                            # 🛠 NEW: Auto-link call to organization
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

    # 2. Configure Gemini with the correct persona and dynamic patient data
    orchestrator = SentientOrchestrator(persona=persona, sim_patient=sim_patient, philosophy=philosophy)
    system_instruction = orchestrator.system_instruction
    
    config = {
        "system_instruction": system_instruction,
        "response_modalities": ["AUDIO", "TEXT"]
    }

    # 3. Define helper for DB updates with buffering
    transcription_buffer = []
    
    async def flush_transcript(cid):
        if not cid or not transcription_buffer: return
        try:
            text_to_save = "".join(transcription_buffer)
            transcription_buffer.clear()
            async with AsyncSessionLocal() as session:
                if persona == "TRAINING_PATIENT":
                    stmt = select(domain.TrainingReport).where(domain.TrainingReport.id == int(cid))
                    db_report = await session.scalar(stmt)
                    if db_report:
                        db_report.transcript = (db_report.transcript or "") + text_to_save
                        await session.commit()
                else:
                    stmt = select(domain.Call).where(domain.Call.call_id == int(cid))
                    db_call = await session.scalar(stmt)
                    if db_call:
                        db_call.transcript = (db_call.transcript or "") + text_to_save
                        await session.commit()
        except Exception as e:
            print(f"DB Transcript Flush Error: {e}")

    async def update_transcript(cid, new_text):
        transcription_buffer.append(new_text)
        if len(transcription_buffer) >= 5: # Flush every 5 messages
            await flush_transcript(cid)

    try:
        print(f"Attempting Gemini Live connection with model: {MODEL_ID}")
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print(f"CONNECTED to Gemini Live API with persona: {persona}")
            
            # 🛠 NEW: Trigger initial greeting so the AI speaks first
            try:
                greeting_trigger = "The patient has connected. Please introduce yourself as Attending MD and ask how you can help with their triage today."
                await session.send(greeting_trigger, end_of_turn=True)
                print("Greeting trigger sent to Gemini.")
            except Exception as ge:
                print(f"Failed to send initial greeting: {ge}")

            async def app_to_gemini():
                try:
                    while True:
                        message = await websocket.receive_text()
                        data = json.loads(message)
                        
                        if data['event'] == 'audio':
                            payload = data['payload']
                            pcm_data = audio_to_pcm(payload)
                            await session.send({
                                "realtime_input": {
                                    "media_chunks": [{
                                        "data": base64.b64encode(pcm_data).decode("utf-8"),
                                        "mime_type": "audio/pcm;rate=16000"
                                    }]
                                }
                            })
                        elif data['event'] == 'stop':
                            print("Internal Stream stopped.")
                            await flush_transcript(db_id)
                            break
                except Exception as e:
                    print(f"App to Gemini Error: {e}")
                    await flush_transcript(db_id)

            async def gemini_to_app():
                try:
                    async for message in session.receive():
                        if message.server_content and message.server_content.model_turn:
                            parts = message.server_content.model_turn.parts
                            for part in parts:
                                if part.text:
                                    print(f"Gemini [{persona}]: {part.text}")
                                    await update_transcript(db_id, f"ASSISTANT: {part.text}\n")
                                    # Send transcript to frontend for UI
                                    await websocket.send_json({
                                        "event": "transcript",
                                        "role": "ai",
                                        "text": part.text
                                    })
                                
                                if part.inline_data:
                                    pcm_chunk = part.inline_data.data
                                    audio_payload = pcm_to_audio(pcm_chunk)
                                    await websocket.send_json({
                                        "event": "audio",
                                        "payload": audio_payload
                                    })
                except Exception as e:
                    print(f"Gemini to App Error: {e}")

            # Run both directions concurrently
            done, pending = await asyncio.wait(
                [asyncio.create_task(app_to_gemini()), 
                 asyncio.create_task(gemini_to_app())],
                return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()

    except WebSocketDisconnect:
        print("App WebSocket disconnected.")
    except Exception as e:
        print(f"WebSocket Error: {e}")

@router.get("/test-tunnel")
async def test_tunnel():
    return {"status": "online", "message": "VS Code Tunnel is correctly forwarding to backend."}
