import asyncio
import os
import sys

# Ensure we are in the backend directory context
# We expect to run this from the project root, so we add 'backend' to path
# and then import app.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.extensions import AsyncSessionLocal
from app.models import User, Call, TrainingReport, Prescription, AppointmentSlot, UserVitals
from sqlalchemy import select

async def migrate_to_encryption():
    print("🚀 Starting Military-Grade Encryption Migration...")
    async with AsyncSessionLocal() as session:
        # 1. Migrate User Table
        print("🔍 Migrating Users...")
        result = await session.execute(select(User))
        users = result.scalars().all()
        for user in users:
            # Re-assigning triggers the EncryptedText TypeDecorator
            if user.address: user.address = user.address
            if user.bio: user.bio = user.bio
            if user.emergency_contact: user.emergency_contact = user.emergency_contact
            if user.allergies: user.allergies = user.allergies
            if user.medications: user.medications = user.medications
            if user.chronic_conditions: user.chronic_conditions = user.chronic_conditions
        
        # 2. Migrate Calls
        print("🔍 Migrating Calls...")
        result = await session.execute(select(Call))
        calls = result.scalars().all()
        for call in calls:
            if call.transcript: call.transcript = call.transcript

        # 3. Migrate Prescriptions
        print("🔍 Migrating Prescriptions...")
        result = await session.execute(select(Prescription))
        prescriptions = result.scalars().all()
        for rx in prescriptions:
            if rx.diagnosis: rx.diagnosis = rx.diagnosis
            if rx.notes: rx.notes = rx.notes

        # 4. Migrate Vitals
        print("🔍 Migrating Vitals...")
        result = await session.execute(select(UserVitals))
        vitals = result.scalars().all()
        for v in vitals:
            if v.notes: v.notes = v.notes

        await session.commit()
        print("✅ Migration Complete. All sensitive data is now symmetrically encrypted.")

if __name__ == "__main__":
    asyncio.run(migrate_to_encryption())
