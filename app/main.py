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

app.include_router(hospital_router)
app.include_router(bot_webhooks_router)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ws_router)
app.include_router(stats_router)

# --- Static File Serving (Consolidated Architecture) ---
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Path to the built frontend
FRONTEND_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "out")

@app.get("/")
def read_root():
    # Serve the index.html from the built frontend
    index_file = os.path.join(FRONTEND_PATH, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Welcome to Dignova AI Hospital Management API (Frontend not built)"}

# Mount static files (JS, CSS, images)
if os.path.exists(FRONTEND_PATH):
    app.mount("/_next", StaticFiles(directory=os.path.join(FRONTEND_PATH, "_next")), name="next-static")
    # Mount other static assets if they exist
    for item in os.listdir(FRONTEND_PATH):
        item_path = os.path.join(FRONTEND_PATH, item)
        if os.path.isdir(item_path) and item != "_next":
             app.mount(f"/{item}", StaticFiles(directory=item_path), name=f"{item}-static")
        elif os.path.isfile(item_path) and item != "index.html":
             @app.get(f"/{item}")
             async def serve_file(name=item):
                 return FileResponse(os.path.join(FRONTEND_PATH, name))

# Catch-all route for SPA client-side routing
@app.exception_handler(404)
async def not_found_exception_handler(request, exc):
    index_file = os.path.join(FRONTEND_PATH, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return FileResponse(index_file) # Fallback to index if it exists, FastAPI will handle if not

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
