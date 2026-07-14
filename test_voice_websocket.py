import asyncio
import websockets
import json
import base64
import sys
from pydub import AudioSegment

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

async def test_websocket():
    uri = "ws://localhost:8000/ws/internal-call"
    print(f"Connecting to WebSocket at {uri}...")
    try:
        # Load and convert synthesized audio using pydub
        print("Loading test audio file (hello_cold.wav)...")
        audio = AudioSegment.from_file("D:\\Gemini\\Dignova-AI\\hello_cold.wav")
        # Standardize to 16kHz, 16-bit, Mono for Gemini
        audio = audio.set_frame_rate(16000).set_sample_width(2).set_channels(1)
        raw_pcm = audio.raw_data
        print(f"Total PCM bytes: {len(raw_pcm)}")
        
        async with websockets.connect(uri) as websocket:
            print("Successfully connected to WebSocket!")
            
            # Send the init payload
            init_payload = {
                "event": "init",
                "persona": "TRIAGE",
                "call_id": 30
            }
            print("Sending init event:", init_payload)
            await websocket.send(json.dumps(init_payload))
            
            # Wait 2 seconds (shows that connection is silent)
            print("Waiting 2 seconds (silence)...")
            await asyncio.sleep(2)
            
            # Stream the audio in chunks of 4000 bytes (~125ms of audio at 16kHz 16-bit mono)
            chunk_size = 4000
            print("Streaming audio chunks (simulating patient speaking 'Hello Doctor, I have a cold')...")
            
            async def listen_loop():
                try:
                    while True:
                        response = await websocket.recv()
                        data = json.loads(response)
                        event = data.get("event")
                        if event == "transcript":
                            print(f"\n[AI Transcript] {data.get('role').upper()}: {data.get('text')}")
                        elif event == "audio":
                            payload_len = len(data.get("payload", ""))
                            print(f"🔊 Received doctor audio chunk: {payload_len} bytes")
                        elif event == "debug":
                            print(f"🛠️ [Server Debug] {data.get('message')}")
                        elif event == "error":
                            print(f"\n[Error Event] {data.get('message')}")
                except websockets.exceptions.ConnectionClosed:
                    print("\nConnection closed by server.")
                except Exception as ex:
                    print("Listen error:", ex)

            # Start listen task
            listen_task = asyncio.create_task(listen_loop())
            
            # Send chunks
            for i in range(0, len(raw_pcm), chunk_size):
                chunk = raw_pcm[i:i+chunk_size]
                # Encode chunk to base64
                b64_chunk = base64.b64encode(chunk).decode("utf-8")
                # Send event: audio
                await websocket.send(json.dumps({
                    "event": "audio",
                    "payload": b64_chunk
                }))
                # Sleep to simulate real-time streaming
                await asyncio.sleep(0.125)
                
            print("Finished streaming voice. Streaming silence to trigger VAD...")
            silent_chunk = b'\x00' * chunk_size
            b64_silence = base64.b64encode(silent_chunk).decode("utf-8")
            for _ in range(15):
                await websocket.send(json.dumps({
                    "event": "audio",
                    "payload": b64_silence
                }))
                await asyncio.sleep(0.125)
                
            print("Finished streaming silence. Waiting for final response...")
            await asyncio.sleep(8)
            
            # Cancel listening
            listen_task.cancel()
            
    except Exception as e:
        print("WebSocket Connection/Test Error:", e)

asyncio.run(test_websocket())
