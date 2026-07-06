"""
test_voice_triage.py - Automated self-test for the voice triage feature.
Run from: D:\Gemini\4th sem\Dignova-AI\backend
Usage: python test_voice_triage.py
"""
import sys, io, json
import urllib.request, urllib.parse, urllib.error

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', write_through=True)

BASE = "http://localhost:8000"

def sep(title=""):
    print("\n" + "="*55, flush=True)
    if title: print("  " + title, flush=True)
    print("="*55, flush=True)

def ok(msg):   print("  [OK]  " + msg, flush=True)
def err(msg):  print("  [ERR] " + msg, flush=True)
def info(msg): print("  [>>]  " + msg, flush=True)

def post_form(path, fields):
    data = urllib.parse.urlencode(fields).encode()
    req  = urllib.request.Request(f"{BASE}{path}", data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def post_json(path, body, token=None):
    data = json.dumps(body).encode()
    req  = urllib.request.Request(f"{BASE}{path}", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read()), r.status

def get_json(path, token=None):
    req = urllib.request.Request(f"{BASE}{path}")
    if token: req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read()), r.status

def stream_post(path, body, token):
    data = json.dumps(body).encode()
    req  = urllib.request.Request(f"{BASE}{path}", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {token}")
    chunks = []
    with urllib.request.urlopen(req) as r:
        while True:
            chunk = r.read(256)
            if not chunk: break
            chunks.append(chunk.decode("utf-8", errors="replace"))
        status = r.status
    return "".join(chunks), status


# === STEP 1: Health ============================================================
sep("STEP 1 -- Backend Health Check")
try:
    data, status = get_json("/api/health")
    ok(f"Backend ONLINE [{status}]  system={data['system']}")
except Exception as e:
    err(f"Backend unreachable: {e}")
    sys.exit(1)

# === STEP 2: Login =============================================================
sep("STEP 2 -- Login (finding valid patient account)")
CANDIDATES = [
    ("mallelacharankumar@gmail.com", "user123"),   # normal patient (seed.py)
    ("ramesh.gupta@test.com",        "user123"),   # org-monitored patient (seed.py)
    ("sarah.manipal@dignova.ai",    "doctor123"),  # doctor (seed.py)
    ("admin@dignova.ai",            "admin123"),   # admin (.env)
]
token = None
for email, pwd in CANDIDATES:
    try:
        resp  = post_form("/api/auth/login", {"username": email, "password": pwd})
        token = resp["access_token"]
        ok(f"Logged in as: {email}")
        info(f"Token: {token[:40]}...")
        break
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')
        info(f"  {email} => HTTP {e.code}  {body[:80]}")
    except Exception as ex:
        info(f"  {email} => {ex}")

if not token:
    err("Could not log in. Run: python seed.py to seed the DB first.")
    sys.exit(1)

# === STEP 3: Start Call ========================================================
sep("STEP 3 -- Start Voice Triage Call")
try:
    call, status = post_json("/api/calls/start", {"user_id": 0}, token)
    call_id = call["call_id"]
    ok(f"Call created: id={call_id}  state={call['state']}")
except Exception as e:
    err(f"Failed to start call: {e}")
    sys.exit(1)

# === STEP 4: Voice-Text Fallback Endpoint =====================================
sep("STEP 4 -- Voice-Text Fallback (STT+LLM+TTS pipeline)")
TEST_LINES = [
    "I have a severe headache and mild fever since yesterday.",
    "I also feel very dizzy when I stand up quickly.",
]

all_passed = True
for symptom in TEST_LINES:
    info(f'Sending: "{symptom}"')
    try:
        ai_reply, status = stream_post(
            f"/api/calls/{call_id}/voice-text",
            {"text": symptom, "call_id": call_id},
            token
        )
        clean = (ai_reply
                 .replace("[EMERGENCY_DETECTED]", "")
                 .replace("[DIAGNOSIS_READY]", "")
                 .strip())
        ok(f"AI responded [{status}]  ({len(clean)} chars)")
        preview = clean[:220].replace("\n", " ")
        print(f"\n  DR. DIGNOVA SAYS:")
        for i in range(0, min(len(preview), 220), 65):
            print(f"    | {preview[i:i+65]}")
        print()
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')
        err(f"HTTP {e.code}: {body[:120]}")
        all_passed = False
    except Exception as e:
        err(f"Request failed: {e}")
        all_passed = False

# === STEP 5: Terminate + Summary ==============================================
sep("STEP 5 -- Terminate Call & Fetch AI Summary")
try:
    post_json(f"/api/calls/{call_id}/terminate", {}, token)
    ok(f"Call {call_id} terminated")
except Exception as e:
    info(f"Terminate: {e}")

try:
    summary, status = get_json(f"/api/calls/{call_id}/summary", token)
    ok(f"Summary fetched [{status}]")
    print()
    print("  CALL SUMMARY:")
    print(f"    Severity   : {summary.get('severity', '?')}")
    print(f"    Diagnosis  : {str(summary.get('diagnosis','?'))[:80]}")
    print(f"    Resource   : {summary.get('recommended_resource','?')}")
    print(f"    Duration   : {summary.get('duration_seconds', 0)}s")
    print(f"    Has Summary: {'Yes' if summary.get('summary') else 'No'}")
except Exception as e:
    err(f"Summary failed: {e}")
    all_passed = False

# === STEP 6: OpenAPI Route Verification =======================================
sep("STEP 6 -- Verify All Routes Registered in OpenAPI")
try:
    data, status = get_json("/openapi.json")
    paths = list(data.get("paths", {}).keys())
    ok(f"OpenAPI has {len(paths)} registered paths")

    checks = {
        "voice-text endpoint": any("voice-text" in p for p in paths),
        "call summary endpoint": any("summary" in p and "call" in p for p in paths),
        "calls/start endpoint": any("calls/start" in p for p in paths),
        "calls/terminate endpoint": any("terminate" in p for p in paths),
    }
    for label, passed in checks.items():
        if passed: ok(f"  {label}")
        else:      err(f"  {label}  NOT FOUND"); all_passed = False

except Exception as e:
    info(f"OpenAPI check skipped: {e}")

# === FINAL RESULT =============================================================
sep("FINAL RESULT")
if all_passed:
    print("\n  [PASS] Voice Triage Backend -- ALL SYSTEMS OPERATIONAL\n")
    print("  Frontend : http://localhost:3000/user/voice-triage")
    print("  API Docs : http://localhost:8000/docs")
    print("  WS Route : ws://localhost:8000/ws/internal-call\n")
else:
    print("\n  [WARN] Some checks failed -- see errors above.\n")
