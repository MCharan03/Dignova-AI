import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

API_KEY = 'rnd_FAg6p70n0jjEkWlRKRSkAuZvYS29'
service_id = 'srv-d9684h4vikkc73bdu7j0'
owner_id = 'tea-d6sij2fdiees73cdemug'
log_url = 'https://api.render.com/v1/logs'
params = {
    'ownerId': owner_id,
    'resource': service_id,
    'limit': 150
}
log_resp = requests.get(log_url, headers={'Authorization': f'Bearer {API_KEY}', 'Accept': 'application/json'}, params=params)
try:
    resp_data = log_resp.json()
    logs = resp_data.get('logs', [])
    print("--- WebSocket / Internal Call Logs ---")
    for entry in reversed(logs):
        if isinstance(entry, dict):
            msg = entry.get('message', '')
            timestamp = entry.get('timestamp')
            msg_lower = msg.lower()
            if any(k in msg_lower for k in ["ws", "twilio", "error", "exception", "live", "disconnect", "connect", "audio", "gemini"]):
                if "/api/notifications/stream" not in msg and "/api/awareness/context" not in msg:
                    print(f"[{timestamp}] {msg}")
except Exception as e:
    print("Error:", e)
