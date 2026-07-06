import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from app.extensions import AsyncSessionLocal, engine, Base
import app.models as domain
from app.utils.auth import get_password_hash
from dotenv import load_dotenv

load_dotenv()

async def reset_to_real():
    print("--- Resetting Dignova-AI to Real Operations Mode ---")
    
    # Ensure tables exist
    async with engine.begin() as conn:
        print("Synchronizing database schema...")
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Clear Simulated Data
        print("Clearing calls, bookings, vitals, and visual analysis...")
        try:
            await db.execute(delete(domain.Booking))
            await db.execute(delete(domain.VisualAnalysis))
            await db.execute(delete(domain.UserVitals))
            await db.execute(delete(domain.Call))
        except Exception as e:
            print(f"Note: Some tables might not have existed yet: {e}")
        
        # 2. Clear non-essential users (Simulated Doctors/Patients)
        # We keep the admin specified in .env
        admin_email = os.getenv("ADMIN_EMAIL", "admin@dignova.ai")
        print(f"Clearing all users except {admin_email}...")
        await db.execute(delete(domain.User).where(domain.User.email != admin_email))
        
        # 3. Ensure Admin exists
        from sqlalchemy import select
        admin_stmt = select(domain.User).where(domain.User.email == admin_email)
        admin = await db.scalar(admin_stmt)
        
        if not admin:
            print(f"Creating fresh Admin: {admin_email}")
            admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
            new_admin = domain.User(
                name="System Admin", 
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role=domain.UserRole.admin,
                is_verified=True
            )
            db.add(new_admin)
        
        # 4. Clear resources to reset totals
        print("Resetting resources...")
        await db.execute(delete(domain.Resource))
        
        # Add baseline resources
        resources = [
            domain.Resource(resource_type="Ambulance", total=5, available=5),
            domain.Resource(resource_type="ICU", total=10, available=10),
            domain.Resource(resource_type="General", total=50, available=50)
        ]
        db.add_all(resources)

        await db.commit()
        print("--- System Reset Complete. Database is now in Real Mode. ---")

if __name__ == "__main__":
    asyncio.run(reset_to_real())
