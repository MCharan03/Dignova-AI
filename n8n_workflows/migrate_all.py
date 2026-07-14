import json
import requests

LOCAL_N8N = "http://127.0.0.1:5678"
CLOUD_N8N = "https://dignova-n8n.onrender.com"

LOCAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MzllMzBmZC1mMTNmLTQyZGEtYjBhOS05Mzc2Nzc0ODUxM2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiY2UwZGI2M2MtNzc5Ny00Mzk3LTgxNTUtMGFiMzJhMjYxZWRhIiwiaWF0IjoxNzgzNDA2MTI0fQ.swqyPACzlQFeMXZDRZIij9Kjgw4nhgIcnNKshtFZE-o"
CLOUD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NjVjZWVkZS1mNzljLTRiM2YtODA5YS0zOTdhYjFhMDAwNTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiN2U1ZDI5ZjMtZWZmOC00NTQzLThjZDUtMjJhMjQ1NWE0ZmFmIiwiaWF0IjoxNzgzNDA1OTcxfQ.AhpYAsciPQuxHNG7yBO9Q9jZcJzgPcJ041KqaNJQLHE"

REPLACEMENTS = {
    "http://localhost:8000": "https://dignova-ai.onrender.com",
    "http://127.0.0.1:8000": "https://dignova-ai.onrender.com",
    "https://dignova-ai.vercel.app": "https://frontend-six-rouge-14.vercel.app"
}

import re

def clean_workflow(wf):
    # Recursively replace strings in the JSON structure
    wf_str = json.dumps(wf)
    
    # 1. Replace standard local endpoints
    for old, new in REPLACEMENTS.items():
        wf_str = wf_str.replace(old, new)
        
    # 2. Match any localtunnel URL (e.g. https://xxxx.loca.lt) and point it to the production backend
    wf_str = re.sub(r'https?://[a-zA-Z0-9-]+\.loca\.lt', 'https://dignova-ai.onrender.com', wf_str)
    
    cleaned = json.loads(wf_str)
    
    # Structure the payload for n8n workflow creation/update API
    payload = {
        "name": cleaned.get("name"),
        "nodes": cleaned.get("nodes", []),
        "connections": cleaned.get("connections", {}),
        "settings": {}
    }
    return payload

def migrate():
    local_headers = {"X-N8N-API-KEY": LOCAL_KEY}
    cloud_headers = {"X-N8N-API-KEY": CLOUD_KEY, "Content-Type": "application/json"}

    print("Fetching local workflows...")
    resp = requests.get(f"{LOCAL_N8N}/api/v1/workflows?limit=100", headers=local_headers)
    if resp.status_code != 200:
        print(f"Error fetching local workflows: {resp.status_code} - {resp.text}")
        return
    local_workflows = resp.json().get("data", [])
    print(f"Found {len(local_workflows)} workflows on local n8n.\n")

    print("Fetching existing cloud workflows to check for duplicates...")
    resp = requests.get(f"{CLOUD_N8N}/api/v1/workflows?limit=100", headers=cloud_headers)
    cloud_workflows = resp.json().get("data", []) if resp.status_code == 200 else []
    cloud_map = {wf["name"]: wf["id"] for wf in cloud_workflows}

    for wf_summary in local_workflows:
        wf_id = wf_summary["id"]
        wf_name = wf_summary["name"]
        print(f"Migrating: '{wf_name}' (local ID: {wf_id})")

        # Fetch detailed workflow from local
        resp = requests.get(f"{LOCAL_N8N}/api/v1/workflows/{wf_id}", headers=local_headers)
        if resp.status_code != 200:
            print(f"  Failed to fetch local workflow details for '{wf_name}': {resp.status_code}")
            continue
        
        wf_detail = resp.json()
        payload = clean_workflow(wf_detail)

        # Check if it already exists on cloud by name
        if wf_name in cloud_map:
            cloud_id = cloud_map[wf_name]
            print(f"  Already exists on cloud (cloud ID: {cloud_id}). Updating...")
            resp = requests.put(f"{CLOUD_N8N}/api/v1/workflows/{cloud_id}", json=payload, headers=cloud_headers)
        else:
            print(f"  Creating new workflow on cloud...")
            resp = requests.post(f"{CLOUD_N8N}/api/v1/workflows", json=payload, headers=cloud_headers)
        
        if resp.status_code in [200, 201]:
            print(f"  SUCCESS: '{wf_name}' migrated successfully.")
        else:
            print(f"  FAILED: '{wf_name}': {resp.status_code} - {resp.text}")
        print("-" * 40)

if __name__ == "__main__":
    migrate()
