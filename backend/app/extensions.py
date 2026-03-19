import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory for the database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Use the sqlite connection from the env file or fallback
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{os.path.join(BASE_DIR, 'app.db')}")
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")

# Professional Engine Config: check_same_thread is ONLY for SQLite
engine_args = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
elif "pooler.supabase.com" in SQLALCHEMY_DATABASE_URL:
    # REQUIRED for Supabase Transaction Pooler (pgbouncer)
    engine_args["prepared_statement_cache_size"] = 0

# Create Engine
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    **engine_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

# Async Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
