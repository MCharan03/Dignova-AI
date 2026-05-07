import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import app.models as domain
from app.extensions import Base, engine, AsyncSessionLocal

load_dotenv()

async def seed_user_history():
    print("--- Seeding Historical Diagnostics & Prescriptions ---")
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch User (Charan Kumar)
        user_stmt = select(domain.User).where(domain.User.email == "mallelacharankumar@gmail.com")
        user = await db.scalar(user_stmt)
        if not user:
            print("User mallelacharankumar@gmail.com not found. Please run seed.py first.")
            return

        # 2. Fetch a Doctor (Dr. Sarah Smith)
        doctor_stmt = select(domain.User).where(domain.User.email == "sarah.manipal@dignova.ai")
        doctor = await db.scalar(doctor_stmt)
        if not doctor:
            # Fallback to any doctor
            doctor_stmt = select(domain.User).where(domain.User.role == domain.UserRole.doctor)
            doctor = await db.scalar(doctor_stmt)

        # 3. Create Case 1: Viral Fever (6 months ago)
        date1 = datetime.utcnow() - timedelta(days=180)
        call1 = domain.Call(
            user_id=user.id,
            organization_id=user.organization_id or (doctor.organization_id if doctor else None),
            call_type=domain.CallType.triage,
            start_time=date1,
            end_time=date1 + timedelta(minutes=15),
            state="history",
            diagnosis_given="Acute Viral Fever",
            transcript="Patient complained of high fever (102F), body aches, and fatigue for 2 days. No cough or cold.",
            severity="MID",
            source="web"
        )
        db.add(call1)
        await db.flush() # To get call1.call_id

        presc1 = domain.Prescription(
            organization_id=call1.organization_id,
            call_id=call1.call_id,
            patient_id=user.id,
            doctor_id=doctor.id if doctor else None,
            diagnosis="Acute Viral Fever",
            medications=[
                {"name": "Paracetamol", "dosage": "650mg", "frequency": "Thrice a day", "duration": "3 days"},
                {"name": "Vitamin C", "dosage": "500mg", "frequency": "Once a day", "duration": "10 days"}
            ],
            notes="Rest well and stay hydrated. Monitor temperature every 4 hours.",
            approved_by_doctor=True,
            created_at=date1
        )
        db.add(presc1)

        # 4. Create Case 2: Seasonal Allergy (3 months ago)
        date2 = datetime.utcnow() - timedelta(days=90)
        call2 = domain.Call(
            user_id=user.id,
            organization_id=call1.organization_id,
            call_type=domain.CallType.triage,
            start_time=date2,
            end_time=date2 + timedelta(minutes=10),
            state="history",
            diagnosis_given="Allergic Rhinitis",
            transcript="Patient presenting with persistent sneezing, runny nose, and itchy eyes. Symptoms worse in the mornings.",
            severity="LOW",
            source="telegram"
        )
        db.add(call2)
        await db.flush()

        presc2 = domain.Prescription(
            organization_id=call2.organization_id,
            call_id=call2.call_id,
            patient_id=user.id,
            doctor_id=doctor.id if doctor else None,
            diagnosis="Allergic Rhinitis (Seasonal)",
            medications=[
                {"name": "Loratadine", "dosage": "10mg", "frequency": "Once daily at night", "duration": "14 days"},
                {"name": "Fluticasone Nasal Spray", "dosage": "50mcg", "frequency": "Two sprays in each nostril once daily", "duration": "30 days"}
            ],
            notes="Avoid exposure to dust and pollen. Use a mask when outdoors.",
            approved_by_doctor=True,
            created_at=date2
        )
        db.add(presc2)

        # 5. Create Case 3: Gastritis (1 month ago)
        date3 = datetime.utcnow() - timedelta(days=30)
        call3 = domain.Call(
            user_id=user.id,
            organization_id=call1.organization_id,
            call_type=domain.CallType.triage,
            start_time=date3,
            end_time=date3 + timedelta(minutes=20),
            state="history",
            diagnosis_given="Acute Gastritis",
            transcript="Patient complained of burning sensation in upper abdomen, bloating, and nausea after meals.",
            severity="LOW",
            source="web"
        )
        db.add(call3)
        await db.flush()

        presc3 = domain.Prescription(
            organization_id=call3.organization_id,
            call_id=call3.call_id,
            patient_id=user.id,
            doctor_id=doctor.id if doctor else None,
            diagnosis="Acute Gastritis secondary to dietary habits",
            medications=[
                {"name": "Pantoprazole", "dosage": "40mg", "frequency": "Once daily before breakfast", "duration": "7 days"},
                {"name": "Antacid Gel", "dosage": "10ml", "frequency": "After meals if needed", "duration": "5 days"}
            ],
            notes="Avoid spicy and oily foods. Eat smaller, frequent meals.",
            approved_by_doctor=True,
            created_at=date3
        )
        db.add(presc3)

        await db.commit()
        print(f"Successfully added 3 historical cases for {user.name}")

if __name__ == "__main__":
    asyncio.run(seed_user_history())
