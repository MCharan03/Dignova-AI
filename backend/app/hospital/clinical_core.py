from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from ..models import User, Call, Prescription, Booking, Organization, TrainingScenario, TrainingReport
from ..utils.auth import get_current_user
from ..services.sentient_engine import SentientEngine

router = APIRouter(prefix="/api/clinical", tags=["Clinical Core Orchestrator"])

# --- Schemas ---
class TriageRequest(BaseModel):
    message: str
    call_id: Optional[int] = None

class GeofenceRequest(BaseModel):
    lat: float
    lon: float

# --- Consolidated Clinical Routes ---

@router.post("/triage")
async def unified_triage(
    request: TriageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unified entry point for all medical symptom assessment.
    Handles AI analysis, DB persistence, and automation dispatch.
    """
    return await SentientEngine.process_triage(
        db=db,
        user=current_user,
        message=request.message,
        call_id=request.call_id
    )

@router.post("/geofence")
async def unified_geofence(
    request: GeofenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unified geofence arrival detection."""
    arrived = await SentientEngine.process_geofence(
        db=db,
        user=current_user,
        lat=request.lat,
        lon=request.lon
    )
    return {"status": "detected" if arrived else "scanning", "distance_check": True}

@router.get("/prescriptions/me")
async def get_my_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Consolidated prescription history for patient."""
    result = await db.execute(
        select(Prescription)
        .where(Prescription.patient_id == current_user.id)
        .order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()

@router.get("/calls/history")
async def get_call_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Consolidated call and triage history."""
    stmt = select(Call).where(Call.user_id == current_user.id).order_by(Call.start_time.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

# --- Upgraded Feature: Proactive Health Scan ---
@router.post("/health-scan")
async def trigger_proactive_scan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    A new enhanced feature: Manually triggers a background check 
    for preventive care and overdue checkups.
    """
    from ..services.n8n_services import N8nService
    
    # Check if last checkup was > 6 months ago
    if current_user.last_checkup_date:
        overdue = (datetime.utcnow() - current_user.last_checkup_date).days > 180
        if overdue:
            await N8nService.trigger_preventive_nudge(
                patient_data={"name": current_user.name, "email": current_user.email, "telegram_chat_id": current_user.telegram_chat_id},
                message="It has been over 6 months since your last checkup. Would you like to schedule a preventive screening?",
                months_overdue=6
            )
            return {"status": "nudge_sent", "reason": "overdue_checkup"}
            
    return {"status": "clear", "message": "Health records are up to date."}
