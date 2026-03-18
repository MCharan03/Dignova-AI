import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .extensions import engine, Base, AsyncSessionLocal
from contextlib import asynccontextmanager
from . import models as domain
from sqlalchemy import select

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the database tables asynchronously
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Self-Healing: Terminate any hung active sessions on restart
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
    
    # Seed default system settings
    async with AsyncSessionLocal() as session:
        default_settings = {
            "ai_auto_triage": "true",
            "confidence_threshold": "medium",
            "prompt_override": "",
            "logging_level": "verbose",
            "mfa_enabled": "false",
            "session_timeout": "1h",
            "encryption_algorithm": "aes-256",
            "audit_logging": "true",
            "max_nodes": "50",
            "dynamic_scaling": "false",
            "allocation_strategy": "latency",
            "primary_region": "Global",
            "theme_preference": "sentient",
            "holographic_effects": "true",
            "animation_speed": "standard",
            "font_override": "",
            "webhook_url": "",
            "webhook_retry": "3",
            "sandbox_mode": "true",
            "api_verbosity": "standard"
        }
        for key, value in default_settings.items():
            result = await session.execute(select(domain.SystemSetting).where(domain.SystemSetting.key == key))
            existing = result.scalars().first()
            if not existing:
                session.add(domain.SystemSetting(key=key, value=value))
        await session.commit()
    yield

app = FastAPI(title="Dignova AI Backend API", lifespan=lifespan)

# --- CORS Configuration ---
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
from .hospital.routes import router as hospital_router
from .hospital.bot_webhooks import router as bot_webhooks_router
from .auth.routes import router as auth_router
from .ws.routes import router as ws_router
from .stats.routes import router as stats_router
from fastapi.staticfiles import StaticFiles

app.include_router(hospital_router)
app.include_router(bot_webhooks_router)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ws_router)
app.include_router(stats_router)

# --- Static Files (Prescriptions & Uploads) ---
os.makedirs("app/static/prescriptions", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/static/prescriptions", StaticFiles(directory="app/static/prescriptions"), name="prescriptions")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"status": "active", "message": "Welcome to Dignova AI Hospital Management API", "system": "Dignova Core"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
