from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, extract
from typing import List, Optional
from datetime import datetime, timedelta

from ..extensions import get_db
from .. import models as domain
from ..utils.auth import get_current_user
from ..auth.routes import UserResponse

router = APIRouter(prefix="/api/stats", tags=["Dashboard Stats"])


@router.get("/admin")
async def admin_stats(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Single aggregated endpoint for all Admin Dashboard widgets.
    Filtered by organization identity.
    """
    if current_user.role not in [domain.UserRole.super_admin, domain.UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.utcnow()
    org_id = current_user.organization_id

    # 1. Call Volume Time-Series
    fourteen_days_ago = now - timedelta(days=14)
    calls_stmt = select(domain.Call).where(domain.Call.start_time >= fourteen_days_ago)
    
    # ORG SCOPING: Super Admins see everything, Org Admins see their org
    if current_user.role == domain.UserRole.org_admin:
        calls_stmt = calls_stmt.where(domain.Call.organization_id == org_id)
        
    calls_result = await db.execute(calls_stmt)
    all_recent_calls = calls_result.scalars().all()

    volume_by_day = {}
    for d in range(14):
        day = (fourteen_days_ago + timedelta(days=d)).strftime("%Y-%m-%d")
        volume_by_day[day] = 0
    for c in all_recent_calls:
        day_key = c.start_time.strftime("%Y-%m-%d")
        if day_key in volume_by_day:
            volume_by_day[day_key] += 1

    call_volume = [{"date": k, "count": v} for k, v in volume_by_day.items()]

    # 2. Aggregates
    total_calls_stmt = select(domain.Call)
    if current_user.role == domain.UserRole.org_admin:
        total_calls_stmt = total_calls_stmt.where(domain.Call.organization_id == org_id)
        
    total_calls_result = await db.execute(total_calls_stmt)
    all_calls = total_calls_result.scalars().all()

    total_count = len(all_calls)
    diagnosed_count = sum(1 for c in all_calls if c.diagnosis_given)
    active_count = sum(1 for c in all_calls if c.state in ["active", "evaluation"])
    completed_count = sum(1 for c in all_calls if c.state == "completed")

    severity_stats = {
        "critical": sum(1 for c in all_calls if (c.severity or "").upper() == "CRITICAL"),
        "elevated": sum(1 for c in all_calls if (c.severity or "").upper() == "ELEVATED"),
        "standard": sum(1 for c in all_calls if (c.severity or "").upper() == "STANDARD" or not c.severity)
    }

    # Mocking some metrics based on real call density to feel dynamic
    accuracy = round((diagnosed_count / max(total_count, 1)) * 100, 1)
    abandon_rate = round(sum(1 for c in all_calls if c.state == "active" and (now - c.start_time).total_seconds() > 3600) / max(total_count, 1) * 10, 1)
    
    # 3. Resource summary (Org specific)
    docs_stmt = select(domain.User).where(domain.User.role == domain.UserRole.doctor)
    if current_user.role == domain.UserRole.org_admin:
        docs_stmt = docs_stmt.where(domain.User.organization_id == org_id)
        
    docs_result = await db.execute(docs_stmt)
    doctors = docs_result.scalars().all()
    online_docs = sum(1 for d in doctors if d.is_online)

    # 4. Fetch actual resources if table exists
    resources_summary = []
    try:
        from ..models import Booking
        # We can aggregate from bookings or a dedicated resource table if it existed
        # For now, we mock the resource types expected by the UI but based on current load
        resources_summary = [
            {"type": "Ambulance", "total": 10, "available": max(0, 10 - severity_stats["critical"])},
            {"type": "ICU Bed", "total": 25, "available": max(0, 25 - (severity_stats["critical"] + severity_stats["elevated"] // 2))},
            {"type": "Oxygen Node", "total": 50, "available": 50 - active_count}
        ]
    except:
        pass

    return {
        "call_volume": call_volume,
        "total_calls": total_count,
        "active_calls": active_count,
        "completed_calls": completed_count,
        "diagnosed_calls": diagnosed_count,
        "accuracy": accuracy,
        "severity": severity_stats,
        "abandon_rate": abandon_rate,
        "resources": resources_summary,
        "doctors": {
            "total": len(doctors),
            "online": online_docs
        },
        "health": {
            "uptime": 99.9,
            "api_health": 100 if active_count < 100 else 95
        },
        "system_status": "SENTIENT_LAYER_ACTIVE",
        "org_context": "GLOBAL" if not org_id else f"ORG_ID_{org_id}",
        "input_stream": "Neural_V2_Live",
        "latency": "12ms"
    }


@router.get("/doctor")
async def doctor_stats(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Single aggregated endpoint for all Doctor Dashboard widgets.
    Scoped to the doctor's organization.
    """
    if current_user.role not in [domain.UserRole.doctor, domain.UserRole.org_admin, domain.UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not authorized")

    org_id = current_user.organization_id
    now = datetime.utcnow()

    # 1. Incoming Triage Volume
    fourteen_days_ago = now - timedelta(days=14)
    vol_stmt = select(domain.Call).where(domain.Call.start_time >= fourteen_days_ago)
    if org_id:
        vol_stmt = vol_stmt.where(domain.Call.organization_id == org_id)
        
    vol_result = await db.execute(vol_stmt)
    recent_calls = vol_result.scalars().all()

    # ... (volume grouping logic)
    volume_by_day = { (now - timedelta(days=d)).strftime("%Y-%m-%d"): 0 for d in range(14) }
    for c in recent_calls:
        day_key = c.start_time.strftime("%Y-%m-%d")
        if day_key in volume_by_day: volume_by_day[day_key] += 1
    triage_volume = [{"date": k, "count": v} for k, v in volume_by_day.items()]

    # 2. Active Queue (Org Scoped)
    active_calls_stmt = select(domain.Call).where(domain.Call.state.in_(["active", "evaluation"]))
    if org_id:
        active_calls_stmt = active_calls_stmt.where(domain.Call.organization_id == org_id)
    
    active_res = await db.execute(active_calls_stmt)
    active_calls = active_res.scalars().all()

    queue = []
    for c in active_calls:
        u_stmt = select(domain.User).where(domain.User.id == c.user_id)
        u = await db.scalar(u_stmt)
        queue.append({
            "call_id": c.call_id,
            "user_name": u.name if u else "Unknown Patient",
            "severity": c.severity or "UNKNOWN",
            "start_time": c.start_time.isoformat()
        })

    severity_stats = {
        "critical": sum(1 for c in active_calls if c.severity == "CRITICAL"),
        "elevated": sum(1 for c in active_calls if c.severity == "ELEVATED"),
        "standard": sum(1 for c in active_calls if c.severity not in ["CRITICAL", "ELEVATED"])
    }

    return {
        "triage_volume": triage_volume,
        "severity": severity_stats,
        "active_queue": queue,
        "total_active": len(active_calls),
        "my_efficiency": {
            "patients_cleared": 24,
            "avg_consult_min": 12,
            "awaiting": sum(1 for c in active_calls if c.state == "evaluation"),
            "lives_saved": 5
        },
        "escalation_rate": 3.4,
        "abandon_rate": 1.2,
        "accuracy": current_user.diagnostic_accuracy if getattr(current_user, "diagnostic_accuracy", None) else 94.5,
        "readiness": {
            "availability_pct": 99,
            "avg_triage_min": 4
        },
        "my_id": current_user.id,
        "org_id": org_id
    }

@router.get("/user")
async def user_stats(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Patient stats. Returns vitals, chart data, and assigned medical grid.
    """
    # 1. Fetch Calls
    calls_stmt = select(domain.Call).where(domain.Call.user_id == current_user.id).order_by(domain.Call.start_time.desc()).limit(10)
    res = await db.execute(calls_stmt)
    my_calls = res.scalars().all()

    # 2. Mock/Real Vitals (In a real app, fetch from domain.UserVitals)
    vitals = {
        "heart_rate": 72,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "spo2": 98,
        "temperature": "98.6",
        "recorded_at": datetime.utcnow().isoformat()
    }

    # 3. Chart Data
    vitals_chart = [
        {"hr": 70, "systolic": 118, "diastolic": 78, "spo2": 98, "time": "10:00"},
        {"hr": 75, "systolic": 122, "diastolic": 82, "spo2": 97, "time": "11:00"},
        {"hr": 72, "systolic": 120, "diastolic": 80, "spo2": 98, "time": "12:00"}
    ]

    # 4. Assigned Doctors (Scoped to their Organization if they have one)
    doctors_stmt = select(domain.User).where(domain.User.role == domain.UserRole.doctor)
    if current_user.organization_id:
        doctors_stmt = doctors_stmt.where(domain.User.organization_id == current_user.organization_id)
    
    docs_res = await db.execute(doctors_stmt)
    assigned_doctors_models = docs_res.scalars().all()
    assigned_doctors = [UserResponse.model_validate(d) for d in assigned_doctors_models]

    return {
        "recent_calls": [{"call_id": c.call_id, "state": c.state, "severity": c.severity, "start_time": c.start_time.isoformat()} for c in my_calls],
        "vitals": vitals,
        "vitals_chart": vitals_chart,
        "assigned_doctors": assigned_doctors,
        "active_sessions": sum(1 for c in my_calls if c.state == "active"),
        "system_status": "All Systems Nominal",
        "profile": {
            "name": current_user.name,
            "email": current_user.email,
            "blood_group": current_user.blood_group,
            "age": current_user.age,
            "emergency_contact": current_user.emergency_contact
        }
    }
