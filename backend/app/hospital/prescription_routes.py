from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from datetime import datetime
from ..extensions import get_db
from ..models import Prescription, User
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/hospital/prescriptions", tags=["Prescriptions"])

class PrescriptionResponse(BaseModel):
    id: int
    call_id: int
    diagnosis: str
    pdf_url: str
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("/me", response_model=List[PrescriptionResponse])
async def get_my_prescriptions(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Retrieves all prescriptions for the current logged-in patient."""
    result = await db.execute(
        select(Prescription).where(Prescription.patient_id == current_user.id).order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()

@router.get("/all", response_model=List[PrescriptionResponse])
async def get_all_prescriptions(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Admin/Doctor view for all prescriptions."""
    if current_user.role not in ["super_admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(Prescription).order_by(Prescription.created_at.desc()))
    return result.scalars().all()
