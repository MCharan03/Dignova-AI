import asyncio
import os
import sys

# Add backend/app directory to path
sys.path.append(os.path.join(os.getcwd(), "app"))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.services.n8n_services import N8nService

async def test_calendar():
    print("🚀 Testing Automation 05: Smart Calendar Reminders")
    payload = {
        "patient_name": "Charan Kumar",
        "telegram_chat_id": "6019617155",
        "doctor_name": "Dignova AI",
        "slot_time": "10:30 AM Tomorrow",
        "appointment_id": "999"
    }
    
    success = await N8nService.trigger_workflow("dignova-calendar", payload)
    
    if success:
        print("✅ Calendar reminder trigger sent to n8n.")
    else:
        print("❌ Calendar reminder trigger failed.")

if __name__ == "__main__":
    asyncio.run(test_calendar())
