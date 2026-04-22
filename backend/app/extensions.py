import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directory for the database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Resolve Database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{os.path.join(BASE_DIR, 'app.db')}")
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")

# 2. Configure Engine Arguments
# We use a robust configuration that works with Supabase pgbouncer (Transaction Pooling)
engine_args = {
    "echo": False,
}

if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # Industry Standard for Supabase / pgbouncer:
    # 1. Disable client-side statement caching (REQUIRED)
    # 2. Set pool_pre_ping to True to handle dropped cloud connections
    engine_args["connect_args"] = {
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0
    }
    engine_args["pool_pre_ping"] = True
    engine_args["pool_recycle"] = 300

# 3. Create the Engine
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    **engine_args
)

# 4. Create Session Maker
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
