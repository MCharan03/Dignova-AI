import asyncio
import os
import sys

# Add backend/app directory to path
sys.path.append(os.path.join(os.getcwd(), "app"))

from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.services.n8n_services import N8nService

async def test_prescription():
    print("🚀 Testing Automation 09: Prescription Delivery")
    payload = {
        "patient_name": "Charan Kumar",
        "telegram_chat_id": "6019617155",
        "diagnosis": "Common Cold (AI Confirmed)",
        "pdf_url": "https://dignova.ai/demo-prescription.pdf"
    }
    
    success = await N8nService.trigger_workflow("dignova-prescription", payload)
    
    if success:
        print("✅ Prescription trigger sent to n8n.")
    else:
        print("❌ Prescription trigger failed.")

if __name__ == "__main__":
    asyncio.run(test_prescription())
