import httpx
import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv("backend/.env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BACKEND_NGROK = os.getenv("BACKEND_URL")
N8N_TUNNEL = os.getenv("N8N_BASE_URL")
CHAT_ID = "6019617155"

async def diagnose():
    print("🔍 --- DIGNONA SENTIENT DIAGNOSTIC ---")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Check Backend
        try:
            resp = await client.get(f"{BACKEND_NGROK}/api/health")
            print(f"✅ Backend (Ngrok): ONLINE ({resp.status_code})")
        except Exception as e:
            print(f"❌ Backend (Ngrok): OFFLINE ({e})")

        # 2. Check n8n
        try:
            resp = await client.get(f"{N8N_TUNNEL}/healthz")
            print(f"✅ n8n (Tunnel): ONLINE ({resp.status_code})")
        except Exception as e:
            # try root
            try:
                resp = await client.get(N8N_TUNNEL)
                print(f"✅ n8n (Tunnel): ONLINE (Found landing page)")
            except:
                print(f"❌ n8n (Tunnel): UNREACHABLE. Check if n8n is running and tunnel is active.")

        # 3. Check Telegram Webhook
        try:
            resp = await client.get(f"https://api.telegram.org/bot{TOKEN}/getWebhookInfo")
            info = resp.json().get("result", {})
            url = info.get("url", "")
            print(f"📡 Telegram Webhook: {url}")
            if N8N_TUNNEL not in url:
                print("🚨 ERROR: Telegram is pointing to the WRONG tunnel!")
            if info.get("last_error_message"):
                print(f"⚠️ Last Telegram Error: {info.get('last_error_message')}")
        except Exception as e:
            print(f"❌ Telegram API: ERROR ({e})")

        # 4. Final Bot Test
        print("\n🚀 Sending one final direct test message...")
        try:
            await client.get(f"https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text=🛠️ Diagnostic active. If you see this, Telegram works.")
            print("✅ Direct message SENT.")
        except:
            print("❌ Direct message FAILED.")

if __name__ == "__main__":
    asyncio.run(diagnose())
