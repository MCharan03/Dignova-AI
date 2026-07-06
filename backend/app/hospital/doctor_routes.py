from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from ..extensions import get_db
from ..models import User, UserRole, Admission, EHREntry, BillingItem, Notification, AuditLog
from ..utils.auth import get_current_user
from ..utils.crypto import decrypt_data

router = APIRouter(prefix="/api/doctor", tags=["Doctor Operations"])

# --- Schemas ---

class EHREntryRequest(BaseModel):
    note_type: str # clinical_note | lab_result | procedure | daily_round
    content: str

class EHREntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    note_type: str
    content: str
    created_at: datetime
    created_by_name: Optional[str]

class AdmittedPatientResponse(BaseModel):
    admission_id: int
    patient_id: int
    patient_name: str
    room_number: Optional[str]
    bed_number: Optional[str]
    admitted_at: datetime
    latest_vitals: Optional[dict] = None

# --- Guards ---

def require_doctor(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Access denied. Doctor role required.")
    return current_user

# --- Routes ---

@router.get("/ward/admitted", response_model=List[AdmittedPatientResponse])
async def get_admitted_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Fetch all patients currently admitted under this doctor's care."""
    stmt = select(Admission).where(
        Admission.doctor_id == current_user.id,
        Admission.status == "active"
    ).order_by(Admission.admitted_at.desc())
    
    result = await db.execute(stmt)
    admissions = result.scalars().all()
    
    output = []
    for adm in admissions:
        patient = await db.scalar(select(User).where(User.id == adm.patient_id))
        
        # In a real system, we'd fetch the latest vitals from UserVitals
        # For this prototype, we return basic patient info
        output.append(AdmittedPatientResponse(
            admission_id=adm.id,
            patient_id=adm.patient_id,
            patient_name=patient.name if patient else "Unknown Patient",
            room_number=adm.room_number,
            bed_number=adm.bed_number,
            admitted_at=adm.admitted_at
        ))
        
    return output

@router.post("/ward/ehr/{admission_id}", response_model=EHREntryResponse)
async def add_ehr_entry(
    admission_id: int,
    payload: EHREntryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Doctor adds a clinical note or EHR entry for an admitted patient."""
    admission = await db.get(Admission, admission_id)
    if not admission or admission.doctor_id != current_user.id:
        raise HTTPException(status_code=404, detail="Admission record not found or not under your care.")

    entry = EHREntry(
        admission_id=admission_id,
        created_by=current_user.id,
        note_type=payload.note_type,
        content=payload.content
    )
    db.add(entry)
    
    # Audit
    db.add(AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="ehr.add_entry",
        target_type="admission",
        target_id=admission_id,
        details={"note_type": payload.note_type}
    ))
    
    await db.commit()
    await db.refresh(entry)
    
    return EHREntryResponse(
        id=entry.id,
        note_type=entry.note_type,
        content=payload.content,
        created_at=entry.created_at,
        created_by_name=current_user.name
    )

@router.get("/ward/ehr/{admission_id}", response_model=List[EHREntryResponse])
async def get_ehr_history(
    admission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Fetch full EHR history for an admission."""
    admission = await db.get(Admission, admission_id)
    if not admission or (current_user.role == UserRole.doctor and admission.doctor_id != current_user.id):
         # Allow other doctors or admins in same org? For now, stick to primary doctor
         if admission.organization_id != current_user.organization_id:
            raise HTTPException(status_code=404, detail="Admission record not found.")

    stmt = select(EHREntry).where(EHREntry.admission_id == admission_id).order_by(EHREntry.created_at.desc())
    result = await db.execute(stmt)
    entries = result.scalars().all()
    
    output = []
    for e in entries:
        creator = await db.get(User, e.created_by)
        output.append(EHREntryResponse(
            id=e.id,
            note_type=e.note_type,
            content=e.content, # Decrypted by EHREntry model decorator
            created_at=e.created_at,
            created_by_name=creator.name if creator else "System"
        ))
        
    return output
