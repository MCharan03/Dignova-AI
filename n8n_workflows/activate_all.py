"""Activates all 7 Dignova workflows in n8n via REST API (PUT method)."""
import urllib.request
import json

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MzllMzBmZC1mMTNmLTQyZGEtYjBhOS05Mzc2Nzc0ODUxM2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQwMzQyMzUtNDU0Yy00NzBkLTg0YTYtODNiMjI3OWNjZjg2IiwiaWF0IjoxNzc5Mjk3OTQ1fQ.2dX4kwm1VTRyAcHyldowt7R2lNdbRki4Ku9FI2MiYaA"
H = {"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"}

# Get all workflows
req = urllib.request.Request("http://localhost:5678/api/v1/workflows?limit=50", headers=H)
data = json.loads(urllib.request.urlopen(req).read())

activated = 0
for wf in data.get("data", []):
    name = wf.get("name", "")
    if "Dignova" not in name:
        continue
    if wf.get("active", False):
        print("ALREADY ACTIVE: " + name)
        activated += 1
        continue
    wid = wf["id"]
    # Use PUT with active=true in the full workflow body
    body = json.dumps({
        "name": name,
        "nodes": wf.get("nodes", []),
        "connections": wf.get("connections", {}),
        "settings": wf.get("settings", {}),
        "active": True
    }).encode()
    req2 = urllib.request.Request(
        "http://localhost:5678/api/v1/workflows/" + wid,
        data=body, headers=H, method="PUT"
    )
    try:
        resp = urllib.request.urlopen(req2)
        result = json.loads(resp.read())
        if result.get("active"):
            print("ACTIVATED: " + name)
            activated += 1
        else:
            print("PUT OK but not active: " + name)
    except Exception as e:
        print("FAILED: " + name + " -> " + str(e))

print("Done. " + str(activated) + "/7 workflows active.")
