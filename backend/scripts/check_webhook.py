import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def check():
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.telegram.org/bot{TOKEN}/getWebhookInfo")
        print(resp.json())

if __name__ == "__main__":
    asyncio.run(check())
