import os
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Any, List, Optional
from datetime import timedelta, datetime
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import ConfigDict
import socket

from ..extensions import get_db, limiter
from ..models import User, UserRole, DoctorTier
from ..utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user
)
from ..utils.auth_utils import (
    generate_verification_token, confirm_verification_token,
    generate_reset_token, confirm_reset_token,
    generate_sync_token, confirm_sync_token,
    check_rate_limit, record_failed_attempt, clear_login_attempts
)

from ..utils.email_utils import send_email, send_welcome_email
from ..services.n8n_services import N8nService
from pydantic import BaseModel, EmailStr

router = APIRouter()

@router.get("/telegram-sync-token")
async def get_telegram_sync_token(current_user: User = Depends(get_current_user)):
    """Generates a secure, short-lived token to link the user to Telegram."""
    token = generate_sync_token(current_user.id)
    return {"sync_token": token}

# --- Schemas ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    age: Optional[int] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    password: str
    role: str = "user" # user, doctor, org_admin
    org_code: Optional[str] = None # Mandatory for doctors and org_admins
    tier: Optional[str] = None # intern, mid_range, experienced
    website: Optional[str] = None # Honeypot field for bot protection

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    # Health telemetry
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    chronic_conditions: Optional[str] = None

class DoctorProfileUpdate(BaseModel):
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    languages: Optional[str] = None
    consultation_fee: Optional[int] = None
    available_hours: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    role: str

class UserResponse(BaseModel):
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
    rating: Optional[float] = None
    avg_stress_level: Optional[float] = 0.0
    diagnostic_accuracy: Optional[float] = 0.0
    is_verified: bool
    # Health telemetry
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    chronic_conditions: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# --- Routes ---

def _get_frontend_url(request: Request = None) -> str:
    if request:
        origin = request.headers.get("origin") or request.headers.get("referer")
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
    return os.getenv("FRONTEND_URL", "https://dignova-ai.vercel.app")


