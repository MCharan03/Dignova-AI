import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

API_KEY = 'rnd_FAg6p70n0jjEkWlRKRSkAuZvYS29'
service_id = 'srv-d9684h4vikkc73bdu7j0'
url = f'https://api.render.com/v1/services/{service_id}/deploys'
headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Accept': 'application/json'
}
resp = requests.get(url, headers=headers)
try:
    print(resp.json())
except Exception as e:
    print("Error:", e)
