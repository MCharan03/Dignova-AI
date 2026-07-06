import asyncio
import os
import sys

# Add backend/app directory to path
sys.path.append(os.path.join(os.getcwd(), "app"))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.services.n8n_services import N8nService

async def test_aftercare():
    print("🚀 Testing Automation 04: Proactive Aftercare")
    payload = {
        "patient_name": "Charan Kumar",
        "telegram_chat_id": "6019617155",
        "better_callback": "aftercare_yes_better",
        "sick_callback": "aftercare_no_still_sick"
    }
    
    success = await N8nService.trigger_workflow("dignova-aftercare", payload)
    
    if success:
        print("✅ Aftercare trigger sent to n8n.")
    else:
        print("❌ Aftercare trigger failed.")

if __name__ == "__main__":
    asyncio.run(test_aftercare())
