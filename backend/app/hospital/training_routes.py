from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Any
from datetime import datetime

from ..extensions import get_db
from ..models import User, UserRole, SimulatedPatient, TrainingSession
from ..utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class SimulatedPatientResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    case_title: str
    difficulty: str
    initial_complaint: str

    class Config:
        from_attributes = True

class TrainingSessionResponse(BaseModel):
    id: int
    intern_id: int
    sim_patient_id: int
    status: str
    score: int = None
    feedback: str = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/cases", response_model=List[SimulatedPatientResponse])
async def get_training_cases(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.doctor, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    stmt = select(SimulatedPatient)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/start/{case_id}", response_model=TrainingSessionResponse)
async def start_training_session(case_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.doctor, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    # Verify case exists
    stmt = select(SimulatedPatient).where(SimulatedPatient.id == case_id)
    case = await db.scalar(stmt)
    if not case:
        raise HTTPException(status_code=404, detail="Training case not found.")

    # Create session
    session = TrainingSession(
        intern_id=current_user.id,
        sim_patient_id=case_id,
        status="active",
        transcript=f"SYSTEM: Simulation Started. Case: {case.case_title}\nPATIENT: {case.initial_complaint}\n"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/sessions", response_model=List[TrainingSessionResponse])
async def get_my_training_sessions(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(TrainingSession).where(TrainingSession.intern_id == current_user.id).order_by(TrainingSession.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()
