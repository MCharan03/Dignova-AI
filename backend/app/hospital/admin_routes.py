from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict

from ..extensions import get_db
from ..models import (
    SystemSetting, User, UserRole, Resource, Organization,
    Call, Department, AuditLog, Notification, DoctorSchedule
)
from ..utils.auth import get_current_user

router = APIRouter()

# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class SettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    value: str

class ResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: str
    status: str

class OrganizationCreate(BaseModel):
    name: str
    org_code: str
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    primary_color: str = "#0D6EFD"
    accent_color: str = "#00D4FF"
    subscription_tier: str = "sentient"
    ai_philosophy: str = "balanced"
    max_beds: int = 100
    max_doctors: int = 50

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    subscription_tier: Optional[str] = None
    ai_philosophy: Optional[str] = None
    max_beds: Optional[int] = None
    max_doctors: Optional[int] = None

class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    org_code: str
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    subscription_tier: str = "sentient"
    ai_philosophy: str = "balanced"
    is_active: bool = True
    max_beds: int = 100
    max_doctors: int = 50
    primary_color: str
    accent_color: str
    # Computed fields (will be set manually)
    doctor_count: int = 0
    patient_count: int = 0
    active_calls: int = 0
    created_at: Optional[datetime] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone_number: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    role: str
    tier: Optional[str] = None
    organization_id: Optional[int] = None
    specialty: Optional[str] = None
    is_online: Optional[bool] = None
    qualification: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    languages: Optional[str] = None
    consultation_fee: Optional[int] = None
    available_hours: Optional[str] = None
    is_verified: bool = False
    created_at: Optional[datetime] = None

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    organization_id: Optional[int] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    details: Optional[dict] = None
    created_at: datetime

# ═══════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════

def require_super_admin(user: User):
    if user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required.")

async def log_audit(db: AsyncSession, user: User, action: str, target_type: str = None, target_id: int = None, details: dict = None):
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
# ORGANIZATION CRUD (Super Admin Only)
# ═══════════════════════════════════════════════════

@router.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user)
    result = await db.execute(select(Organization).order_by(Organization.name))
    orgs = result.scalars().all()
    
    response = []
    for org in orgs:
        doc_count = await db.scalar(
            select(func.count(User.id)).where(User.organization_id == org.id, User.role == UserRole.doctor)
        ) or 0
        pat_count = await db.scalar(
            select(func.count(User.id)).where(User.organization_id == org.id, User.role == UserRole.user)
        ) or 0
        active = await db.scalar(
            select(func.count(Call.call_id)).where(Call.organization_id == org.id, Call.state.in_(["active", "evaluation"]))
        ) or 0
        
        response.append(OrganizationResponse(
            id=org.id, name=org.name, org_code=org.org_code,
            address=org.address, contact_email=org.contact_email,
            contact_phone=getattr(org, 'contact_phone', None),
            subscription_tier=org.subscription_tier, ai_philosophy=org.ai_philosophy,
            is_active=getattr(org, 'is_active', True),
            max_beds=getattr(org, 'max_beds', 100),
            max_doctors=getattr(org, 'max_doctors', 50),
            primary_color=org.primary_color, accent_color=org.accent_color,
            doctor_count=doc_count, patient_count=pat_count,
            active_calls=active, created_at=org.created_at
        ))
    
    return response

@router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(
    org_in: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user)
    
    # Check for duplicate org_code
    existing = await db.scalar(select(Organization).where(Organization.org_code == org_in.org_code))
    if existing:
        raise HTTPException(status_code=400, detail="Organization code already exists.")
    
    new_org = Organization(
        name=org_in.name,
        org_code=org_in.org_code,
        address=org_in.address,
        contact_email=org_in.contact_email,
        contact_phone=org_in.contact_phone,
        primary_color=org_in.primary_color,
        accent_color=org_in.accent_color,
        subscription_tier=org_in.subscription_tier,
        ai_philosophy=org_in.ai_philosophy,
        max_beds=org_in.max_beds,
        max_doctors=org_in.max_doctors,
    )
    db.add(new_org)
    await log_audit(db, current_user, "org.create", "organization", details={"name": org_in.name, "code": org_in.org_code})
    await db.commit()
    await db.refresh(new_org)
    
    return OrganizationResponse(
        id=new_org.id, name=new_org.name, org_code=new_org.org_code,
        address=new_org.address, contact_email=new_org.contact_email,
        contact_phone=new_org.contact_phone,
        subscription_tier=new_org.subscription_tier, ai_philosophy=new_org.ai_philosophy,
        is_active=True, max_beds=new_org.max_beds, max_doctors=new_org.max_doctors,
        primary_color=new_org.primary_color, accent_color=new_org.accent_color,
        doctor_count=0, patient_count=0, active_calls=0, created_at=new_org.created_at
    )

