from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

from ..extensions import get_db
from ..models import User, UserRole, DoctorTier, AppointmentSlot, Notification, AuditLog, DoctorSchedule
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

# ─── Schemas ──────────────────────────────────────────────────────────────────

class BookAppointmentRequest(BaseModel):
    doctor_id: int
    slot_time: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    slot_time: datetime
    status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ScheduleSlotRequest(BaseModel):
    day_of_week: int   # 0=Mon … 6=Sun
    start_time: str    # "09:00"
    end_time: str      # "17:00"
    department_id: Optional[int] = None

class UpdateStatusRequest(BaseModel):
    status: str  # confirmed | cancelled


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/doctors")
async def get_bookable_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List doctors available for booking in the patient's org."""
    stmt = select(User).where(
        User.role == UserRole.doctor,
        User.tier != DoctorTier.intern
    )
    if current_user.organization_id:
        stmt = stmt.where(User.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    doctors = result.scalars().all()

    # Get schedule for each doctor
    doctor_list = []
    for doc in doctors:
        schedules_result = await db.execute(
            select(DoctorSchedule).where(DoctorSchedule.doctor_id == doc.id, DoctorSchedule.is_active == True)
        )
        schedules = schedules_result.scalars().all()
        doctor_list.append({
            "id": doc.id,
            "name": doc.name,
            "specialty": doc.specialty,
            "qualification": doc.qualification,
            "department": doc.department,
            "experience_years": doc.experience_years,
            "consultation_fee": doc.consultation_fee,
            "is_online": doc.is_online,
            "bio": doc.bio,
            "available_days": [
                {
                    "day": s.day_of_week,
                    "start": s.start_time,
                    "end": s.end_time,
                }
                for s in schedules
            ]
        })

    return doctor_list


@router.post("/book", response_model=AppointmentResponse)
async def book_appointment(
    payload: BookAppointmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Patient books an appointment with a doctor."""
    # Verify doctor
    doctor = await db.scalar(select(User).where(User.id == payload.doctor_id, User.role == UserRole.doctor))
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    # Check for conflicting appointment
    conflict = await db.scalar(
        select(AppointmentSlot).where(
            AppointmentSlot.doctor_id == payload.doctor_id,
            AppointmentSlot.slot_time == payload.slot_time,
            AppointmentSlot.status.in_(["pending", "confirmed"])
        )
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Time slot already booked.")

    slot = AppointmentSlot(
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        slot_time=payload.slot_time,
        notes=payload.notes,
        status="pending"
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    # Notify doctor
    db.add(Notification(
        user_id=payload.doctor_id,
        organization_id=current_user.organization_id,
        title=f"New Appointment Request — {current_user.name}",
        message=f"{current_user.name} has booked an appointment for {payload.slot_time.strftime('%b %d, %Y at %H:%M')}.",
        type="info",
        category="appointment",
        link="/doctor/appointments"
    ))

    db.add(AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="appointment.book",
        target_type="appointment",
        target_id=slot.id,
        details={"doctor_id": payload.doctor_id, "slot_time": payload.slot_time.isoformat()}
    ))
    await db.commit()

    # SSE push to doctor
    from .sos_routes import broadcast_notification
    await broadcast_notification(payload.doctor_id, {
        "type": "APPOINTMENT",
        "patient": current_user.name,
        "slot_time": payload.slot_time.isoformat(),
    })

    return slot


@router.get("/me")
async def get_my_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Patient views their upcoming appointments."""
    result = await db.execute(
        select(AppointmentSlot)
        .where(AppointmentSlot.patient_id == current_user.id)
        .order_by(AppointmentSlot.slot_time.asc())
    )
    slots = result.scalars().all()
    output = []
    for s in slots:
        doc = await db.scalar(select(User).where(User.id == s.doctor_id))
        output.append({
            "id": s.id,
            "slot_time": s.slot_time.isoformat(),
            "status": s.status,
            "notes": s.notes,
            "doctor": {"id": doc.id, "name": doc.name, "specialty": doc.specialty} if doc else None,
        })
    return output


@router.get("/doctor")
async def get_doctor_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor views their appointment schedule."""
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Doctors only.")

    result = await db.execute(
        select(AppointmentSlot)
        .where(AppointmentSlot.doctor_id == current_user.id)
        .order_by(AppointmentSlot.slot_time.asc())
    )
    slots = result.scalars().all()
    output = []
    for s in slots:
        patient = await db.scalar(select(User).where(User.id == s.patient_id))
        output.append({
            "id": s.id,
            "slot_time": s.slot_time.isoformat(),
            "status": s.status,
            "notes": s.notes,
            "patient": {
                "id": patient.id,
                "name": patient.name,
                "age": patient.age,
                "blood_group": patient.blood_group,
                "email": patient.email
            } if patient else None,
        })
    return output


@router.put("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    payload: UpdateStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor confirms or cancels an appointment."""
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Doctors only.")

    slot = await db.scalar(
        select(AppointmentSlot).where(
            AppointmentSlot.id == appointment_id,
            AppointmentSlot.doctor_id == current_user.id
        )
    )
    if not slot:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if payload.status not in ["confirmed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Status must be 'confirmed' or 'cancelled'.")

    slot.status = payload.status
    await db.commit()

    # Notify patient
    patient = await db.scalar(select(User).where(User.id == slot.patient_id))
    if patient:
        status_word = "confirmed ✅" if payload.status == "confirmed" else "cancelled ❌"
        db.add(Notification(
            user_id=slot.patient_id,
            organization_id=current_user.organization_id,
            title=f"Appointment {status_word.split()[0]} by Dr. {current_user.name}",
            message=f"Your appointment on {slot.slot_time.strftime('%b %d at %H:%M')} has been {payload.status}.",
            type="success" if payload.status == "confirmed" else "warning",
            category="appointment",
            link="/user"
        ))
        await db.commit()

    return {"status": payload.status, "appointment_id": appointment_id}


# ─── Doctor Schedule Management ───────────────────────────────────────────────

@router.get("/schedule/me")
async def get_my_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor views their weekly availability schedule."""
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Doctors only.")
    result = await db.execute(
        select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == current_user.id,
            DoctorSchedule.is_active == True
        )
    )
    return result.scalars().all()


@router.post("/schedule/set")
async def set_schedule_slot(
    payload: ScheduleSlotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor sets or updates a weekly availability slot."""
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Doctors only.")

    # Upsert: check if slot for this day already exists
    existing = await db.scalar(
        select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == current_user.id,
            DoctorSchedule.day_of_week == payload.day_of_week
        )
    )
    if existing:
        existing.start_time = payload.start_time
        existing.end_time = payload.end_time
        existing.is_active = True
        if payload.department_id:
            existing.department_id = payload.department_id
    else:
        db.add(DoctorSchedule(
            doctor_id=current_user.id,
            organization_id=current_user.organization_id,
            day_of_week=payload.day_of_week,
            start_time=payload.start_time,
            end_time=payload.end_time,
            department_id=payload.department_id,
        ))
    await db.commit()
    return {"status": "schedule_updated", "day": payload.day_of_week}


@router.delete("/schedule/{day}")
async def remove_schedule_slot(
    day: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor removes availability for a specific day."""
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Doctors only.")
    slot = await db.scalar(
        select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == current_user.id,
            DoctorSchedule.day_of_week == day
        )
    )
    if slot:
        slot.is_active = False
        await db.commit()
    return {"status": "removed", "day": day}
