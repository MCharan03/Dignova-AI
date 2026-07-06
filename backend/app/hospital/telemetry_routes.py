from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..extensions import get_db
from ..models import TelemetrySession, AgencyEvent
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])

class TelemetryPayload(BaseModel):
    wpm: float
    avg_hold_time: float
    avg_flight_time: float
    backspace_ratio: float

@router.post("/log")
async def log_telemetry(
    payload: TelemetryPayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Log keystroke dynamics telemetry and calculate stress score.
    """
    # Stress Score Algorithm:
    # 1. Backspace Ratio contribution (up to 0.4)
    br_stress = 0.0
    if payload.backspace_ratio > 0.1:
        br_stress = min(0.4, (payload.backspace_ratio - 0.1) * 2.0)
        
    # 2. Flight Time / Pause Dynamics contribution (up to 0.3)
    ft_stress = 0.0
    if payload.avg_flight_time > 250.0:
        ft_stress = min(0.3, (payload.avg_flight_time - 250.0) / 1000.0)
        
    # 3. Hold Time contribution (up to 0.3)
    ht_stress = 0.0
    if payload.avg_hold_time > 150.0:
        ht_stress = min(0.3, (payload.avg_hold_time - 150.0) / 500.0)
        
    stress_score = min(1.0, br_stress + ft_stress + ht_stress)
    
    # Create database record
    session_log = TelemetrySession(
        user_id=current_user.id,
        wpm=payload.wpm,
        avg_hold_time=payload.avg_hold_time,
        avg_flight_time=payload.avg_flight_time,
        backspace_ratio=payload.backspace_ratio,
        stress_score=stress_score
    )
    db.add(session_log)
    
    # Send Agency Event if stress is elevated
    if stress_score > 0.7:
        event = AgencyEvent(
            event_type="telemetry",
            message=f"Elevated stress level ({int(stress_score * 100)}%) detected for user: {current_user.email}. System triggers gentle audio guidance recommendations.",
            severity="warning",
            metadata_json={
                "stress_score": stress_score,
                "wpm": payload.wpm,
                "backspace_ratio": payload.backspace_ratio,
                "user_email": current_user.email
            }
        )
        db.add(event)
        
    await db.commit()
    
    return {
        "status": "success",
        "stress_score": stress_score,
        "classification": "CRITICAL" if stress_score > 0.75 else "ELEVATED" if stress_score > 0.4 else "NORMAL"
    }
