import os
import asyncio
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from .extensions import engine, Base, AsyncSessionLocal
from contextlib import asynccontextmanager
from . import models as domain
from sqlalchemy import select
from fastapi.staticfiles import StaticFiles

# --- Security Imports ---
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .extensions import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing logic ...
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[WARN] Table Creation Warning: {e}")
        
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
        print(f"[WARN] Session Cleanup Skip: {e}")
    
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
        print(f"[WARN] Seeding Skip: {e}")
    
    try:
        async with AsyncSessionLocal() as session:
            from .utils.auth import get_password_hash
            default_users = [
                {"email": "cherrycostech@gmail.com", "name": "Dignova Super Admin", "phone": "+919000000001", "role": domain.UserRole.super_admin, "pwd": "dignova2026admin"},
            ]
            for uinfo in default_users:
                u_stmt = select(domain.User).where(domain.User.email == uinfo["email"])
                existing_u = await session.scalar(u_stmt)
                if not existing_u:
                    nu = domain.User(
                        name=uinfo["name"],
                        email=uinfo["email"],
                        phone_number=uinfo["phone"],
                        hashed_password=get_password_hash(uinfo["pwd"]),
                        role=uinfo["role"],
                        is_verified=True
                    )
                    session.add(nu)
                else:
                    # Ensure super admin stays verified, has correct role, and updated password
                    existing_u.is_verified = True
                    existing_u.role = domain.UserRole.super_admin
                    existing_u.hashed_password = get_password_hash(uinfo["pwd"])
            await session.commit()
    except Exception as e:
        print(f"[WARN] Default User Bootstrap Skip: {e}")

    # Start Homeostasis Loop
    asyncio.create_task(homeostasis_loop())
        
    yield

# --- Military Grade Security Initialization ---
app = FastAPI(title="Dignova AI Sentient API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

# --- Enterprise Error Control (iOS-Grade Stability) ---
from sqlalchemy.exc import IntegrityError
from fastapi.responses import JSONResponse

@app.exception_handler(IntegrityError)
async def sqlalchemy_integrity_error_handler(request: Request, exc: IntegrityError):
    print(f"[ERROR] DB Integrity Error: {exc}")
    # Extract the detail message from asyncpg if possible
    detail_msg = "A database constraint was violated (e.g., duplicate entry)."
    if "duplicate key value violates unique constraint" in str(exc):
        detail_msg = "This record already exists in our system. Please check your details (e.g., duplicate phone number or email) and try again."
        
    return JSONResponse(
        status_code=400,
        content={"detail": detail_msg, "error_type": "DataIntegrityError"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[CRITICAL ERROR] Unhandled Exception: {exc}")
    # Catch any completely unexpected errors so the server never truly 'crashes' for the client
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected system error occurred. Our engineers have been notified.", "error_type": "SystemError"}
    )

# --- Military Grade Security Middleware: Headers & Shield ---
@app.middleware("http")
async def security_shield_middleware(request: Request, call_next):
    from .services.security_service import SecurityShieldService
    from fastapi.responses import JSONResponse
    from fastapi import HTTPException
    
    try:
        try:
            await SecurityShieldService.enforce_shield(request)
        except HTTPException as he:
            return JSONResponse(status_code=he.status_code, content={"detail": he.detail})
            
        response: Response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Dignova-Secure-Node"] = "ACTIVE"
        return response
    except Exception as e:
        print(f"[WARN] Security Shield Error: {e}")
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(e)})

# --- Audit Log Middleware (Zero-Trust Auditing) ---
@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    sensitive_methods = ["POST", "PUT", "DELETE", "PATCH"]
    if request.method in sensitive_methods:
        path = request.url.path
        ip = request.client.host if request.client else "unknown"
        
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

        try:
            response = await call_next(request)
            
            if response.status_code < 400:
                # Background task for audit logging to prevent latency
                async def log_action():
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
                    except Exception as le:
                        print(f"[WARN] Audit Logging Failed: {le}")
                
                asyncio.create_task(log_action())
            
            return response
        except Exception as e:
            print(f"[WARN] Audit Middleware Error: {e}")
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(e)})
    
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
from .voice_agent import router as voice_agent_router
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
from .hospital.voice_routes import router as voice_router
from .hospital.twilio_routes import router as twilio_router
from .hospital.agency_routes import router as agency_router
from .hospital.telemetry_routes import router as telemetry_router
from .hospital.awareness_routes import router as awareness_router
from .hospital.task_routes import router as task_router
from .services.agency_service import homeostasis_loop

# Core API Routes
from .hospital.clinical_core import router as clinical_core_router
app.include_router(clinical_core_router)

app.include_router(hospital_router, prefix="/api/hospital", tags=["Hospital & Training"])
app.include_router(admin_router, prefix="/api")
app.include_router(agency_router, prefix="/api")
app.include_router(telemetry_router)
app.include_router(awareness_router)
app.include_router(task_router)
app.include_router(org_router)
app.include_router(notification_router)
app.include_router(prescription_router)
app.include_router(user_router)
app.include_router(calls_router)
app.include_router(bot_webhooks_router)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(voice_agent_router)

app.include_router(twilio_router)
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
app.include_router(voice_router)

# --- Static Files ---
os.makedirs("app/static/prescriptions", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
app.mount("/static/prescriptions", StaticFiles(directory="app/static/prescriptions"), name="prescriptions")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- Static Files ---

@app.get("/api/health")
@app.get("/healthz")
def health_check():
    return {
        "status": "active", 
        "system": "Dignova Sentient Core",
        "version": "1.0.0-PROD",
        "environment": "cloud"
    }

@app.get("/api/health/ai")
def ai_health_check():
    import os
    from .services.ai_service import _gemini_failures
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    gemini_status = "down"
    if gemini_key and gemini_key != "your_gemini_api_key_here":
        failures = _gemini_failures.get(gemini_key, 0)
        if failures >= 3:
            gemini_status = "degraded"
        else:
            gemini_status = "ok"
            
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    openrouter_status = "ok" if openrouter_key and openrouter_key != "your_openrouter_api_key_here" else "unconfigured"
    
    ollama_url = os.getenv("OLLAMA_BASE_URL")
    ollama_status = "ok" if ollama_url else "disabled"
    
    return {
        "gemini": gemini_status,
        "openrouter": openrouter_status,
        "ollama": ollama_status,
        "active_tier": 1
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
