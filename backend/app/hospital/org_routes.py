from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from ..models import (
    Organization, User, UserRole, Department, DoctorSchedule,
    Call, Booking, Prescription, Resource, AuditLog, UserVitals
)
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/org", tags=["Organization Management"])

# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class DepartmentCreate(BaseModel):
    name: str
    floor: Optional[str] = None
    description: Optional[str] = None
    head_doctor_id: Optional[int] = None
    bed_count: int = 0

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    head_doctor_id: Optional[int] = None
    bed_count: Optional[int] = None
    is_active: Optional[bool] = None

class DepartmentResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    head_doctor_id: Optional[int] = None
    head_doctor_name: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    bed_count: int
    is_active: bool
    doctor_count: int = 0
    created_at: datetime
    class Config:
        from_attributes = True

class ScheduleCreate(BaseModel):
    doctor_id: int
    department_id: Optional[int] = None
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str   # "09:00"
    end_time: str     # "17:00"

class ScheduleResponse(BaseModel):
    id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    organization_id: int
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    day_of_week: int
    start_time: str
    end_time: str
    is_active: bool
    class Config:
        from_attributes = True

class OrgSettingsUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    ai_philosophy: Optional[str] = None
    stress_threshold: Optional[float] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    max_beds: Optional[int] = None
    max_doctors: Optional[int] = None

class PatientListResponse(BaseModel):
    id: int
    name: str
    email: str
    phone_number: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    chronic_conditions: Optional[str] = None
    last_visit: Optional[str] = None
    total_calls: int = 0
    status: str = "nominal"
    class Config:
        from_attributes = True

# ═══════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════

def require_org_admin(user: User):
    """Ensure user is org_admin or super_admin with an org context."""
    if user.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Organization admin access required.")
    if user.role == UserRole.org_admin and not user.organization_id:
        raise HTTPException(status_code=403, detail="User not linked to any organization.")

def get_org_id(user: User, org_id_override: Optional[int] = None) -> int:
    """Get the org_id to scope queries to. Super admins can override."""
    if user.role == UserRole.super_admin and org_id_override:
        return org_id_override
    if user.organization_id:
        return user.organization_id
    raise HTTPException(status_code=400, detail="No organization context available.")

async def log_audit(db: AsyncSession, user: User, action: str, target_type: str = None, target_id: int = None, details: dict = None):
    """Write an immutable audit log entry."""
    entry = AuditLog(
        user_id=user.id,
        organization_id=user.organization_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details
    )
    db.add(entry)

# ═══════════════════════════════════════════════════
# ORG DASHBOARD STATS
# ═══════════════════════════════════════════════════

