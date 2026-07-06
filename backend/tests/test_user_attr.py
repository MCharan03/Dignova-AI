import asyncio
import os
import sys
from sqlalchemy import select

# Ensure we can import from 'app'
sys.path.append(os.getcwd())

from app.extensions import AsyncSessionLocal
from app.models import User

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        if user:
            print(f"User: {user.email}")
            print(f"Has blood_group attribute: {hasattr(user, 'blood_group')}")
            if hasattr(user, 'blood_group'):
                print(f"Value: {user.blood_group}")
            else:
                # List all attributes to see what we HAVE
                print("All attributes:")
                print(dir(user))
        else:
            print("No users found")

if __name__ == "__main__":
    asyncio.run(check())
