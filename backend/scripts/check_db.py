import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
import app.models as domain
from app.extensions import AsyncSessionLocal

async def check_db():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(domain.User))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.name} ({u.role}) - Health: {u.weight_kg}kg, {u.height_cm}cm, Allergies: {u.allergies}")
            if u.role == domain.UserRole.doctor:
                print(f"  Doc Profile: {u.qualification}, {u.license_number}, Fee: {u.consultation_fee}")

if __name__ == "__main__":
    asyncio.run(check_db())
