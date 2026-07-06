import asyncio
import os
import sys

# Add backend/app directory to path
sys.path.append(os.path.join(os.getcwd(), "app"))

from dotenv import load_dotenv
load_dotenv("backend/.env")

import httpx

async def test_geofence():
    print("🚀 Testing Automation 06: Geofenced Check-in")
    
    # These are the exact hospital coords from geofencing.py
    payload = {
        "telegram_chat_id": "6019617155",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    
    # We trigger the backend directly (as if n8n forwarded the location)
    url = "https://exhaustively-overaggressive-kathrine.ngrok-free.dev/api/n8n/webhook/geofence-checkin"
    
    print(f"📡 Sending mock location to Backend...")
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        print(f"📥 Status: {resp.status_code}")
        print(f"📥 Response: {resp.json()}")

if __name__ == "__main__":
    asyncio.run(test_geofence())
