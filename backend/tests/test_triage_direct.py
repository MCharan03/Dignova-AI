import asyncio
import os
import sys
import json

# Add backend/app directory to path
sys.path.append(os.path.join(os.getcwd(), "app"))

from app.services.openrouter_service import OpenRouterService

async def test_triage():
    print("🚀 Testing AI Triage Logic (Direct)")
    
    # Verify API Key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or "sk-or-v1" not in api_key:
        print(f"❌ OPENROUTER_API_KEY is missing or invalid: {api_key}")
        return

    print(f"Model: {os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')}")
    
    complaint = "I have a sharp pain in my lower back and I feel a bit dizzy."
    patient_info = {
        "name": "Charan Kumar",
        "age": 20,
        "blood_group": "A+",
        "allergies": "None",
        "chronic_conditions": "None"
    }
    
    try:
        print("📡 Sending request to AI...")
        result = await OpenRouterService.triage_message(
            conversation_history="",
            new_message=complaint,
            patient_info=patient_info
        )
        print("\n🤖 AI Response:")
        print(json.dumps(result, indent=2))
        
        if result.get("response"):
            print("\n✅ Triage Logic is working correctly.")
        else:
            print("\n❌ AI returned empty response.")
            
    except Exception as e:
        print(f"\n❌ Triage Logic CRASHED: {e}")

if __name__ == "__main__":
    # Load .env first
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    
    asyncio.run(test_triage())
