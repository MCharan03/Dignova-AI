import urllib.request
import json
import re
import os
import sys
from dotenv import load_dotenv

def patch_now(n8n_url, backend_url):
    print(f"ULTIMATE HARDENING (Nervous System V6 - DIRECT TELEGRAM)...")
    load_dotenv("backend/.env")
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MzllMzBmZC1mMTNmLTQyZGEtYjBhOS05Mzc2Nzc0ODUxM2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQwMzQyMzUtNDU0Yy00NzBkLTg0YTYtODNiMjI3OWNjZjg2IiwiaWF0IjoxNzc5Mjk3OTQ1fQ.2dX4kwm1VTRyAcHyldowt7R2lNdbRki4Ku9FI2MiYaA"
    H = {"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"}
    
    try:
        # 1. Find ID
        list_req = urllib.request.Request("http://localhost:5678/api/v1/workflows?limit=50", headers=H)
        list_data = json.loads(urllib.request.urlopen(list_req).read())
        wf_id = next(w['id'] for w in list_data['data'] if w['name'] == "Dignova Sentient Master Unified")

        # 2. Fetch
        req = urllib.request.Request(f"http://localhost:5678/api/v1/workflows/{wf_id}", headers=H)
        wf = json.loads(urllib.request.urlopen(req).read())

        nodes = wf['nodes']
        connections = wf['connections']
        
        # 3. Clean Nodes (Remove old triage/response)
        nodes = [n for n in nodes if n['name'] not in ["[02] Backend: Triage", "[02] Telegram: Response"]]
        
        # 4. Add Triage Node
        triage_node = {
            "parameters": {
                "method": "POST",
                "url": "http://127.0.0.1:8000/api/n8n/webhook/triage",
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"session_id\": \"{{ $node['[02] Normalize'].json.chat_id }}\",\n  \"message\": \"{{ $node['[02] Normalize'].json.text }}\",\n  \"source\": \"Telegram\"\n}",
                "options": {}
            },
            "name": "[02] Backend: Triage",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 3,
            "position": [700, 300]
        }
        nodes.append(triage_node)

        # 5. Add DIRECT Telegram Response (Via HTTP Request to bypass n8n credentials)
        resp_node = {
            "parameters": {
                "method": "POST",
                "url": f"https://api.telegram.org/bot{token}/sendMessage",
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={\n  \"chat_id\": \"{{ $node['[02] Normalize'].json.chat_id }}\",\n  \"text\": \"{{ $json.response }}\",\n  \"parse_mode\": \"Markdown\"\n}",
                "options": {}
            },
            "name": "[02] Telegram: Response",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 3,
            "position": [950, 300]
        }
        nodes.append(resp_node)

        # 6. Connections
        if "[02] Is Button?" not in connections: connections["[02] Is Button?"] = {"main": [[], []]}
        while len(connections["[02] Is Button?"]["main"]) < 2: connections["[02] Is Button?"]["main"].append([])
        connections["[02] Is Button?"]["main"][1] = [{ "node": "[02] Backend: Triage", "type": "main", "index": 0 }]
        connections["[02] Backend: Triage"] = {"main": [[{ "node": "[02] Telegram: Response", "type": "main", "index": 0 }]]}

        # 7. Push
        payload = {
            "name": wf['name'],
            "nodes": nodes,
            "connections": connections,
            "settings": {"executionOrder": "v1", "callerPolicy": "workflowsFromSameOwner"}
        }
        update_req = urllib.request.Request(f"http://localhost:5678/api/v1/workflows/{wf_id}", data=json.dumps(payload).encode(), headers=H, method="PUT")
        urllib.request.urlopen(update_req)
        
        act_req = urllib.request.Request(f"http://localhost:5678/api/v1/workflows/{wf_id}/activate", data=b"{}", headers=H, method="POST")
        urllib.request.urlopen(act_req)
        
        # 8. Set Webhook
        webhook_url = f"{n8n_url}/webhook/{wf_id}/tg-webhook/tg-force-hub"
        urllib.request.urlopen(f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}")
        
        print("✅ SYSTEM RE-PAVED (V6). DIRECT API LINK ACTIVE.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    patch_now(sys.argv[1], sys.argv[2])
