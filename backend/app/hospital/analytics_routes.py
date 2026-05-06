from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from datetime import datetime, timedelta
from typing import Optional

from ..extensions import get_db
from ..models import (User, UserRole, Call, CallType, TrainingReport,
                       TrainingScenario, UserVitals, Notification, AuditLog, Department)
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/stats/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_analytics_overview(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregated analytics for admin dashboards.
    Returns: call volume trend, severity distribution, department load,
             AI training accuracy, and patient activity metrics.
    """
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Admin access required.")

    org_id = current_user.organization_id if current_user.role == UserRole.org_admin else None
    since = datetime.utcnow() - timedelta(days=days)

    # ── 1. Call Volume Trend (by day) ─────────────────────────────────────────
    call_stmt = select(Call).where(Call.start_time >= since)
    if org_id:
        call_stmt = call_stmt.where(Call.organization_id == org_id)
    call_result = await db.execute(call_stmt)
    all_calls = call_result.scalars().all()

    # Bucket by date
    volume_by_day: dict = {}
    severity_counts: dict = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0, "UNKNOWN": 0}
    call_type_counts: dict = {"emergency": 0, "triage": 0, "training": 0}

    for c in all_calls:
        day_key = c.start_time.strftime("%Y-%m-%d") if c.start_time else "unknown"
        volume_by_day[day_key] = volume_by_day.get(day_key, 0) + 1
        sev = (c.severity or "UNKNOWN").upper()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        ct = c.call_type.value if c.call_type else "triage"
        call_type_counts[ct] = call_type_counts.get(ct, 0) + 1

    # Fill missing days with 0
    volume_trend = []
    for i in range(days - 1, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        volume_trend.append({"date": day, "calls": volume_by_day.get(day, 0)})

    # ── 2. Patient Demographics ────────────────────────────────────────────────
    patient_stmt = select(User).where(User.role == UserRole.user)
    if org_id:
        patient_stmt = patient_stmt.where(User.organization_id == org_id)
    patient_result = await db.execute(patient_stmt)
    patients = patient_result.scalars().all()

    age_groups = {"0-18": 0, "19-35": 0, "36-55": 0, "56-70": 0, "70+": 0}
    blood_groups: dict = {}
    for p in patients:
        age = p.age or 0
        if age <= 18: age_groups["0-18"] += 1
        elif age <= 35: age_groups["19-35"] += 1
        elif age <= 55: age_groups["36-55"] += 1
        elif age <= 70: age_groups["56-70"] += 1
        else: age_groups["70+"] += 1

        bg = p.blood_group or "Unknown"
        blood_groups[bg] = blood_groups.get(bg, 0) + 1

    # ── 3. Department Load ─────────────────────────────────────────────────────
    dept_stmt = select(Department)
    if org_id:
        dept_stmt = dept_stmt.where(Department.organization_id == org_id)
    dept_result = await db.execute(dept_stmt)
    departments = dept_result.scalars().all()

    dept_load = []
    for dept in departments:
        # Count doctors in this department
        doc_count_stmt = select(func.count(User.id)).where(
            User.department == dept.name,
            User.role == UserRole.doctor
        )
        if org_id:
            doc_count_stmt = doc_count_stmt.where(User.organization_id == org_id)
        doc_count = await db.scalar(doc_count_stmt) or 0

        dept_load.append({
            "name": dept.name,
            "bed_count": dept.bed_count,
            "doctor_count": doc_count,
            "load_pct": min(int((doc_count / max(dept.bed_count, 1)) * 100), 100),
        })

    # ── 4. AI Training Performance ────────────────────────────────────────────
    report_stmt = select(TrainingReport).where(TrainingReport.created_at >= since)
    if org_id:
        report_stmt = report_stmt.where(TrainingReport.organization_id == org_id)
    report_result = await db.execute(report_stmt)
    reports = report_result.scalars().all()

    scores = [r.score for r in reports if r.score is not None]
    alignments = [r.alignment_with_expert for r in reports if r.alignment_with_expert is not None]

    ai_stats = {
        "total_simulations": len(reports),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "avg_alignment": round(sum(alignments) / len(alignments), 1) if alignments else 0,
        "prediction_accuracy": round(sum(alignments) / len(alignments), 1) if alignments else 0,
    }

    # ── 5. Online Doctors ─────────────────────────────────────────────────────
    online_stmt = select(func.count(User.id)).where(
        User.role == UserRole.doctor,
        User.is_online == True
    )
    if org_id:
        online_stmt = online_stmt.where(User.organization_id == org_id)
    online_doctors = await db.scalar(online_stmt) or 0

    total_doc_stmt = select(func.count(User.id)).where(User.role == UserRole.doctor)
    if org_id:
        total_doc_stmt = total_doc_stmt.where(User.organization_id == org_id)
    total_doctors = await db.scalar(total_doc_stmt) or 0

    # ── 6. Recent Alerts ──────────────────────────────────────────────────────
    alert_stmt = select(Notification).where(
        Notification.type == "critical",
        Notification.created_at >= since
    )
    if org_id:
        alert_stmt = alert_stmt.where(Notification.organization_id == org_id)
    alert_result = await db.execute(alert_stmt.order_by(Notification.created_at.desc()).limit(5))
    recent_alerts = alert_result.scalars().all()

    return {
        "call_volume_trend": volume_trend,
        "severity_distribution": [
            {"name": k, "value": v} for k, v in severity_counts.items() if v > 0
        ],
        "call_type_breakdown": [
            {"name": k, "value": v} for k, v in call_type_counts.items() if v > 0
        ],
        "age_demographics": [
            {"group": k, "count": v} for k, v in age_groups.items()
        ],
        "blood_group_distribution": [
            {"group": k, "count": v} for k, v in blood_groups.items()
        ],
        "department_load": dept_load,
        "ai_training_stats": ai_stats,
        "doctor_availability": {
            "online": online_doctors,
            "total": total_doctors,
            "availability_pct": round((online_doctors / max(total_doctors, 1)) * 100, 1)
        },
        "total_patients": len(patients),
        "total_calls_period": len(all_calls),
        "recent_critical_alerts": [
            {"title": a.title, "created_at": a.created_at.isoformat()} for a in recent_alerts
        ],
        "period_days": days,
    }
