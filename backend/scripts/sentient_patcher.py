import os
import json
import httpx
import asyncio
from dotenv import load_dotenv

async def patch_system(n8n_url: str, backend_url: str):
    print(f"\n[PATCHER] Starting Self-Healing Sequence...")
    load_dotenv("backend/.env")
    
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    env_path = "backend/.env"
    
    # 1. Update .env
    print(f"[PATCHER] Updating .env with new tunnels...")
    with open(env_path, "r") as f:
        lines = f.readlines()
        
    new_lines = []
    found_n8n = found_back = False
    for line in lines:
        if line.startswith("N8N_BASE_URL="):
            new_lines.append(f"N8N_BASE_URL={n8n_url}\n")
            found_n8n = True
        elif line.startswith("BACKEND_URL="):
            new_lines.append(f"BACKEND_URL={backend_url}\n")
            found_back = True
        else:
            new_lines.append(line)
            
    if not found_n8n: new_lines.append(f"N8N_BASE_URL={n8n_url}\n")
    if not found_back: new_lines.append(f"BACKEND_URL={backend_url}\n")
    
    with open(env_path, "w") as f:
        f.writelines(new_lines)

    # 2. Sync with n8n API (Push live & Set Webhook)
    print(f"[PATCHER] Syncing live workflows with n8n API...")
    n8n_api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MzllMzBmZC1mMTNmLTQyZGEtYjBhOS05Mzc2Nzc0ODUxM2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmQwMzQyMzUtNDU0Yy00NzBkLTg0YTYtODNiMjI3OWNjZjg2IiwiaWF0IjoxNzc5Mjk3OTQ1fQ.2dX4kwm1VTRyAcHyldowt7R2lNdbRki4Ku9FI2MiYaA"
    headers = {
        "X-N8N-API-KEY": n8n_api_key,
        "Content-Type": "application/json"
    }
    
    # Wait for n8n to be ready
    print(f"[PATCHER] Waiting for n8n engine to initialize...")
    async with httpx.AsyncClient() as client:
        for i in range(15):
            try:
                check = await client.get(f"http://localhost:5678/healthz", timeout=2.0)
                if check.status_code == 200:
                    print(f"[PATCHER] n8n Engine Online. 🚀")
                    break
            except:
                pass
            await asyncio.sleep(2)
        
        # Target Master Workflow
        master_wf_path = "n8n_workflows/Dignova_Sentient_Master_Unified.json"
        if os.path.exists(master_wf_path):
            with open(master_wf_path, 'r', encoding='utf-8') as f:
                wf_data = json.load(f)
                
            try:
                # Find the ID
                wf_list_resp = await client.get(f"http://localhost:5678/api/v1/workflows?limit=50", headers=headers)
                workflows = wf_list_resp.json().get("data", [])
                target_id = None
                for w in workflows:
                    if w.get("name") == "Dignova Sentient Master Unified":
                        target_id = w.get("id")
                        break
                
                if target_id:
                    nodes = wf_data.get("nodes", [])
                    connections = wf_data.get("connections", {})
                    
                    # Standardize names for URL predictability
                    for node in nodes:
                        if node.get("name") == "[02] Telegram Webhook":
                            node["name"] = "tg-webhook"
                            node["parameters"]["path"] = "tg-force-hub"
                    if "[02] Telegram Webhook" in connections:
                        connections["tg-webhook"] = connections.pop("[02] Telegram Webhook")

                    # Inject triage
                    is_button_node = next((n for n in nodes if n.get("name") == "[02] Is Button?"), None)
                    if is_button_node:
                        # 1. Add Typing Indicator Node
                        typing_node_name = "[02] Telegram: Typing"
                        if not any(n.get("name") == typing_node_name for n in nodes):
                            nodes.append({
                                "parameters": {
                                    "method": "POST",
                                    "url": f"https://api.telegram.org/bot{token}/sendChatAction",
                                    "sendBody": True,
                                    "specifyBody": "json",
                                    "jsonBody": "={\n  \"chat_id\": \"{{ $node['[02] Normalize'].json.chat_id }}\",\n  \"action\": \"typing\"\n}",
                                    "options": {}
                                },
                                "name": typing_node_name,
                                "type": "n8n-nodes-base.httpRequest",
                                "typeVersion": 3,
                                "position": [600, 300],
                                "id": "tg-typing"
                            })

                        triage_node_name = "[02] Backend: Triage"
                        if not any(n.get("name") == triage_node_name for n in nodes):
                            nodes.append({
                                "parameters": {
                                    "method": "POST",
                                    "url": f"{backend_url}/api/n8n/webhook/triage",
                                    "sendBody": True,
                                    "bodyParameters": {
                                        "parameters": [
                                            { "name": "session_id", "value": "={{$node[\"[02] Normalize\"].json.chat_id.toString()}}" },
                                            { "name": "message", "value": "={{$node[\"[02] Normalize\"].json.text}}" },
                                            { "name": "source", "value": "Telegram" }
                                        ]
                                    }
                                },
                                "name": triage_node_name,
                                "type": "n8n-nodes-base.httpRequest",
                                "typeVersion": 3,
                                "position": [800, 300],
                                "id": "backend-triage"
                            })
                            resp_node_name = "[02] Telegram: Response"
                            if not any(n.get("name") == resp_node_name for n in nodes):
                                nodes.append({
                                    "parameters": {
                                        "method": "POST",
                                        "url": f"https://api.telegram.org/bot{token}/sendMessage",
                                        "sendBody": True,
                                        "specifyBody": "json",
                                        "jsonBody": "={\n  \"chat_id\": \"{{ $node['[02] Normalize'].json.chat_id }}\",\n  \"text\": \"{{ $json.response }}\",\n  \"parse_mode\": \"Markdown\"\n}",
                                        "options": {}
                                    },
                                    "name": resp_node_name,
                                    "type": "n8n-nodes-base.httpRequest",
                                    "typeVersion": 3,
                                    "position": [1050, 300],
                                    "id": "tg-response"
                                })
                            
                            if "[02] Is Button?" not in connections: connections["[02] Is Button?"] = {"main": [[], []]}
                            while len(connections["[02] Is Button?"]["main"]) < 2: connections["[02] Is Button?"]["main"].append([])
                            
                            # Re-wire: Is Button (False) -> Typing -> Triage -> Response
                            connections["[02] Is Button?"]["main"][1] = [{ "node": typing_node_name, "type": "main", "index": 0 }]
                            connections[typing_node_name] = {"main": [[{ "node": triage_node_name, "type": "main", "index": 0 }]]}
                            connections[triage_node_name] = {"main": [[{ "node": resp_node_name, "type": "main", "index": 0 }]]}

                    # Push live
                    payload = {
                        "name": wf_data.get("name"),
                        "nodes": nodes,
                        "connections": connections,
                        "settings": {"executionOrder": "v1", "callerPolicy": "workflowsFromSameOwner"}
                    }
                    await client.put(f"http://localhost:5678/api/v1/workflows/{target_id}", json=payload, headers=headers)
                    print(f"[PATCHER] ✅ Live Workflow Sync Complete: {target_id}")

                    # REGISTER Telegram Webhook with FULL path
                    webhook_url = f"{n8n_url}/webhook/{target_id}/tg-webhook/tg-force-hub"
                    try:
                        await client.get(f"https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}")
                        print(f"[PATCHER] Telegram Webhook Registered: {webhook_url}")
                    except Exception as e:
                        print(f"[PATCHER] ❌ Telegram Registration Failed: {e}")
                else:
                    print(f"[PATCHER] ⚠️ Master Workflow not found in n8n.")
            except Exception as e:
                print(f"[PATCHER] ❌ n8n API Sync Failed: {e}")

    print(f"[PATCHER] System health restored. ✨\n")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python sentient_patcher.py <n8n_url> <backend_url>")
        sys.exit(1)
    asyncio.run(patch_system(sys.argv[1], sys.argv[2]))
