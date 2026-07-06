import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TUNNEL_URL = "https://jolly-puma-33.loca.lt" # Your active localtunnel
PATH = "tg-force-hub"
TARGET_URL = f"{TUNNEL_URL}/webhook/{PATH}"


async def force_set():
    print(f"🛠️ Force-Setting Webhook...")
    print(f"Target: {TARGET_URL}")
    
    async with httpx.AsyncClient() as client:
        # Set the webhook
        resp = await client.get(f"https://api.telegram.org/bot{TOKEN}/setWebhook?url={TARGET_URL}")
        print(resp.json())
        
        # Verify
        info = await client.get(f"https://api.telegram.org/bot{TOKEN}/getWebhookInfo")
        print("\n📡 Final Status:")
        print(info.json())

if __name__ == "__main__":
    asyncio.run(force_set())
