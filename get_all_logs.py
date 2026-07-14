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
    'limit': 10
}
log_resp = requests.get(log_url, headers={'Authorization': f'Bearer {API_KEY}', 'Accept': 'application/json'}, params=params)
try:
    print(log_resp.json())
except Exception as e:
    print("Error:", e)
