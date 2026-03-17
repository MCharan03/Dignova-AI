import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from app.extensions import Base
import app.models
from dotenv import load_dotenv

load_dotenv()

# Get URL from environment
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/dignova_ai")

engine = create_async_engine(SQLALCHEMY_DATABASE_URL)

async def init_db():
    async with engine.begin() as conn:
        print("Creating all tables in PostgreSQL...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
