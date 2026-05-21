import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from .extensions import engine, Base, AsyncSessionLocal
from contextlib import asynccontextmanager
from . import models as domain
from sqlalchemy import select
from fastapi.staticfiles import StaticFiles

# --- Security Imports ---
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing logic ...
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"⚠️ Table Creation Warning: {e}")
        
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

# --- Military Grade Security Initialization ---
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(title="Dignova AI Sentient API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

# --- Military Grade Security Middleware: Headers & Shield ---
@app.middleware("http")
async def security_shield_middleware(request: Request, call_next):
    # 1. Inject Strict Security Headers
    response: Response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.openrouter.ai;"
    response.headers["X-Dignova-Secure-Node"] = "ACTIVE"
    return response

# --- Audit Log Middleware (Zero-Trust Auditing) ---
@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    # We only audit state-changing or sensitive operations
    sensitive_methods = ["POST", "PUT", "DELETE", "PATCH"]
    if request.method in sensitive_methods:
        # Extract metadata
        path = request.url.path
        ip = request.client.host if request.client else "unknown"
        
        # We try to get user_id from token if present (Peek into JWT)
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                import jwt
                from .utils.auth import SECRET_KEY, ALGORITHM
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("user_id")
            except:
                pass

        # Call next to get response
        response = await call_next(request)
        
        # Record to DB (async)
        if response.status_code < 400: # Only log successful sensitive actions for now
            try:
                async with AsyncSessionLocal() as session:
                    from .models import AuditLog
                    log_entry = AuditLog(
                        user_id=user_id,
                        action=f"{request.method} {path}",
                        ip_address=ip,
                        details={"status_code": response.status_code}
                    )
                    session.add(log_entry)
                    await session.commit()
            except Exception as e:
                print(f"⚠️ Audit Log Error: {e}")
        
        return response
    
    return await call_next(request)

# --- CORS Configuration (Military Mode) ---
ALLOWED_ORIGINS = [
    os.getenv("FRONTEND_URL", "https://dignova-ai.vercel.app"),
    "http://localhost:3000",
    "*" # Allow all origins for dev/tunnels
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # More permissive for dev
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Dignova-Secure-Node"]
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
from .hospital.security_routes import router as security_router
from .hospital.reception_routes import router as reception_router
from .hospital.doctor_routes import router as doctor_router

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
app.include_router(security_router)
app.include_router(reception_router)
app.include_router(doctor_router)

# --- Static Files ---
os.makedirs("app/static/prescriptions", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/static/prescriptions", StaticFiles(directory="app/static/prescriptions"), name="prescriptions")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- Static Files ---

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