@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: int,
    org_in: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_super_admin(current_user)
    
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    update_data = org_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
    
    await log_audit(db, current_user, "org.update", "organization", org_id, update_data)
    await db.commit()
    await db.refresh(org)
    
    return OrganizationResponse(
        id=org.id, name=org.name, org_code=org.org_code,
        address=org.address, contact_email=org.contact_email,
        contact_phone=getattr(org, 'contact_phone', None),
        subscription_tier=org.subscription_tier, ai_philosophy=org.ai_philosophy,
        is_active=getattr(org, 'is_active', True),
        max_beds=getattr(org, 'max_beds', 100),
        max_doctors=getattr(org, 'max_doctors', 50),
        primary_color=org.primary_color, accent_color=org.accent_color,
        created_at=org.created_at
    )

@router.patch("/organizations/{org_id}/suspend")
async def toggle_org_status(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle organizational active/suspended status."""
    require_super_admin(current_user)
    
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    org.is_active = not org.is_active
    action = "org.activate" if org.is_active else "org.suspend"
    await log_audit(db, current_user, action, "organization", org_id, {"is_active": org.is_active})
    await db.commit()
    
    return {"message": f"Organization {'activated' if org.is_active else 'suspended'}.", "is_active": org.is_active}

@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently delete an organization and unlink its users."""
    require_super_admin(current_user)
    
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    await log_audit(db, current_user, "org.delete", "organization", org_id, {"name": org.name})
    
    # Unlink users first (set their org_id to NULL)
    from sqlalchemy import update
    await db.execute(update(User).where(User.organization_id == org_id).values(organization_id=None))
    
    # Delete org cascades departments, schedules, etc.
    await db.execute(delete(Organization).where(Organization.id == org_id))
    await db.commit()

@router.get("/organizations/{org_id}/stats")
async def get_org_stats(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deep analytics for a specific organization - Super Admin drill-down."""
    require_super_admin(current_user)
    
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")
    
    # Users breakdown
    all_users_result = await db.execute(select(User).where(User.organization_id == org_id))
    all_users = all_users_result.scalars().all()
    
    doctors = [u for u in all_users if u.role == UserRole.doctor]
    patients = [u for u in all_users if u.role == UserRole.user]
    admins = [u for u in all_users if u.role == UserRole.org_admin]
    
    # Call stats
    calls_result = await db.execute(select(Call).where(Call.organization_id == org_id))
    all_calls = calls_result.scalars().all()
    
    active_calls = sum(1 for c in all_calls if c.state in ["active", "evaluation"])
    completed_calls = sum(1 for c in all_calls if c.state == "completed")
    critical_calls = sum(1 for c in all_calls if (c.severity or "").upper() == "CRITICAL")
    diagnosed = sum(1 for c in all_calls if c.diagnosis_given)
    
    # Call volume time-series (14 days)
    now = datetime.utcnow()
    fourteen_days_ago = now - timedelta(days=14)
    volume_by_day = {}
    for d in range(14):
        day = (fourteen_days_ago + timedelta(days=d)).strftime("%Y-%m-%d")
        volume_by_day[day] = 0
    for c in all_calls:
        if c.start_time >= fourteen_days_ago:
            day_key = c.start_time.strftime("%Y-%m-%d")
            if day_key in volume_by_day:
                volume_by_day[day_key] += 1
    
    # Departments
    dept_count = await db.scalar(
        select(func.count(Department.id)).where(Department.organization_id == org_id)
    ) or 0
    
    return {
        "organization": {
            "id": org.id, "name": org.name, "org_code": org.org_code,
            "subscription_tier": org.subscription_tier,
            "ai_philosophy": org.ai_philosophy,
            "is_active": getattr(org, 'is_active', True),
            "primary_color": org.primary_color, "accent_color": org.accent_color,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        },
        "staff": {
            "total": len(all_users),
            "doctors": len(doctors),
            "doctors_online": sum(1 for d in doctors if d.is_online),
            "patients": len(patients),
            "admins": len(admins),
        },
        "calls": {
            "total": len(all_calls),
            "active": active_calls,
            "completed": completed_calls,
            "critical": critical_calls,
            "diagnosed": diagnosed,
            "accuracy": round((diagnosed / max(len(all_calls), 1)) * 100, 1),
            "call_volume": [{"date": k, "count": v} for k, v in volume_by_day.items()],
        },
        "departments": dept_count,
        "capacity": {
            "max_beds": getattr(org, 'max_beds', 100),
            "max_doctors": getattr(org, 'max_doctors', 50),
        }
    }

@router.get("/organizations/{org_id}/members")
async def get_org_members(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members of an organization - for Super Admin drill-down."""
    require_super_admin(current_user)
    
    result = await db.execute(
        select(User).where(User.organization_id == org_id).order_by(User.role, User.name)
    )
    users = result.scalars().all()
    
    return [{
        "id": u.id, "name": u.name, "email": u.email,
        "role": u.role.value, "tier": u.tier.value if u.tier else None,
        "specialty": u.specialty, "is_online": u.is_online,
        "is_verified": u.is_verified,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]

# ═══════════════════════════════════════════════════
# PLATFORM-WIDE STATS (Super Admin Only)
# ═══════════════════════════════════════════════════

@router.get("/platform/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Global platform-wide KPIs for Super Admin overview."""
    require_super_admin(current_user)
    
    total_orgs = await db.scalar(select(func.count(Organization.id))) or 0
    active_orgs = await db.scalar(
        select(func.count(Organization.id)).where(Organization.is_active == True)
    ) or 0
    total_users = await db.scalar(select(func.count(User.id))) or 0
    total_doctors = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.doctor)
    ) or 0
    total_patients = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.user)
    ) or 0
    total_calls = await db.scalar(select(func.count(Call.call_id))) or 0
    active_calls = await db.scalar(
        select(func.count(Call.call_id)).where(Call.state.in_(["active", "evaluation"]))
    ) or 0
    
    # Per-org call breakdown for comparison
    org_calls = []
    orgs_result = await db.execute(select(Organization).order_by(Organization.name))
    for org in orgs_result.scalars().all():
        org_call_count = await db.scalar(
            select(func.count(Call.call_id)).where(Call.organization_id == org.id)
        ) or 0
        org_calls.append({"org_name": org.name, "org_id": org.id, "calls": org_call_count})
    
    return {
        "total_organizations": total_orgs,
        "active_organizations": active_orgs,
        "total_users": total_users,
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_calls": total_calls,
        "active_calls": active_calls,
        "org_comparison": org_calls,
    }

