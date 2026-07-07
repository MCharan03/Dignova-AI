"""
Production Migration Script — Dignova AI Sentient OS Layer
Runs create_all against the configured DATABASE_URL (PostgreSQL on Render).
Safe to run multiple times — only creates tables that don't already exist.
"""
import asyncio
import os
import sys

# Ensure the backend root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.extensions import engine, Base

# Import ALL models so SQLAlchemy knows about them before create_all
from app.models import (
    User, Organization, Department, DoctorSchedule,
    Call, Booking, Prescription, Resource, AuditLog,
    Notification, SystemSetting, UserVitals, AgencyEvent,
    TrainingScenario, TrainingReport, CaseStudy,
    AppointmentSlot, Admission, EHREntry, BillingItem,
    AgencyTask
)


async def run():
    print("🔌 Connecting to database...")
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("❌ DATABASE_URL is not set. Aborting.")
        sys.exit(1)

    if "sqlite" in db_url:
        print("⚠️  Warning: Running against SQLite. For production, use PostgreSQL.")
    else:
        print(f"✅ Using PostgreSQL: {db_url.split('@')[-1]}")  # Hide credentials in logs

    async with engine.begin() as conn:
        print("📐 Creating all tables (skipping existing)...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ All tables created / verified successfully.")

    await engine.dispose()
    print("🚀 Migration complete — Dignova AI is ready.")


if __name__ == "__main__":
    asyncio.run(run())
