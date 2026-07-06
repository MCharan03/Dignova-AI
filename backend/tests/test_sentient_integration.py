import asyncio
import httpx
import json

async def test_full_integration():
    """
    Simulates a patient sending a voice message (text transcript) to the triage bot.
    Tests the FastAPI -> OpenRouter -> n8n flow.
    """
    print("\n--- Testing Dignova Sentient Integration ---")
    
    url = "http://localhost:8000/api/n8n/webhook/triage"
    test_payload = {
        "session_id": "test_user_123",
        "message": "I have a mild headache and seasonal allergies. I need a prescription.",
        "source": "Telegram",
        "metadata": {
            "mode": "test"
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
            print(f"Response: {result.get('response')}")
            print(f"Risk Level: {result.get('risk_level')}")
            print(f"Call ID: {result.get('call_id')}")
            print(f"Auto Rx Triggered: {result.get('auto_prescription_triggered')}")
            print(f"Escalation Triggered: {result.get('escalation_triggered')}")
            print(f"Escalation Reason: {result.get('escalation_reason')}")
            
            print("\n--- Test Completed Successfully ---")
        except Exception as e:
            print(f"\n[Error] Make sure your FastAPI server is running on port 8000.\nDetail: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_full_integration())
