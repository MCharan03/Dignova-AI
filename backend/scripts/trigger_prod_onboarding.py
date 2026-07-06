import httpx
import asyncio

async def trigger():
    url = "http://localhost:5678/webhook/dignova-onboarding"
    payload = {
        "body": {
            "email": "mallelacharankumar@gmail.com",
            "name": "Charan Kumar",
            "verify_url": "https://dignova.ai/verify"
        }
    }
    print(f"📡 Triggering production onboarding: {url}")
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        print(f"📥 Status: {resp.status_code}")
        if resp.status_code == 200:
            print("✅ Email sent successfully.")

if __name__ == "__main__":
    asyncio.run(trigger())
