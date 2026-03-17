"""
Patches all Dignova workflows in n8n with real credential IDs via REST API.
Also updates the Telegram credential with the real bot token.
"""
import urllib.request
import json

N8N_API = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MzllMzBmZC1mMTNmLTQyZGEtYjBhOS05Mzc2Nzc0ODUxM2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiY2ViNGEyNTgtZjk0Ny00MWUxLWEzNTUtZDgyNzViNDYxYzI3IiwiaWF0IjoxNzczNzI0MDA5LCJleHAiOjE3Nzg5MDQwMDB9.jO7Zet6aw3y-_4cCNjY6izokum_4BWfchS4OkrAKXm4"
TELEGRAM_TOKEN = "8683777677:AAFScRxgvXdFgBvdJJuVKVBc_EN01g0-wOs"
HEADERS = {
    "X-N8N-API-KEY": N8N_API,
    "Content-Type": "application/json"
}
TG_CRED_ID   = "iv5NZHCR5wjspGfE"
SMTP_CRED_ID = "vWv6PscuS82yOnAn"
TG_CRED   = {"id": TG_CRED_ID,   "name": "Dignova Telegram Bot"}
SMTP_CRED = {"id": SMTP_CRED_ID, "name": "Dignova Gmail SMTP"}

def api_get(path):
    req = urllib.request.Request(f"http://localhost:5678/api/v1{path}", headers=HEADERS)
    return json.loads(urllib.request.urlopen(req).read())

def api_put(path, body):
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"http://localhost:5678/api/v1{path}",
        data=payload, headers=HEADERS, method="PUT"
    )
    return json.loads(urllib.request.urlopen(req).read())

def api_patch_cred(cred_id, body):
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"http://localhost:5678/api/v1/credentials/{cred_id}",
        data=payload, headers=HEADERS, method="PATCH"
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except Exception as e:
        return {"error": str(e)}

# ── STEP 1: Update Telegram credential with the real token ──────────────────
print("Updating Telegram credential with real bot token...")
result = api_patch_cred(TG_CRED_ID, {
    "name": "Dignova Telegram Bot",
    "data": {"accessToken": TELEGRAM_TOKEN}
})
if "error" in result:
    print(f"  WARNING: {result['error']} — token may need manual update in n8n UI")
else:
    print(f"  SUCCESS: Telegram token updated")

# Fetch all workflows
data = api_get("/workflows?limit=50")
workflows = data.get("data", [])
print(f"Found {len(workflows)} total workflows")

patched = 0
for wf in workflows:
    name = wf.get("name", "")
    if "Dignova" not in name:
        print(f"  SKIP: {name}")
        continue

    nodes = wf.get("nodes", [])
    changed = False
    for node in nodes:
        creds = node.setdefault("credentials", {})
        ntype = node.get("type", "")
        nname = node.get("name", "")

        if "telegram" in ntype.lower():
            creds["telegramApi"] = TG_CRED
            changed = True

        if "smtp" in ntype.lower() or "emailSend" in ntype or "email" in nname.lower():
            creds["smtp"] = SMTP_CRED
            changed = True

    if changed:
        try:
            api_put(f"/workflows/{wf['id']}", {
                "name":        wf["name"],
                "nodes":       nodes,
                "connections": wf.get("connections", {}),
                "settings":    wf.get("settings", {})
            })
            print(f"  PATCHED: {name}")
            patched += 1
        except Exception as e:
            print(f"  ERROR: {name} -> {e}")
    else:
        print(f"  NO CHANGE: {name}")

print(f"\nDone. Patched {patched} Dignova workflows.")