# ═══════════════════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════════════════

@router.get("/audit-log")
async def get_audit_log(
    limit: int = 50,
    org_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch audit log. Super Admin sees all; Org Admin sees their org."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    
    if current_user.role == UserRole.org_admin:
        stmt = stmt.where(AuditLog.organization_id == current_user.organization_id)
    elif org_id:
        stmt = stmt.where(AuditLog.organization_id == org_id)
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    response = []
    for log in logs:
        user_name = None
        if log.user_id:
            user = await db.scalar(select(User).where(User.id == log.user_id))
            user_name = user.name if user else None
        
        response.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user_name,
            "organization_id": log.organization_id,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        })
    
    return response

# ═══════════════════════════════════════════════════
# USER MANAGEMENT (Org/Super Admin Scoped)
# ═══════════════════════════════════════════════════

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List users. Org Admin sees their org; Super Admin sees all."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    stmt = select(User).order_by(User.name)
    
    if current_user.role == UserRole.org_admin:
        stmt = stmt.where(User.organization_id == current_user.organization_id)
        
    if role:
        stmt = stmt.where(User.role == role)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_details(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch profile for a specific user."""
    stmt = select(User).where(User.id == user_id)
    user = await db.scalar(stmt)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Org Admin can only see their own org members
    if current_user.role == UserRole.org_admin and user.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied to users outside your organization.")
        
    return user

# ═══════════════════════════════════════════════════
# EXISTING ENDPOINTS (preserved)
# ═══════════════════════════════════════════════════

@router.get("/settings", response_model=List[SettingResponse])
async def get_settings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(SystemSetting))
    return result.scalars().all()

@router.get("/resources", response_model=List[ResourceResponse])
async def get_resources(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Basic resource listing
    result = await db.execute(select(Resource))
    return result.scalars().all()
