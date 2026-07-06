import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ID = "6019617155"

async def test():
    print(f"📡 Sending Direct Message to {ID}...")
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
        params = {
            "chat_id": ID,
            "text": "🚨 DIRECT TEST: The Sentient Layer is alive!"
        }
        resp = await client.get(url, params=params)
        print(resp.json())

if __name__ == "__main__":
    asyncio.run(test())
