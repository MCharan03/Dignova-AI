import asyncio
import httpx
import json

async def test_full_integration():
    """
    Simulates a patient sending a voice message (text transcript) to the triage bot.
    Tests the FastAPI -> OpenRouter -> n8n flow.
    """
    print("\n--- Testing Dignova Sentient Integration ---\n")
    
    url = "http://localhost:8000/api/n8n/webhook/triage"
    test_payload = {
        "text": "I have severe chest pain and I'm feeling very anxious right now.",
        "voice_metadata": {
            "duration": 5.2,
            "detected_tone": "urgent",
            "background_noise": "low"
        }
    }
    
    # IMPORTANT: Ensure FastAPI server is running before executing this
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"> Sending Triage Request to {url}...")
            response = await client.post(url, json=test_payload)
            response.raise_for_status()
            result = response.json()
            
            print("\n[AI Triage Result]")
            print(f"Urgency Level: {result['triage'].get('level')}")
            print(f"Reasoning: {result['triage'].get('reasoning')}")
            print(f"Recommendation: {result['recommendation']}")
            
            print("\n[Sentient Analysis (Emotional Telemetry)]")
            print(json.dumps(result['sentient_analysis'], indent=2))
            
            print("\n--- Test Completed Successfully ---")
        except Exception as e:
            print(f"\n[Error] Make sure your FastAPI server is running on port 8000.\nDetail: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_full_integration())