@router.post("/register", response_model=UserResponse)
@limiter.limit("2/minute")
async def register(request: Request, user_in: UserCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)) -> Any:
    # 0. Honeypot check for spam bots
    if user_in.website is None or user_in.website != "":
        print(f"[HONEYPOT] Bot/direct-API registration blocked: {user_in.email} (website={user_in.website!r})")
        return UserResponse(
            id=999999,
            name=user_in.name,
            email=user_in.email,
            phone_number=user_in.phone_number,
            role=user_in.role,
            is_verified=False,
            created_at=datetime.utcnow()
        )
    # 1. Resolve or Dynamic Auto-Create Organization
    org_id = None
    if user_in.role in ["doctor", "org_admin"]:
        org_code = (user_in.org_code or "GENERAL-2026").strip().upper()
        from ..models import Organization
        org_stmt = select(Organization).where(Organization.org_code == org_code)
        org = await db.scalar(org_stmt)
        if not org:
            if user_in.role == "org_admin":
                org_name = f"{user_in.name.split()[0]}'s Hospital" if user_in.name else "New Medical Center"
                org = Organization(
                    name=org_name,
                    org_code=org_code,
                    subscription_tier="sentient",
                    is_active=True
                )
                db.add(org)
                await db.flush()
                org_id = org.id
            else:
                default_org_stmt = select(Organization).limit(1)
                default_org = await db.scalar(default_org_stmt)
                if not default_org:
                    default_org = Organization(
                        name="Dignova General Hospital",
                        org_code="DIGNOVA-GENERAL",
                        subscription_tier="sentient",
                        is_active=True
                    )
                    db.add(default_org)
                    await db.flush()
                org_id = default_org.id
        else:
            org_id = org.id

    # 2. Check if user exists
    stmt = select(User).where(User.email == user_in.email)
    existing_user = await db.scalar(stmt)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists. Please log in.",
        )

    # Resolve phone number (sanitize or sanitize fallback)
    phone = (user_in.phone_number or "").strip()
    if phone:
        stmt_phone = select(User).where(User.phone_number == phone)
        existing_phone = await db.scalar(stmt_phone)
        if existing_phone:
            import random
            phone = f"{phone}-{random.randint(100, 999)}"

    # 3. Resolve Role and Tier
    try:
        role_enum = UserRole(user_in.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    tier_enum = None
    if role_enum == UserRole.doctor and user_in.tier:
        try:
            tier_enum = DoctorTier(user_in.tier)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid doctor tier specified.")

    user = User(
        name=user_in.name,
        email=user_in.email,
        phone_number=phone,
        organization_id=org_id,
        age=user_in.age,
        blood_group=user_in.blood_group,
        address=user_in.address,
        emergency_contact=user_in.emergency_contact,
        hashed_password=get_password_hash(user_in.password),
        role=role_enum,
        tier=tier_enum,
        is_verified=False  # Mandatory verification for new signups
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Generate verification token dynamically based on request origin
    FRONTEND_URL = _get_frontend_url(request)
    token = generate_verification_token(user.email)
    verify_url = f"{FRONTEND_URL}/verify?token={token}"
    print(f"[AUTH] New signup {user.email}. Dynamic verification URL: {verify_url}")

    # MX check - only queue email if the domain can actually receive mail
    domain = user.email.split("@")[1]
    try:
        import socket
        socket.getaddrinfo(domain, None)
        background_tasks.add_task(
            send_welcome_email,
            user.email, user.name, verify_url, user.role.value
        )
    except Exception as e:
        print(f"[MX BLOCK] Could not send verification email: {e}")

    return user

@router.get("/verify")
async def verify_email(request: Request, token: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    email = confirm_verification_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="The verification link is invalid or has expired.")
    
    stmt = select(User).where(User.email == email)
    user = await db.scalar(stmt)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.is_verified:
        return {"message": "Email already verified."}
    
    user.is_verified = True
    user.verified_at = datetime.utcnow()
    await db.commit()

    FRONTEND_URL = _get_frontend_url(request)
    token_new = generate_verification_token(user.email)
    verify_url = f"{FRONTEND_URL}/verify?token={token_new}"
    user_data = {
        "email": user.email,
        "name": user.name,
        "phone": user.phone_number,
        "role": user.role.value,
        "verify_url": verify_url,
        "telegram_chat_id": user.telegram_chat_id
    }
    background_tasks.add_task(N8nService.trigger_onboarding, user_data)

    return {"message": "Email verified successfully!"}

@router.post("/resend-verification")
@limiter.limit("2/minute")
async def resend_verification(request: Request, email: EmailStr, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == email)
    user = await db.scalar(stmt)
    if user and not user.is_verified:
        try:
            FRONTEND_URL = _get_frontend_url(request)
            token = generate_verification_token(user.email)
            verify_url = f"{FRONTEND_URL}/verify?token={token}"
            background_tasks.add_task(
                send_welcome_email,
                user.email, user.name, verify_url, user.role.value
            )
        except Exception as e:
            print(f"[RESEND] Error: {e}")
    return {"message": "If that email is registered and unverified, a new verification link has been sent."}

@router.post("/login", response_model=Token)
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    email = form_data.username
    
    stmt = select(User).where(User.email == email)
    user = await db.scalar(stmt)
    if not user or not verify_password(form_data.password, user.hashed_password):
        record_failed_attempt(email)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Please verify your email address before logging in. Check your inbox for the verification link.")
    clear_login_attempts(email)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            data={"sub": user.email, "role": user.role.value, "user_id": user.id},
            request=request,
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "is_verified": user.is_verified,
    }

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, request_data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Rename request parameter to prevent signature/limiter conflicts
    stmt = select(User).where(User.email == request_data.email)
    user = await db.scalar(stmt)
    if user:
        try:
            FRONTEND_URL = os.getenv("FRONTEND_URL", "https://dignova-ai.vercel.app")
            token = generate_reset_token(user.email)
            reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
            
            # Using basic send_email for password reset
            send_email(
                to=user.email,
                subject="Password Reset - Dignova AI",
                body=f"Hello {user.name},\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_url}\n\nThis link expires in 30 minutes.",
                category='support'
            )
        except Exception as e:
            print(f"Error sending reset email: {e}")
    
    return {"message": "If that email is registered, a password reset link has been sent."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    email = confirm_reset_token(request.token)
    if not email:
        raise HTTPException(status_code=400, detail="The reset link is invalid or has expired.")
    
    stmt = select(User).where(User.email == email)
    user = await db.scalar(stmt)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user.hashed_password = get_password_hash(request.new_password)
    await db.commit()
    clear_login_attempts(email)
    return {"message": "Your password has been reset successfully!"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> Any:
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_me(request: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> Any:
    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
        
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.post("/approve/{user_id}", response_model=UserResponse)
async def approve_user(user_id: int, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_user)):
    if current_admin.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    stmt = select(User).where(User.id == user_id)
    user = await db.scalar(stmt)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Org admins can only approve users in their org
    if current_admin.role == UserRole.org_admin and user.organization_id != current_admin.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage users outside your organization.")
        
    user.is_verified = True
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_user)):
    if current_admin.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    stmt = select(User)
    # Filter by organization if it's an org_admin
    if current_admin.role == UserRole.org_admin:
        stmt = stmt.where(User.organization_id == current_admin.organization_id)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_user)):
    if current_admin.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account.")

    # Fetch user to check existence
    stmt = select(User).where(User.id == user_id)
    user = await db.scalar(stmt)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Org admins can only delete users in their org
    if current_admin.role == UserRole.org_admin and user.organization_id != current_admin.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage users outside your organization.")

    from sqlalchemy import update
    from ..models import TrainingReport, TrainingScenario, Call, Booking, UserVitals

    # 1. Delete Training Reports where this user is the intern
    await db.execute(delete(TrainingReport).where(TrainingReport.intern_id == user_id))

    # 2. Nullify source_call_id on TrainingScenarios that reference this user's calls
    subq = select(Call.call_id).where(Call.user_id == user_id)
    await db.execute(
        update(TrainingScenario).where(TrainingScenario.source_call_id.in_(subq)).values(source_call_id=None)
    )

    # 3. Delete Bookings related to User's Calls
    await db.execute(delete(Booking).where(Booking.call_id.in_(subq)))

    # 5. Delete Calls owned by this user
    await db.execute(delete(Call).where(Call.user_id == user_id))

    # 6. Delete Vitals
    await db.execute(delete(UserVitals).where(UserVitals.user_id == user_id))

    # 7. Delete the User
    await db.execute(delete(User).where(User.id == user_id))

    await db.commit()
    return None
