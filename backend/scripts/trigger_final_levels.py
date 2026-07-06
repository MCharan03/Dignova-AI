import asyncio
import httpx

async def trigger_final():
    print("🚀 Triggering Level 7 (Preventive) and Level 8 (Training)")
    async with httpx.AsyncClient() as client:
        # Level 7
        await client.post('http://localhost:5678/webhook/dignova-preventive', json={
            'body': {
                'telegram_chat_id': '6019617155',
                'patient_name': 'Charan Kumar',
                'months_since': '18',
                'overdue_type': 'Blood Test'
            }
        })
        
        # Level 8
        await client.post('http://localhost:5678/webhook/dignova-training-result', json={
            'body': {
                'telegram_chat_id': '6019617155',
                'intern_name': 'Dr. Charan',
                'score': '94',
                'alignment': 'Excellent',
                'feedback': 'Great job spotting the arrhythmia early.'
            }
        })
        print("✅ Triggers Sent.")

if __name__ == "__main__":
    asyncio.run(trigger_final())
