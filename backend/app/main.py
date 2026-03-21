import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .extensions import engine, Base, AsyncSessionLocal
from contextlib import asynccontextmanager
from . import models as domain
from sqlalchemy import select
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 🛠 1. Auto-Create Tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"⚠️ Table Creation Warning (may already exist): {e}")
        
    # 🛠 2. Self-Healing: Clean up hung sessions
    try:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import update
            from datetime import datetime
            stmt = (
                update(domain.Call)
                .where(domain.Call.state.in_(["active", "evaluation"]))
                .values(state="completed", end_time=datetime.utcnow())
            )
            await session.execute(stmt)
            await session.commit()
    except Exception as e:
        print(f"⚠️ Session Cleanup Skip: {e}")
    
    # 🛠 3. Seed Default Settings
    try:
        async with AsyncSessionLocal() as session:
            default_settings = {
                "ai_auto_triage": "true",
                "confidence_threshold": "medium",
                "theme_preference": "sentient",
                "sandbox_mode": "true",
                "api_verbosity": "standard"
            }
            for key, value in default_settings.items():
                result = await session.execute(select(domain.SystemSetting).where(domain.SystemSetting.key == key))
                if not result.scalars().first():
                    session.add(domain.SystemSetting(key=key, value=value))
            await session.commit()
    except Exception as e:
        print(f"⚠️ Seeding Skip: {e}")
        
    yield

app = FastAPI(title="Dignova AI Sentient API", lifespan=lifespan)

# --- CORS Configuration (Production Optimized) ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://dignova-ai.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL], # Removed localhost for security in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
from .hospital.routes import router as hospital_router
from .hospital.bot_webhooks import router as bot_webhooks_router
from .hospital.training_routes import router as training_router
from .auth.routes import router as auth_router
from .ws.routes import router as ws_router
from .stats.routes import router as stats_router

# Core API Routes
app.include_router(hospital_router) 
app.include_router(bot_webhooks_router) 
app.include_router(training_router, prefix="/api/hospital/training", tags=["Intern Training"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ws_router) 
app.include_router(stats_router) 

# --- Static Files ---
os.makedirs("app/static/prescriptions", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/static/prescriptions", StaticFiles(directory="app/static/prescriptions"), name="prescriptions")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "active", 
        "system": "Dignova Sentient Core",
        "version": "1.0.0-PROD",
        "environment": "cloud"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
