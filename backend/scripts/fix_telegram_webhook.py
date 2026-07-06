import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
PINGGY_URL = os.getenv("N8N_BASE_URL") # This should be the Pinggy URL from .env

async def check_and_fix():
    print(f"🤖 Checking Telegram Bot Webhook...")
    print(f"Token: {TOKEN[:10]}...{TOKEN[-5:]}")
    print(f"Target URL: {PINGGY_URL}")
    
    async with httpx.AsyncClient() as client:
        # 1. Get current info
        info_resp = await client.get(f"https://api.telegram.org/bot{TOKEN}/getWebhookInfo")
        info = info_resp.json()
        print(f"\n📡 Current Status:")
        print(info)
        
        # 2. Set new webhook
        # n8n's internal path for telegram test webhooks is usually /webhook-test/...
        # but the node handles that. We just need to make sure the base is right.
        # Actually, let's just clear it so n8n can re-register it cleanly.
        print(f"\n🛠️ Clearing old webhook so n8n can take over...")
        clear_resp = await client.get(f"https://api.telegram.org/bot{TOKEN}/deleteWebhook")
        print(clear_resp.json())
        
        print("\n✅ Webhook cleared. NOW do this:")
        print("1. Go to n8n.")
        print("2. Click 'Listen for test event' on the Telegram Trigger.")
        print("3. Telegram will now correctly link to your Pinggy tunnel.")

if __name__ == "__main__":
    asyncio.run(check_and_fix())
