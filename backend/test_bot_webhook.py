import httpx
import asyncio
import json

async def test_bot_webhook():
    url = "http://localhost:8000/api/n8n/webhook/triage"
    
    # Simulate a Telegram message
    payload = {
        "session_id": "telegram_user_123",
        "message": "Hi, I have a severe headache and I am feeling dizzy.",
        "source": "Telegram"
    }
    
    print(f"--- Testing Telegram Webhook ---")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("Response from AI Bot:")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Connection failed: {e}")

    # Simulate a WhatsApp message (using a phone number as session_id)
    payload_wa = {
        "session_id": "+919876543210",
        "message": "How can I book an appointment?",
        "source": "WhatsApp"
    }
    
    print(f"\n--- Testing WhatsApp Webhook ---")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload_wa)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("Response from AI Bot:")
                print(json.dumps(response.json(), indent=2))
        except Exception as e:
            print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_bot_webhook())
