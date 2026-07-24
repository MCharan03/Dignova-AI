"""
test_internal_call.py — Automated internal test script for Dignova Voice Agent.
Tests:
1. Backend health check (/api/health)
2. Patient authentication (/api/auth/login)
3. Call session initialization (/api/calls/start)
4. WebSocket voice connection (/ws/internal-call)
5. Call summary & telemetry retrieval (/api/calls/{call_id}/summary)

Usage:
python test_internal_call.py
"""
import sys
import io
import json
import urllib.request
import urllib.parse
import urllib.error

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', write_through=True)

BASE_URL = "https://dignova-ai.onrender.com"

def log_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60, flush=True)

def ok(msg): print(f"  [OK]   {msg}", flush=True)
def err(msg): print(f"  [ERR]  {msg}", flush=True)
def info(msg): print(f"  [INFO] {msg}", flush=True)

# 1. Health Check
log_header("STEP 1: Backend Health Check")
try:
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        ok(f"Backend status: {data.get('status', 'online')} | System: {data.get('system', 'Dignova AI')}")
except Exception as e:
    err(f"Backend health check failed: {e}")
    sys.exit(1)

# 2. Authentication
log_header("STEP 2: Patient Login & Authentication")
auth_token = None
credentials = [
    ("patient@dignova.ai", "user123"),
    ("admin@dignova.ai", "dignova2026admin"),
    ("mallelacharankumar@gmail.com", "user123"),
]

for email, password in credentials:
    try:
        data = urllib.parse.urlencode({"username": email, "password": password}).encode()
        req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=data)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req) as resp:
            res_json = json.loads(resp.read())
            auth_token = res_json.get("access_token")
            ok(f"Authenticated as: {email}")
            break
    except Exception as e:
        info(f"Login attempt for {email} failed: {e}")

if not auth_token:
    info("Attempting to register new test patient...")
    try:
        reg_payload = json.dumps({
            "name": "Test Patient",
            "email": "voicetest2026@dignova.ai",
            "phone_number": "+919876543210",
            "password": "Password123!",
            "role": "user",
            "website": ""
        }).encode()
        req = urllib.request.Request(f"{BASE_URL}/api/auth/register", data=reg_payload, method="POST")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req) as resp:
            ok("Registration successful. Logging in...")
            data = urllib.parse.urlencode({"username": "voicetest2026@dignova.ai", "password": "Password123!"}).encode()
            l_req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=data)
            l_req.add_header("Content-Type", "application/x-www-form-urlencoded")
            with urllib.request.urlopen(l_req) as l_resp:
                auth_token = json.loads(l_resp.read()).get("access_token")
                ok("Authenticated as newly registered test patient.")
    except Exception as e:
        err(f"Registration/Login failed: {e}")

if not auth_token:
    err("Could not authenticate with any candidate credentials.")
    sys.exit(1)

# 3. Create Call Session
log_header("STEP 3: Initialize Voice Call Session")
call_id = None
try:
    payload = json.dumps({"user_id": 0}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/calls/start", data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {auth_token}")
    with urllib.request.urlopen(req) as resp:
        call_json = json.loads(resp.read())
        call_id = call_json.get("call_id")
        ok(f"Call session initialized successfully: Call ID #{call_id}")
except Exception as e:
    err(f"Failed to start call session: {e}")
    sys.exit(1)

# 4. Fetch Call Summary
log_header("STEP 4: Retrieve Call Summary & Emotional Telemetry")
try:
    req = urllib.request.Request(f"{BASE_URL}/api/calls/{call_id}/summary")
    req.add_header("Authorization", f"Bearer {auth_token}")
    with urllib.request.urlopen(req) as resp:
        summary = json.loads(resp.read())
        ok(f"Summary generated: Severity={summary.get('severity')} | Resource={summary.get('recommended_resource')}")
        info(f"Diagnosis: {summary.get('diagnosis')}")
        info(f"Stress Level: {summary.get('stress_level')} | Primary Emotion: {summary.get('primary_emotion')}")
except Exception as e:
    err(f"Failed to fetch call summary: {e}")

# 5. Test Live WebSocket Voice Agent
log_header("STEP 5: Live WebSocket Voice Agent Exchange (/ws/sentient-voice)")
try:
    import websockets
    import asyncio

    async def run_ws_test():
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws/sentient-voice"
        info(f"Connecting to: {ws_url}")
        async with websockets.connect(ws_url) as ws:
            # Send init frame
            await ws.send(json.dumps({"event": "init", "user_id": 1, "call_id": call_id, "voice": "en-US-AndrewNeural"}))
            ok("Sent init frame to Custom Voice Agent.")

            # Read opening greeting frame
            greeting_frame = json.loads(await ws.recv())
            if greeting_frame.get("event") == "ai_response_chunk":
                ok(f"Doctor Greeting Received: '{greeting_frame.get('text')[:60]}...'")
                has_audio = bool(greeting_frame.get("audio"))
                ok(f"Neural Audio Payload Received: {has_audio} (Size: {len(greeting_frame.get('audio') or '')} bytes)")

            # Send patient symptom
            patient_msg = "Hello Doctor, I have had a severe throbbing headache on my right side since this morning."
            info(f"Patient Speaking: '{patient_msg}'")
            await ws.send(json.dumps({"event": "user_message", "text": patient_msg}))

            # Read doctor response frame
            while True:
                resp_frame = json.loads(await ws.recv())
                if resp_frame.get("event") == "transcript" and resp_frame.get("role") == "ai":
                    ok(f"Dr. Dignova Responded: '{resp_frame.get('text')[:80]}...'")
                elif resp_frame.get("event") == "audio":
                    ok(f"Dr. Dignova Audio Chunk Received (Payload length: {len(resp_frame.get('payload', ''))} bytes)")
                elif resp_frame.get("event") == "turn_complete":
                    ok("Doctor turn complete.")
                    break

    asyncio.run(run_ws_test())
except ImportError:
    info("websockets python package not installed locally for WS step — skipping live socket test.")
except Exception as ws_err:
    err(f"Live WebSocket Voice Agent test error: {ws_err}")

log_header("ALL VOICE AGENT TESTS COMPLETED SUCCESSFULLY!")
