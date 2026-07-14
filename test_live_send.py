import asyncio
from google import genai
from google.genai import types
import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyDMXn-wsvN3h5dUHHpL7eH2bK9j4NjxyO8"
client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1alpha'})

async def test():
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"]
    )
    print("Testing connection...")
    try:
        async with client.aio.live.connect(model="models/gemini-2.5-flash-native-audio-latest", config=config) as session:
            print("Connected!")
            print("Testing send with empty string...")
            try:
                await session.send(input="", end_of_turn=True)
                print("Send empty string succeeded!")
            except Exception as e:
                print("Send empty string failed:", e)
                
            print("Testing send with end_of_turn only...")
            try:
                await session.send(end_of_turn=True)
                print("Send end_of_turn only succeeded!")
            except Exception as e:
                print("Send end_of_turn only failed:", e)
    except Exception as e:
        print("Connection failed:", e)

asyncio.run(test())
