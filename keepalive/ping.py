"""
Dignova Keep-Alive Ping
========================
Runs every 14 minutes via Render Cron to prevent free-tier services from sleeping.
Pings both the backend and n8n instance.
"""
import requests
import sys

TARGETS = [
    ("Backend",  "https://dignova-ai.onrender.com/docs"),
    ("n8n",      "https://dignova-n8n.onrender.com/healthz"),
]

def main():
    all_ok = True
    for name, url in TARGETS:
        try:
            r = requests.get(url, timeout=30)
            print(f"✅ {name}: {r.status_code}")
        except Exception as e:
            print(f"⚠️ {name}: {e}")
            all_ok = False

    if all_ok:
        print("All services alive.")
    else:
        print("Some services may be starting up.")

if __name__ == "__main__":
    main()
