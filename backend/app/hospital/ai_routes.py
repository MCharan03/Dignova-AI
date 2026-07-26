from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import random

from ..extensions import get_db
from ..models import User, UserRole, UserVitals, Call
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI Prediction Engine"])


# ═══════════════════════════════════════════════════
# AI HEALTH PREDICTION ENGINE
# ═══════════════════════════════════════════════════

def analyze_vitals_trend(vitals_list):
    """Analyze vitals trend from recent readings."""
    if not vitals_list:
        return "stable", 0

    # Calculate averages for key metrics
    hr_vals = [v.heart_rate for v in vitals_list if v.heart_rate]
    bp_vals = [v.systolic_bp for v in vitals_list if v.systolic_bp]
    spo2_vals = [v.spo2 for v in vitals_list if v.spo2]
    temp_vals = [v.temperature for v in vitals_list if v.temperature]
    glucose_vals = [v.blood_glucose for v in vitals_list if v.blood_glucose]

    risk_score = 15  # Base risk
    flags = []

    # Heart rate analysis
    if hr_vals:
        avg_hr = sum(hr_vals) / len(hr_vals)
        if avg_hr > 100:
            risk_score += 15
            flags.append("tachycardia_risk")
        elif avg_hr < 55:
            risk_score += 10
            flags.append("bradycardia_risk")
        # Variability check (HR instability)
        if len(hr_vals) > 3:
            hr_std = (sum((x - avg_hr) ** 2 for x in hr_vals) / len(hr_vals)) ** 0.5
            if hr_std > 15:
                risk_score += 10
                flags.append("hr_instability")

    # Blood pressure analysis
    if bp_vals:
        avg_bp = sum(bp_vals) / len(bp_vals)
        if avg_bp > 140:
            risk_score += 20
            flags.append("hypertension_risk")
        elif avg_bp < 90:
            risk_score += 15
            flags.append("hypotension_risk")

    # SpO2 analysis
    if spo2_vals:
        avg_spo2 = sum(spo2_vals) / len(spo2_vals)
        if avg_spo2 < 92:
            risk_score += 25
            flags.append("hypoxia_severe")
        elif avg_spo2 < 95:
            risk_score += 12
            flags.append("hypoxia_mild")

    # Temperature analysis
    if temp_vals:
        avg_temp = sum(temp_vals) / len(temp_vals)
        if avg_temp > 38.0:
            risk_score += 15
            flags.append("fever")
        elif avg_temp < 35.5:
            risk_score += 10
            flags.append("hypothermia")

    # Glucose analysis
    if glucose_vals:
        avg_glucose = sum(glucose_vals) / len(glucose_vals)
        if avg_glucose > 200:
            risk_score += 20
            flags.append("hyperglycemia")
        elif avg_glucose < 60:
            risk_score += 18
            flags.append("hypoglycemia")
        elif avg_glucose > 140:
            risk_score += 8
            flags.append("prediabetic_range")

    # Trend analysis - compare first half to second half of readings
    trend = "stable"
    if len(hr_vals) >= 4:
        mid = len(hr_vals) // 2
        first_half_avg = sum(hr_vals[:mid]) / mid
        second_half_avg = sum(hr_vals[mid:]) / len(hr_vals[mid:])
        if second_half_avg > first_half_avg * 1.08:
            trend = "declining"
            risk_score += 5
        elif second_half_avg < first_half_avg * 0.92:
            trend = "improving"
            risk_score -= 5

    risk_score = max(5, min(risk_score, 95))
    return trend, risk_score, flags


