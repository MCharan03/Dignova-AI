import asyncio
import os
import json
import base64
import websockets
from pydub import AudioSegment

async def run_test():
    uri = "wss://dignova-ai.onrender.com/ws/internal-call"
    print(f"Connecting to production WebSocket: {uri}...")
    
    # Load and convert synthesized audio using pydub
    audio = AudioSegment.from_file("hello_cold.wav", format="wav")
    audio = audio.set_frame_rate(16000).set_sample_width(2).set_channels(1)
    raw_pcm = audio.raw_data
    
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

    async with websockets.connect(uri) as websocket:
        print("Connected!")
        
        # Send init event
        init_event = {'event': 'init', 'persona': 'TRIAGE', 'call_id': 30}
        print("Sending init...")
        await websocket.send(json.dumps(init_event))
        
        async def listen():
            try:
                async for message in websocket:
                    data = json.loads(message)
                    ev = data.get('event')
                    if ev == 'transcript':
                        print(f"\n[DOCTOR TRANSCRIPT]: {data.get('text')}\n")
                    elif ev == 'audio':
                        # print(".")
                        pass
                    elif ev == 'error':
                        print(f"[Error Event] {data.get('message')}")
                    else:
                        print(f"[Event: {ev}] {data}")
            except Exception as e:
                print("Listen failed:", e)

        listen_task = asyncio.create_task(listen())
        
        # Stream audio chunks
        chunk_size = 4000
        for i in range(0, len(raw_pcm), chunk_size):
            chunk = raw_pcm[i:i+chunk_size]
            b64_chunk = base64.b64encode(chunk).decode("utf-8")
            await websocket.send(json.dumps({
                "event": "audio",
                "payload": b64_chunk
            }))
            await asyncio.sleep(0.125)
            
        print("Voice streamed. Streaming silence to trigger response...")
        silent_chunk = b'\x00' * chunk_size
        b64_silence = base64.b64encode(silent_chunk).decode("utf-8")
        for _ in range(15):
            await websocket.send(json.dumps({
                "event": "audio",
                "payload": b64_silence
            }))
            await asyncio.sleep(0.125)
            
        print("Silence streamed. Waiting for response...")
        await asyncio.sleep(12)
        listen_task.cancel()

asyncio.run(run_test())
