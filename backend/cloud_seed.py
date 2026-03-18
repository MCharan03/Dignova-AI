import asyncio
import os
from sqlalchemy import select
from app.extensions import create_async_engine, AsyncSessionLocal, Base
from app import models as domain
from app.utils.auth import get_password_hash

# 1. PASTE YOUR SUPABASE URI HERE
# IMPORTANT: Use 'postgresql+asyncpg://' at the start!
DB_URI = "postgresql+asyncpg://postgres:Gurucherry%4036@db.ozijytjcdwhxkkfoapvr.supabase.co:5432/postgres"

async def seed_database():
    print("🚀 Connecting to Supabase Sentient Layer...")
    engine = create_async_engine(DB_URI)
    
    # Create a local sessionmaker bound to THIS engine
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    MySession = async_sessionmaker(
        bind=engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )

    async with engine.begin() as conn:
        print("🛠 Building Tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with MySession() as session:
        # Check if Admin already exists
        result = await session.execute(select(domain.User).where(domain.User.email == "cherrycostech@gmail.com"))
        admin = result.scalars().first()

        if not admin:
            print("👤 Creating Master Admin Account...")
            admin = domain.User(
                name="Dignova Admin",
                email="cherrycostech@gmail.com",
                hashed_password=get_password_hash("admin123"),
                role=domain.UserRole.admin,
                is_verified=True
            )
            session.add(admin)

            print("👨‍⚕️ Creating Primary Sentient Doctor...")
            doctor = domain.User(
                name="Dr. Sentient",
                email="doctor@dignova.ai",
                hashed_password=get_password_hash("doctor123"),
                role=domain.UserRole.doctor,
                tier=domain.DoctorTier.experienced,
                specialty="AI Triage Specialist",
                is_verified=True,
                is_online=True
            )
            session.add(doctor)

            print("📦 Initializing Hospital Resources...")
            resources = [
                domain.Resource(resource_type="ICU", total=10, available=10),
                domain.Resource(resource_type="Ambulance", total=5, available=5),
                domain.Resource(resource_type="General Bed", total=50, available=50)
            ]
            session.add_all(resources)

            await session.commit()
            print("\n✅ DATABASE READY! You can now log in with:")
            print("   Email: cherrycostech@gmail.com")
            print("   Password: admin123")
        else:
            print("ℹ️ Database already seeded.")

if __name__ == "__main__":
    asyncio.run(seed_database())
