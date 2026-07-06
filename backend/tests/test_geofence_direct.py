import asyncio
import httpx

async def test_geofence():
    print("🚀 Testing Automation 06: Geofenced Check-in (Direct Local)")
    
    payload = {
        "telegram_chat_id": "6019617155",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    
    # Trigger local backend directly
    url = "http://localhost:8000/api/n8n/webhook/geofence-checkin"
    
    print(f"📡 Sending mock location to {url}...")
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        print(f"📥 Status: {resp.status_code}")
        try:
            print(f"📥 Response: {resp.json()}")
        except:
            print(f"📥 Response Body: {resp.text}")

if __name__ == "__main__":
    asyncio.run(test_geofence())
