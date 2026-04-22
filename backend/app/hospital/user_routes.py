from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from .. import models as domain
from ..utils.auth import get_current_user
from ..services.ai_service import SentientOrchestrator

router = APIRouter(prefix="/api/user", tags=["User Features"])

# --- Schemas ---
class ReportSummarizeRequest(BaseModel):
    text: str

# --- Routes ---

@router.get("/health-tips")
async def get_health_tips(
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Generates personalized health tips based on the user's profile."""
    agent = SentientOrchestrator()
    user_profile = {
        "age": current_user.age,
        "blood_group": current_user.blood_group,
        "allergies": current_user.allergies,
        "chronic_conditions": current_user.chronic_conditions,
        "preferred_language": current_user.preferred_language
    }
    
    try:
        tips = agent.generate_health_tips(user_profile)
        return {"tips": tips}
    except Exception as e:
        # Fallback for prototype stability
        return {"tips": [
            "Maintain consistent hydration throughout the day.",
            "Monitor your activity levels and ensure adequate rest.",
            "Consider a semi-annual checkup at your registered organization."
        ]}

@router.get("/timeline")
async def get_medical_timeline(
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Returns a chronological timeline of all medical events for the user."""
    events = []
    
    # 1. Fetch Calls
    calls_stmt = select(domain.Call).where(domain.Call.user_id == current_user.id).order_by(domain.Call.start_time.desc())
    calls = (await db.execute(calls_stmt)).scalars().all()
    for c in calls:
        events.append({
            "type": "call",
            "date": c.start_time.isoformat(),
            "title": f"Triage Call: {c.diagnosis_given or 'Preliminary Assessment'}",
            "details": f"Severity: {c.severity}",
            "id": c.call_id
        })

    # 2. Fetch Prescriptions
    presc_stmt = select(domain.Prescription).where(domain.Prescription.patient_id == current_user.id).order_by(domain.Prescription.created_at.desc())
    prescs = (await db.execute(presc_stmt)).scalars().all()
    for p in prescs:
        events.append({
            "type": "prescription",
            "date": p.created_at.isoformat(),
            "title": f"Prescription issued: {p.diagnosis or 'Treatment Plan'}",
            "details": f"Medications: {len(p.medications or [])} items",
            "id": p.id
        })

    # 3. Fetch Appointments
    appt_stmt = select(domain.AppointmentSlot).where(domain.AppointmentSlot.patient_id == current_user.id).order_by(domain.AppointmentSlot.slot_time.desc())
    appts = (await db.execute(appt_stmt)).scalars().all()
    for a in appts:
        events.append({
            "type": "appointment",
            "date": a.slot_time.isoformat(),
            "title": "Doctor Consultation",
            "details": f"Status: {a.status}",
            "id": a.id
        })

    # Sort all events by date
    events.sort(key=lambda x: x["date"], reverse=True)
    return events

@router.post("/reports/summarize")
async def summarize_medical_report(
    request: ReportSummarizeRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Summarizes complex medical documents using AI."""
    agent = SentientOrchestrator()
    try:
        summary_data = agent.summarize_report(request.text)
        return summary_data
    except Exception as e:
        return {"error": "Summarization service unavailable", "detail": str(e)}
