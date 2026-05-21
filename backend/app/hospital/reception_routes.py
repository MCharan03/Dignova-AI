from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from ..models import User, UserRole, Admission, EHREntry, BillingItem, Notification, AuditLog
from ..utils.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/api/reception", tags=["Reception & Operations"])

# --- Schemas ---

class PatientLookupResponse(BaseModel):
    id: int
    name: str
    email: str
    phone_number: Optional[str]
    blood_group: Optional[str]

class QuickRegisterRequest(BaseModel):
    name: str
    phone_number: str
    email: Optional[str] = None
    blood_group: Optional[str] = None

class AdmitPatientRequest(BaseModel):
    patient_id: int
    doctor_id: int
    room_number: Optional[str] = None
    bed_number: Optional[str] = None

class AddBillingItemRequest(BaseModel):
    category: str # room | medication | procedure | consultation
    description: str
    amount: float
    quantity: int = 1

class BillingItemResponse(BaseModel):
    id: int
    category: str
    description: str
    amount: float
    quantity: int
    created_at: datetime

    class Config:
        from_attributes = True

class AdmissionResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    doctor_id: Optional[int]
    doctor_name: Optional[str]
    status: str
    room_number: Optional[str]
    bed_number: Optional[str]
    admitted_at: datetime
    total_bill: float = 0.0

    class Config:
        from_attributes = True

# --- Guards ---

def require_reception_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.receptionist, UserRole.org_admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Access denied. Receptionist or Admin role required.")
    return current_user

# --- Routes ---

@router.post("/admit", response_model=AdmissionResponse)
async def admit_patient(
    payload: AdmitPatientRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reception_or_admin)
):
    """Receptionist admits a patient to the hospital."""
    # Verify patient
    patient = await db.scalar(select(User).where(User.id == payload.patient_id, User.role == UserRole.user))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    # Check if already admitted
    existing = await db.scalar(select(Admission).where(Admission.patient_id == payload.patient_id, Admission.status == "active"))
    if existing:
        raise HTTPException(status_code=400, detail="Patient is already admitted.")

    # Verify doctor
    doctor = await db.scalar(select(User).where(User.id == payload.doctor_id, User.role == UserRole.doctor))
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    admission = Admission(
        organization_id=current_user.organization_id,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        room_number=payload.room_number,
        bed_number=payload.bed_number,
        status="active",
        admitted_at=datetime.utcnow()
    )
    db.add(admission)
    await db.commit()
    await db.refresh(admission)

    # Notify doctor
    db.add(Notification(
        user_id=payload.doctor_id,
        organization_id=current_user.organization_id,
        title="Patient Admitted",
        message=f"{patient.name} has been admitted and assigned to you in Room {payload.room_number or 'N/A'}.",
        type="info",
        category="triage",
        link="/doctor/ward"
    ))
    
    # Notify patient
    db.add(Notification(
        user_id=payload.patient_id,
        organization_id=current_user.organization_id,
        title="Admission Confirmed",
        message=f"You have been admitted to Room {payload.room_number or 'N/A'}. Your treating physician is Dr. {doctor.name}.",
        type="success",
        category="system"
    ))

    await db.commit()

    return AdmissionResponse(
        id=admission.id,
        patient_id=admission.patient_id,
        patient_name=patient.name,
        doctor_id=admission.doctor_id,
        doctor_name=doctor.name,
        status=admission.status,
        room_number=admission.room_number,
        bed_number=admission.bed_number,
        admitted_at=admission.admitted_at
    )

