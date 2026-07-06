import asyncio
import os
import sys

# Add the backend/app directory to the path so we can import services
sys.path.append(os.path.join(os.getcwd(), "app"))

# Mocking enough of the environment for the service to run
os.environ["N8N_BASE_URL"] = "http://localhost:5678"

from app.services.n8n_services import N8nService
import httpx

# Monkey-patch trigger_workflow to use webhook-test for easier testing
async def mocked_trigger_workflow(webhook_path, payload):
    url = f"{N8nService.BASE_URL}/webhook-test/{webhook_path}"
    print(f"📡 Sending request to {url}...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(url, json=payload)
            if response.status_code == 404:
                print(f"❌ 404 Not Found. Make sure the 'Webhook: Onboarding Trigger' node is waiting for a test event in n8n (click 'Listen for test event').")
                return False
            response.raise_for_status()
            print(f"✅ n8n trigger OK: {webhook_path}")
            return True
        except Exception as e:
            print(f"⚠️ n8n trigger failed ({webhook_path}): {e}")
            return False

N8nService.trigger_workflow = mocked_trigger_workflow

async def test_onboarding():
    print("🚀 Testing Automation 01: Onboarding")
    user_data = {
        "email": "mallelacharankumar@gmail.com",
        "name": "Charan Kumar",
        "phone": "9036205526",
        "telegram_chat_id": "123456789", # Mock chat ID
        "verify_url": "https://dignova-ai.vercel.app/verify?token=test_token"
    }
    
    success = await N8nService.trigger_onboarding(user_data)
    
    if success:
        print("✅ Onboarding trigger sent to n8n successfully.")
    else:
        print("❌ Failed to trigger onboarding. Is n8n running at http://localhost:5678?")

if __name__ == "__main__":
    asyncio.run(test_onboarding())