@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(user_id: int, request: RoleUpdateRequest, db: AsyncSession = Depends(get_db), current_admin: User = Depends(get_current_user)):
    if current_admin.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
        
    stmt = select(User).where(User.id == user_id)
    user = await db.scalar(stmt)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if current_admin.role == UserRole.org_admin and user.organization_id != current_admin.organization_id:
        raise HTTPException(status_code=403, detail="Cannot manage users outside your organization.")
        
    try:
        role_enum = UserRole(request.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role specified.")
        
    user.role = role_enum
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/doctor-profile/{user_id}", response_model=UserResponse)
async def update_doctor_profile(user_id: int, request: DoctorProfileUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a doctor's medical profile. Allowed by admins or the doctor themselves."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    stmt = select(User).where(User.id == user_id)
    doctor = await db.scalar(stmt)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    
    if current_user.role == UserRole.org_admin and doctor.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Cannot manage doctors outside your organization.")

    if doctor.role != UserRole.doctor:
        raise HTTPException(status_code=400, detail="User is not a doctor.")
    
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doctor, key, value)
    
    await db.commit()
    await db.refresh(doctor)
    return doctor

@router.get("/doctors", response_model=List[UserResponse])
async def list_doctors(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List doctors. Super Admin sees all, Org Admin sees their organization."""
    stmt = select(User).where(User.role == UserRole.doctor)
    
    if current_user.role == UserRole.org_admin:
        stmt = stmt.where(User.organization_id == current_user.organization_id)
    elif current_user.role != UserRole.super_admin:
        # Standard users/doctors might not need to see full profiles of all docs
        # but for now we allow if they are part of an org
        if current_user.organization_id:
            stmt = stmt.where(User.organization_id == current_user.organization_id)

    result = await db.execute(stmt)
    return result.scalars().all()
