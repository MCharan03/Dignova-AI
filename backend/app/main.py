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
    allow_origins=[FRONTEND_URL, "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
from .hospital.routes import router as hospital_router
from .hospital.user_routes import router as user_router
from .hospital.admin_routes import router as admin_router
from .hospital.org_routes import router as org_router
from .hospital.notification_routes import router as notification_router
from .hospital.prescription_routes import router as prescription_router
from .hospital.calls import router as calls_router
from .hospital.bot_webhooks import router as bot_webhooks_router
from .auth.routes import router as auth_router
from .ws.routes import router as ws_router
from .stats.routes import router as stats_router
from .hospital.ai_routes import router as ai_router
from .hospital.message_routes import router as message_router
from .hospital.notes_routes import router as notes_router
from .hospital.sos_routes import router as sos_router
from .hospital.appointment_routes import router as appointment_router
from .hospital.analytics_routes import router as analytics_router
from .hospital.alert_routes import router as alert_router

# Core API Routes
from .hospital.clinical_core import router as clinical_core_router
app.include_router(clinical_core_router)

app.include_router(hospital_router, prefix="/api/hospital", tags=["Hospital & Training"])
app.include_router(admin_router, prefix="/api")
app.include_router(org_router)
app.include_router(notification_router)
app.include_router(prescription_router)
app.include_router(user_router)
app.include_router(calls_router)
app.include_router(bot_webhooks_router)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ws_router) 
app.include_router(stats_router) 
app.include_router(ai_router)
app.include_router(message_router)
app.include_router(notes_router)
app.include_router(sos_router)
app.include_router(appointment_router)
app.include_router(analytics_router)
app.include_router(alert_router)

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
