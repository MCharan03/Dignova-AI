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
MODEL_ID = "gemini-2.0-flash-exp"

@router.websocket("/ws/internal-call")
async def internal_call_ws_handler(websocket: WebSocket):
    """
    Generic WebSocket handler for in-app 'Sentient' calling.
    Handles bidirectional audio streaming via Gemini Live API.
    """
    await websocket.accept()
    print("In-app Call WebSocket connected.")

    call_db_id = None
    persona = "TRIAGE" # Default

    # 1. Wait for 'init' event from App to get persona/call_id
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            if data['event'] == 'init':
                persona = data.get('persona', 'TRIAGE')
                call_db_id = data.get('call_id')
                print(f"Internal Stream started: Persona: {persona}, Call ID: {call_db_id}")
                break
    except Exception as e:
        print(f"Error waiting for init event: {e}")
        await websocket.close()
        return

    # 2. Configure Gemini with the correct persona
    orchestrator = SentientOrchestrator(persona=persona)
    system_instruction = orchestrator.PERSONA_PROMPTS.get(persona)
    
    config = {
        "system_instruction": system_instruction,
        "response_modalities": ["AUDIO"]
    }

    # 3. Define helper for DB updates with buffering
    transcription_buffer = []
    
    async def flush_transcript(cid):
        if not cid or not transcription_buffer: return
        try:
            text_to_save = "".join(transcription_buffer)
            transcription_buffer.clear()
            async with AsyncSessionLocal() as session:
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
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            print(f"Connected to Gemini Live API with persona: {persona}")

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
                            await flush_transcript(call_db_id)
                            break
                except Exception as e:
                    print(f"App to Gemini Error: {e}")
                    await flush_transcript(call_db_id)

            async def gemini_to_app():
                try:
                    async for message in session.receive():
                        if message.server_content and message.server_content.model_turn:
                            parts = message.server_content.model_turn.parts
                            for part in parts:
                                if part.text:
                                    print(f"Gemini [{persona}]: {part.text}")
                                    await update_transcript(call_db_id, f"ASSISTANT: {part.text}\n")
                                
                                if part.inline_data:
                                    pcm_chunk = part.inline_data.data
                                    # Convert Gemini PCM to app-friendly WAV/WebM
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
