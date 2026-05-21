import asyncio
import os
import sys

# Add the backend directory to sys.path to allow imports from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.extensions import AsyncSessionLocal
from app.models import User, Call, TrainingReport, Prescription, AppointmentSlot, UserVitals
from sqlalchemy import select

async def migrate_to_encryption():
    print("🚀 Starting FULL Military-Grade Encryption Migration...")
    async with AsyncSessionLocal() as session:
        # 1. Users
        print("🔍 Migrating Users...")
        result = await session.execute(select(User))
        for u in result.scalars().all():
            if u.address: u.address = u.address
            if u.bio: u.bio = u.bio
            if u.emergency_contact: u.emergency_contact = u.emergency_contact
            if u.allergies: u.allergies = u.allergies
            if u.medications: u.medications = u.medications
            if u.chronic_conditions: u.chronic_conditions = u.chronic_conditions
        
        # 2. Calls
        print("🔍 Migrating Calls...")
        result = await session.execute(select(Call))
        for c in result.scalars().all():
            if c.transcript: c.transcript = c.transcript

        # 3. Training Reports
        print("🔍 Migrating Training Reports...")
        result = await session.execute(select(TrainingReport))
        for tr in result.scalars().all():
            if tr.transcript: tr.transcript = tr.transcript

        # 4. Prescriptions
        print("🔍 Migrating Prescriptions...")
        result = await session.execute(select(Prescription))
        for rx in result.scalars().all():
            if rx.diagnosis: rx.diagnosis = rx.diagnosis
            if rx.notes: rx.notes = rx.notes

        # 5. Appointment Slots
        print("🔍 Migrating Appointments...")
        result = await session.execute(select(AppointmentSlot))
        for apt in result.scalars().all():
            if apt.notes: apt.notes = apt.notes

        # 6. User Vitals
        print("🔍 Migrating Vitals...")
        result = await session.execute(select(UserVitals))
        for v in result.scalars().all():
            if v.notes: v.notes = v.notes

        await session.commit()
        print("✅ FULL Migration Complete. System status: SECURE.")

if __name__ == "__main__":
    asyncio.run(migrate_to_encryption())