@router.get("/active-admissions", response_model=List[AdmissionResponse])
async def list_active_admissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reception_or_admin)
):
    """List all currently admitted patients in the organization."""
    stmt = select(Admission).where(
        Admission.organization_id == current_user.organization_id,
        Admission.status == "active"
    ).order_by(Admission.admitted_at.desc())
    
    result = await db.execute(stmt)
    admissions = result.scalars().all()
    
    output = []
    for adm in admissions:
        patient = await db.scalar(select(User).where(User.id == adm.patient_id))
        doctor = await db.scalar(select(User).where(User.id == adm.doctor_id))
        
        # Calculate total bill
        bill_stmt = select(func.sum(BillingItem.amount * BillingItem.quantity)).where(BillingItem.admission_id == adm.id)
        total_bill = await db.scalar(bill_stmt) or 0.0
        
        output.append(AdmissionResponse(
            id=adm.id,
            patient_id=adm.patient_id,
            patient_name=patient.name if patient else "Unknown",
            doctor_id=adm.doctor_id,
            doctor_name=doctor.name if doctor else "Unassigned",
            status=adm.status,
            room_number=adm.room_number,
            bed_number=adm.bed_number,
            admitted_at=adm.admitted_at,
            total_bill=total_bill
        ))
    
    return output

@router.post("/billing/{admission_id}/item", response_model=BillingItemResponse)
async def add_billing_item(
    admission_id: int,
    payload: AddBillingItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reception_or_admin)
):
    """Adds an itemized charge to an admission."""
    admission = await db.get(Admission, admission_id)
    if not admission or admission.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Admission record not found.")

    item = BillingItem(
        admission_id=admission_id,
        category=payload.category,
        description=payload.description,
        amount=payload.amount,
        quantity=payload.quantity
    )
    db.add(item)
    
    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="billing.add_item",
        target_type="admission",
        target_id=admission_id,
        details={"category": payload.category, "amount": payload.amount}
    ))
    
    await db.commit()
    await db.refresh(item)
    return item

@router.post("/discharge/{admission_id}")
async def discharge_patient(
    admission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reception_or_admin)
):
    """Finalizes admission and discharges the patient."""
    admission = await db.get(Admission, admission_id)
    if not admission or admission.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Admission record not found.")

    if admission.status == "discharged":
        raise HTTPException(status_code=400, detail="Patient already discharged.")

    admission.status = "discharged"
    admission.discharged_at = datetime.utcnow()
    
    # Notify patient
    db.add(Notification(
        user_id=admission.patient_id,
        organization_id=current_user.organization_id,
        title="Discharge Finalized",
        message="You have been formally discharged. Thank you for choosing Dignova AI Healthcare.",
        type="success",
        category="system"
    ))

    await db.commit()
    return {"status": "discharged", "discharged_at": admission.discharged_at}

@router.get("/lookup-patient", response_model=Optional[PatientLookupResponse])
async def lookup_patient(
    query: str, # Phone or Email
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reception_or_admin)
):
    """Search for a patient by phone number or email."""
    stmt = select(User).where(
        (User.phone_number == query) | (User.email == query),
        User.role == UserRole.user
    )
    patient = await db.scalar(stmt)
    if not patient:
        return None
    return patient

@router.post("/quick-register", response_model=PatientLookupResponse)
async def quick_register_patient(
    payload: QuickRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_reception_or_admin)
):
    """Rapid onboarding for new walk-in patients."""
    # Check if exists
    existing = await db.scalar(select(User).where(User.phone_number == payload.phone_number))
    if existing:
        raise HTTPException(status_code=400, detail="A user with this phone number already exists.")
    
    # Create basic user
    # If no email provided, create a placeholder
    email = payload.email or f"patient_{payload.phone_number}@dignova.internal"
    
    new_user = User(
        name=payload.name,
        phone_number=payload.phone_number,
        email=email,
        blood_group=payload.blood_group,
        organization_id=current_user.organization_id,
        role=UserRole.user,
        hashed_password=get_password_hash(payload.phone_number), # Default password is phone number
        is_verified=True,
        verified_at=datetime.utcnow()
    )
    db.add(new_user)
    
    # Audit
    db.add(AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="patient.quick_register",
        target_type="user",
        details={"phone": payload.phone_number}
    ))
    
    await db.commit()
    await db.refresh(new_user)
    return new_user

