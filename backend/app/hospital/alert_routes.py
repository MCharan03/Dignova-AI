from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List

from ..extensions import get_db
from ..models import User, UserRole, UserVitals, Notification, AuditLog
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["Health Alerts"])

# Dangerous vital thresholds
ALERT_THRESHOLDS = {
    "heart_rate_high": 110,
    "heart_rate_low": 45,
    "systolic_bp_high": 180,
    "systolic_bp_low": 80,
    "spo2_low": 90,
    "temperature_high": 39.5,
    "temperature_low": 35.0,
    "blood_glucose_high": 250,
    "blood_glucose_low": 55,
}


def _check_vitals_for_alert(vitals: UserVitals) -> list[dict]:
    """Check a single vitals record against danger thresholds."""
    alerts = []
    if vitals.heart_rate:
        if vitals.heart_rate > ALERT_THRESHOLDS["heart_rate_high"]:
            alerts.append({"field": "heart_rate", "value": vitals.heart_rate, "severity": "HIGH", "msg": f"Heart rate critically high: {vitals.heart_rate} bpm"})
        elif vitals.heart_rate < ALERT_THRESHOLDS["heart_rate_low"]:
            alerts.append({"field": "heart_rate", "value": vitals.heart_rate, "severity": "HIGH", "msg": f"Heart rate critically low: {vitals.heart_rate} bpm"})
    if vitals.systolic_bp:
        if vitals.systolic_bp > ALERT_THRESHOLDS["systolic_bp_high"]:
            alerts.append({"field": "systolic_bp", "value": vitals.systolic_bp, "severity": "CRITICAL", "msg": f"Hypertensive crisis: BP {vitals.systolic_bp}/{vitals.diastolic_bp}"})
        elif vitals.systolic_bp < ALERT_THRESHOLDS["systolic_bp_low"]:
            alerts.append({"field": "systolic_bp", "value": vitals.systolic_bp, "severity": "HIGH", "msg": f"Hypotension detected: BP {vitals.systolic_bp}"})
    if vitals.spo2 and vitals.spo2 < ALERT_THRESHOLDS["spo2_low"]:
        alerts.append({"field": "spo2", "value": vitals.spo2, "severity": "CRITICAL", "msg": f"Critical SpO2: {vitals.spo2}% — Hypoxia risk"})
    if vitals.temperature:
        if vitals.temperature > ALERT_THRESHOLDS["temperature_high"]:
            alerts.append({"field": "temperature", "value": vitals.temperature, "severity": "HIGH", "msg": f"High fever: {vitals.temperature}°C"})
        elif vitals.temperature < ALERT_THRESHOLDS["temperature_low"]:
            alerts.append({"field": "temperature", "value": vitals.temperature, "severity": "HIGH", "msg": f"Hypothermia risk: {vitals.temperature}°C"})
    if vitals.blood_glucose:
        if vitals.blood_glucose > ALERT_THRESHOLDS["blood_glucose_high"]:
            alerts.append({"field": "blood_glucose", "value": vitals.blood_glucose, "severity": "HIGH", "msg": f"Severe hyperglycemia: {vitals.blood_glucose} mg/dL"})
        elif vitals.blood_glucose < ALERT_THRESHOLDS["blood_glucose_low"]:
            alerts.append({"field": "blood_glucose", "value": vitals.blood_glucose, "severity": "CRITICAL", "msg": f"Severe hypoglycemia: {vitals.blood_glucose} mg/dL"})
    return alerts