@router.get("/dashboard")
async def org_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Comprehensive org-specific dashboard stats."""
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    # Fetch org details
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    # Count users by role within org
    users_stmt = select(User).where(User.organization_id == org_id)
    users_result = await db.execute(users_stmt)
    all_users = users_result.scalars().all()
    
    doctors = [u for u in all_users if u.role == UserRole.doctor]
    patients = [u for u in all_users if u.role == UserRole.user]
    online_doctors = [d for d in doctors if d.is_online]
    
    # Count departments
    dept_count = await db.scalar(
        select(func.count(Department.id)).where(Department.organization_id == org_id, Department.is_active == True)
    )
    
    # Call stats
    calls_stmt = select(Call).where(Call.organization_id == org_id)
    calls_result = await db.execute(calls_stmt)
    all_calls = calls_result.scalars().all()
    
    active_calls = sum(1 for c in all_calls if c.state in ["active", "evaluation"])
    completed_calls = sum(1 for c in all_calls if c.state == "completed")
    critical_calls = sum(1 for c in all_calls if (c.severity or "").upper() == "CRITICAL")
    
    # Resource availability
    resources_stmt = select(Resource).where(Resource.organization_id == org_id)
    resources_result = await db.execute(resources_stmt)
    resources = resources_result.scalars().all()
    available_resources = sum(1 for r in resources if r.status == "available")
    
    # Today's appointments
    today = datetime.utcnow().date()
    from ..models import AppointmentSlot
    appts_stmt = select(func.count(AppointmentSlot.id)).where(
        AppointmentSlot.doctor_id.in_([d.id for d in doctors])
    )
    today_appointments = await db.scalar(appts_stmt) or 0
    
    return {
        "organization": {
            "id": org.id,
            "name": org.name,
            "org_code": org.org_code,
            "subscription_tier": org.subscription_tier,
            "ai_philosophy": org.ai_philosophy,
            "is_active": org.is_active,
            "primary_color": org.primary_color,
            "accent_color": org.accent_color,
        },
        "counts": {
            "total_staff": len(all_users),
            "doctors": len(doctors),
            "doctors_online": len(online_doctors),
            "patients": len(patients),
            "departments": dept_count or 0,
            "active_calls": active_calls,
            "completed_calls": completed_calls,
            "critical_alerts": critical_calls,
            "total_resources": len(resources),
            "available_resources": available_resources,
            "today_appointments": today_appointments,
        },
        "capacity": {
            "max_beds": org.max_beds,
            "max_doctors": org.max_doctors,
            "bed_utilization": round((critical_calls / max(org.max_beds, 1)) * 100, 1),
            "doctor_utilization": round((len(doctors) / max(org.max_doctors, 1)) * 100, 1),
        }
    }

# ═══════════════════════════════════════════════════
# DEPARTMENT MANAGEMENT
# ═══════════════════════════════════════════════════

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    stmt = select(Department).where(Department.organization_id == org_id).order_by(Department.name)
    result = await db.execute(stmt)
    departments = result.scalars().all()
    
    response = []
    for dept in departments:
        # Get head doctor name
        head_name = None
        if dept.head_doctor_id:
            head = await db.scalar(select(User).where(User.id == dept.head_doctor_id))
            head_name = head.name if head else None
        
        # Count doctors in this department (via schedules)
        doc_count = await db.scalar(
            select(func.count(func.distinct(DoctorSchedule.doctor_id))).where(
                DoctorSchedule.department_id == dept.id,
                DoctorSchedule.is_active == True
            )
        ) or 0
        
        response.append(DepartmentResponse(
            id=dept.id,
            organization_id=dept.organization_id,
            name=dept.name,
            head_doctor_id=dept.head_doctor_id,
            head_doctor_name=head_name,
            floor=dept.floor,
            description=dept.description,
            bed_count=dept.bed_count,
            is_active=dept.is_active,
            doctor_count=doc_count,
            created_at=dept.created_at
        ))
    
    return response

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    dept_in: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    new_dept = Department(
        organization_id=org_id,
        name=dept_in.name,
        floor=dept_in.floor,
        description=dept_in.description,
        head_doctor_id=dept_in.head_doctor_id,
        bed_count=dept_in.bed_count
    )
    db.add(new_dept)
    await log_audit(db, current_user, "department.create", "department", details={"name": dept_in.name})
    await db.commit()
    await db.refresh(new_dept)
    
    return DepartmentResponse(
        id=new_dept.id,
        organization_id=new_dept.organization_id,
        name=new_dept.name,
        head_doctor_id=new_dept.head_doctor_id,
        floor=new_dept.floor,
        description=new_dept.description,
        bed_count=new_dept.bed_count,
        is_active=new_dept.is_active,
        doctor_count=0,
        created_at=new_dept.created_at
    )

@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    dept_in: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    dept = await db.scalar(
        select(Department).where(Department.id == dept_id, Department.organization_id == org_id)
    )
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    
    update_data = dept_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)
    
    await log_audit(db, current_user, "department.update", "department", dept_id, update_data)
    await db.commit()
    await db.refresh(dept)
    
    return DepartmentResponse(
        id=dept.id,
        organization_id=dept.organization_id,
        name=dept.name,
        head_doctor_id=dept.head_doctor_id,
        floor=dept.floor,
        description=dept.description,
        bed_count=dept.bed_count,
        is_active=dept.is_active,
        doctor_count=0,
        created_at=dept.created_at
    )

@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    dept = await db.scalar(
        select(Department).where(Department.id == dept_id, Department.organization_id == org_id)
    )
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    
    await log_audit(db, current_user, "department.delete", "department", dept_id, {"name": dept.name})
    await db.execute(delete(Department).where(Department.id == dept_id))
    await db.commit()

# ═══════════════════════════════════════════════════
# DOCTOR SCHEDULE MANAGEMENT
# ═══════════════════════════════════════════════════

@router.get("/schedules")
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    stmt = select(DoctorSchedule).where(
        DoctorSchedule.organization_id == org_id,
        DoctorSchedule.is_active == True
    ).order_by(DoctorSchedule.day_of_week, DoctorSchedule.start_time)
    
    result = await db.execute(stmt)
    schedules = result.scalars().all()
    
    response = []
    for s in schedules:
        doctor = await db.scalar(select(User).where(User.id == s.doctor_id))
        dept = await db.scalar(select(Department).where(Department.id == s.department_id)) if s.department_id else None
        
        response.append({
            "id": s.id,
            "doctor_id": s.doctor_id,
            "doctor_name": doctor.name if doctor else "Unknown",
            "organization_id": s.organization_id,
            "department_id": s.department_id,
            "department_name": dept.name if dept else None,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "is_active": s.is_active,
        })
    
    return response

@router.post("/schedules")
async def create_schedule(
    sched_in: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    # Verify doctor belongs to this org
    doctor = await db.scalar(select(User).where(User.id == sched_in.doctor_id, User.organization_id == org_id))
    if not doctor or doctor.role != UserRole.doctor:
        raise HTTPException(status_code=400, detail="Invalid doctor for this organization.")
    
    new_sched = DoctorSchedule(
        doctor_id=sched_in.doctor_id,
        organization_id=org_id,
        department_id=sched_in.department_id,
        day_of_week=sched_in.day_of_week,
        start_time=sched_in.start_time,
        end_time=sched_in.end_time
    )
    db.add(new_sched)
    await log_audit(db, current_user, "schedule.create", "schedule", details={
        "doctor": doctor.name, "day": sched_in.day_of_week
    })
    await db.commit()
    await db.refresh(new_sched)
    
    return {
        "id": new_sched.id,
        "doctor_id": new_sched.doctor_id,
        "doctor_name": doctor.name,
        "day_of_week": new_sched.day_of_week,
        "start_time": new_sched.start_time,
        "end_time": new_sched.end_time,
        "is_active": True
    }

@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    sched = await db.scalar(
        select(DoctorSchedule).where(DoctorSchedule.id == schedule_id, DoctorSchedule.organization_id == org_id)
    )
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    
    await db.execute(delete(DoctorSchedule).where(DoctorSchedule.id == schedule_id))
    await db.commit()

# ═══════════════════════════════════════════════════
# PATIENT REGISTRY (ORG-SCOPED)
# ═══════════════════════════════════════════════════

@router.get("/patients")
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all patients within this organization."""
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    stmt = select(User).where(User.organization_id == org_id, User.role == UserRole.user).order_by(User.name)
    result = await db.execute(stmt)
    patients = result.scalars().all()
    
    response = []
    for p in patients:
        # Get latest call for last visit date
        last_call = await db.scalar(
            select(Call).where(Call.user_id == p.id).order_by(Call.start_time.desc())
        )
        # Count total calls
        total_calls = await db.scalar(
            select(func.count(Call.call_id)).where(Call.user_id == p.id)
        ) or 0
        
        # Determine status from active calls
        active = await db.scalar(
            select(func.count(Call.call_id)).where(Call.user_id == p.id, Call.state == "active")
        ) or 0
        
        response.append({
            "id": p.id,
            "name": p.name,
            "email": p.email,
            "phone_number": p.phone_number,
            "age": p.age,
            "blood_group": p.blood_group,
            "chronic_conditions": p.chronic_conditions,
            "last_visit": last_call.start_time.isoformat() if last_call else None,
            "total_calls": total_calls,
            "status": "in_triage" if active > 0 else "nominal",
            "is_verified": p.is_verified,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    
    return response

# ═══════════════════════════════════════════════════
# ORG SETTINGS
# ═══════════════════════════════════════════════════

@router.patch("/settings")
async def update_org_settings(
    settings_in: OrgSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update org settings — org admins can change their own org."""
    require_org_admin(current_user)
    org_id = get_org_id(current_user)
    
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    update_data = settings_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
    
    await log_audit(db, current_user, "org.settings_update", "organization", org_id, update_data)
    await db.commit()
    await db.refresh(org)
    
    return {
        "message": "Settings updated successfully.",
        "organization": {
            "id": org.id,
            "name": org.name,
            "org_code": org.org_code,
            "ai_philosophy": org.ai_philosophy,
            "primary_color": org.primary_color,
            "accent_color": org.accent_color,
        }
    }

# ═══════════════════════════════════════════════════
# VITALS API (Real data replacing mocked vitals)
# ═══════════════════════════════════════════════════

class VitalsCreate(BaseModel):
    heart_rate: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    blood_glucose: Optional[float] = None
    weight_kg: Optional[float] = None
    source: str = "manual"
    notes: Optional[str] = None

@router.post("/vitals")
async def record_vitals(
    vitals_in: VitalsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record new vitals entry — patients enter their own data."""
    new_vitals = UserVitals(
        user_id=current_user.id,
        heart_rate=vitals_in.heart_rate,
        systolic_bp=vitals_in.systolic_bp,
        diastolic_bp=vitals_in.diastolic_bp,
        spo2=vitals_in.spo2,
        temperature=vitals_in.temperature,
        respiratory_rate=vitals_in.respiratory_rate,
        blood_glucose=vitals_in.blood_glucose,
        weight_kg=vitals_in.weight_kg,
        source=vitals_in.source,
        notes=vitals_in.notes,
    )
    db.add(new_vitals)
    await db.commit()
    await db.refresh(new_vitals)
    return {"message": "Vitals recorded.", "id": new_vitals.id, "recorded_at": new_vitals.recorded_at.isoformat()}

@router.get("/vitals/history")
async def vitals_history(
    user_id: Optional[int] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vitals history. Patients see their own; doctors/admins can query any patient in their org."""
    target_id = current_user.id
    
    if user_id and user_id != current_user.id:
        if current_user.role not in [UserRole.super_admin, UserRole.org_admin, UserRole.doctor]:
            raise HTTPException(status_code=403, detail="Not authorized to view other patients' vitals.")
        target_id = user_id
    
    stmt = select(UserVitals).where(
        UserVitals.user_id == target_id
    ).order_by(UserVitals.recorded_at.desc()).limit(limit)
    
    result = await db.execute(stmt)
    vitals = result.scalars().all()
    
    return [{
        "id": v.id,
        "heart_rate": v.heart_rate,
        "systolic_bp": v.systolic_bp,
        "diastolic_bp": v.diastolic_bp,
        "spo2": v.spo2,
        "temperature": v.temperature,
        "respiratory_rate": v.respiratory_rate,
        "blood_glucose": v.blood_glucose,
        "weight_kg": v.weight_kg,
        "source": v.source,
        "notes": v.notes,
        "recorded_at": v.recorded_at.isoformat(),
    } for v in vitals]