def generate_predictions(flags, risk_score, user):
    """Generate condition predictions based on flags."""
    predictions = []
    recommendations = []

    if "hypertension_risk" in flags:
        predictions.append({
            "condition": "Hypertensive Crisis",
            "probability": min(0.3 + (risk_score / 200), 0.85),
            "timeframe": "Next 7 days"
        })
        recommendations.append("Monitor blood pressure twice daily and reduce sodium intake.")

    if "tachycardia_risk" in flags:
        predictions.append({
            "condition": "Cardiac Arrhythmia",
            "probability": min(0.2 + (risk_score / 250), 0.7),
            "timeframe": "Next 14 days"
        })
        recommendations.append("Consider ECG monitoring and avoid caffeine and stimulants.")

    if "hypoxia_severe" in flags or "hypoxia_mild" in flags:
        predictions.append({
            "condition": "Respiratory Distress",
            "probability": 0.6 if "hypoxia_severe" in flags else 0.3,
            "timeframe": "Next 48 hours" if "hypoxia_severe" in flags else "Next 7 days"
        })
        recommendations.append("Seek immediate evaluation if SpO2 drops below 92%.")

    if "hyperglycemia" in flags or "prediabetic_range" in flags:
        predictions.append({
            "condition": "Type 2 Diabetes Progression",
            "probability": 0.5 if "hyperglycemia" in flags else 0.25,
            "timeframe": "Next 30 days"
        })
        recommendations.append("Schedule HbA1c test and review dietary habits.")

    if "hypoglycemia" in flags:
        predictions.append({
            "condition": "Hypoglycemic Episode",
            "probability": 0.55,
            "timeframe": "Next 24 hours"
        })
        recommendations.append("Keep fast-acting glucose available. Consult endocrinologist.")

    if "fever" in flags:
        predictions.append({
            "condition": "Infectious Process",
            "probability": 0.4,
            "timeframe": "Next 48 hours"
        })
        recommendations.append("Monitor temperature every 4 hours. Stay hydrated.")

    if "hr_instability" in flags:
        predictions.append({
            "condition": "Autonomic Dysfunction",
            "probability": 0.25,
            "timeframe": "Next 30 days"
        })
        recommendations.append("Consider Holter monitoring for detailed heart rhythm analysis.")

    # Default predictions if no flags
    if not predictions:
        predictions.append({
            "condition": "General Wellness",
            "probability": 0.1,
            "timeframe": "Ongoing"
        })
        recommendations.append("Maintain current health regimen and regular check-ups.")
        recommendations.append("Stay physically active with 30 minutes of daily exercise.")
        recommendations.append("Ensure adequate sleep (7-8 hours) and balanced nutrition.")

    # Add universal recommendations
    if risk_score > 40:
        recommendations.append("Schedule a follow-up consultation within 48 hours.")
    if risk_score > 60:
        recommendations.insert(0, "[WARN] URGENT: Immediate medical review recommended.")

    return predictions, recommendations


@router.get("/predict/{patient_id}")
async def predict_patient_health(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI health prediction for a specific patient - available to doctors and admins."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin, UserRole.doctor]:
        raise HTTPException(status_code=403, detail="Requires clinical privileges.")

    patient = await db.scalar(select(User).where(User.id == patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Fetch last 30 vitals readings
    vitals_stmt = select(UserVitals).where(
        UserVitals.user_id == patient_id
    ).order_by(UserVitals.recorded_at.desc()).limit(30)
    result = await db.execute(vitals_stmt)
    vitals_list = result.scalars().all()

    if not vitals_list:
        return {
            "risk_level": "UNKNOWN",
            "risk_score": 0,
            "predictions": [{"condition": "Insufficient data", "probability": 0, "timeframe": "N/A"}],
            "recommendations": ["Record vitals to enable AI health forecasting."],
            "trend": "unknown"
        }

    trend, risk_score, flags = analyze_vitals_trend(vitals_list)
    predictions, recommendations = generate_predictions(flags, risk_score, patient)

    risk_level = "LOW" if risk_score < 30 else "MODERATE" if risk_score < 60 else "HIGH"

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "predictions": predictions,
        "recommendations": recommendations,
        "trend": trend
    }


@router.get("/predict/me")
async def predict_my_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI health prediction for the logged-in patient."""
    vitals_stmt = select(UserVitals).where(
        UserVitals.user_id == current_user.id
    ).order_by(UserVitals.recorded_at.desc()).limit(30)
    result = await db.execute(vitals_stmt)
    vitals_list = result.scalars().all()

    if not vitals_list:
        return {
            "risk_level": "UNKNOWN",
            "risk_score": 0,
            "predictions": [{"condition": "Insufficient data", "probability": 0, "timeframe": "N/A"}],
            "recommendations": ["Start recording your vitals to enable AI health forecasting."],
            "trend": "unknown"
        }

    trend, risk_score, flags = analyze_vitals_trend(vitals_list)
    predictions, recommendations = generate_predictions(flags, risk_score, current_user)

    risk_level = "LOW" if risk_score < 30 else "MODERATE" if risk_score < 60 else "HIGH"

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "predictions": predictions,
        "recommendations": recommendations,
        "trend": trend
    }