@router.get("/scan")
async def scan_patient_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scan all patients in org for dangerous vitals trends.
    Generates Notification entries for any at-risk patients.
    Returns summary of alerts found.
    """
    if current_user.role not in [UserRole.doctor, UserRole.org_admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Clinical privileges required.")

    # Get all patients in org
    stmt = select(User).where(User.role == UserRole.user)
    if current_user.organization_id:
        stmt = stmt.where(User.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    patients = result.scalars().all()

    alert_summary = []
    generated_notifications = 0
    cutoff = datetime.utcnow() - timedelta(hours=24)

    for patient in patients:
        # Get latest vitals (last 24h)
        vitals_result = await db.execute(
            select(UserVitals)
            .where(UserVitals.user_id == patient.id, UserVitals.recorded_at >= cutoff)
            .order_by(UserVitals.recorded_at.desc())
            .limit(1)
        )
        latest = vitals_result.scalars().first()
        if not latest:
            continue

        alerts = _check_vitals_for_alert(latest)
        if not alerts:
            continue

        # Determine overall severity
        has_critical = any(a["severity"] == "CRITICAL" for a in alerts)
        severity_label = "CRITICAL" if has_critical else "HIGH"

        alert_msg = f"Patient {patient.name}: " + "; ".join(a["msg"] for a in alerts)

        # Notify doctor/org_admin
        db.add(Notification(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            title=f"[WARN] Health Alert — {patient.name}",
            message=alert_msg,
            type="critical" if has_critical else "warning",
            category="alert",
            link=f"/doctor/patient/{patient.id}"
        ))

        # Also notify patient
        db.add(Notification(
            user_id=patient.id,
            organization_id=current_user.organization_id,
            title="[WARN] Abnormal Vitals Detected",
            message="Your recent vitals show concerning values. Please contact your doctor.",
            type="critical" if has_critical else "warning",
            category="alert",
        ))

        db.add(AuditLog(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            action="alert.vitals_flag",
            target_type="user",
            target_id=patient.id,
            details={"alerts": alerts, "severity": severity_label}
        ))

        generated_notifications += 2
        alert_summary.append({
            "patient_id": patient.id,
            "patient_name": patient.name,
            "severity": severity_label,
            "alerts": alerts,
        })

    await db.commit()

    return {
        "scan_timestamp": datetime.utcnow().isoformat(),
        "patients_scanned": len(patients),
        "alerts_found": len(alert_summary),
        "notifications_created": generated_notifications,
        "at_risk_patients": alert_summary,
    }


@router.get("/my-vitals-status")
async def get_my_vitals_alert_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Patient checks if their own vitals are in a danger zone."""
    vitals = await db.scalar(
        select(UserVitals)
        .where(UserVitals.user_id == current_user.id)
        .order_by(UserVitals.recorded_at.desc())
    )
    if not vitals:
        return {"status": "no_data", "alerts": []}

    alerts = _check_vitals_for_alert(vitals)
    has_critical = any(a["severity"] == "CRITICAL" for a in alerts)

    return {
        "status": "CRITICAL" if has_critical else ("HIGH" if alerts else "NORMAL"),
        "alerts": alerts,
        "recorded_at": vitals.recorded_at.isoformat() if vitals.recorded_at else None,
    }


@router.post("/vitals-webhook")
async def vitals_iot_webhook(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    IoT/wearable webhook endpoint — receives vitals and auto-triggers alerts.
    Expected payload: { user_id, heart_rate, systolic_bp, diastolic_bp, spo2, temperature, blood_glucose }
    """
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required.")

    patient = await db.scalar(select(User).where(User.id == user_id))
    if not patient:
        raise HTTPException(status_code=404, detail="User not found.")

    # Store vitals
    vitals = UserVitals(
        user_id=user_id,
        heart_rate=data.get("heart_rate"),
        systolic_bp=data.get("systolic_bp"),
        diastolic_bp=data.get("diastolic_bp"),
        spo2=data.get("spo2"),
        temperature=data.get("temperature"),
        blood_glucose=data.get("blood_glucose"),
        source="iot"
    )
    db.add(vitals)
    await db.commit()

    alerts = _check_vitals_for_alert(vitals)
    if alerts:
        db.add(Notification(
            user_id=user_id,
            title="[WARN] Wearable Alert: Abnormal Vitals",
            message="; ".join(a["msg"] for a in alerts),
            type="critical",
            category="alert",
        ))
        await db.commit()

    return {"stored": True, "alerts_triggered": len(alerts), "alerts": alerts}
