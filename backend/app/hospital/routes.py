from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from ..extensions import get_db
from ..models import Organization, TrainingScenario, TrainingReport, User, UserRole, DoctorTier
from ..utils.auth import get_current_user

router = APIRouter()

# --- Schemas ---
class OrganizationResponse(BaseModel):
    id: int
    name: str
    org_code: str
    subscription_tier: str
    primary_color: str
    accent_color: str

    class Config:
        from_attributes = True

class ScenarioResponse(BaseModel):
    id: int
    title: str
    difficulty: str
    patient_personality: str
    category: str = "General Medicine"
    initial_symptoms: Optional[str] = None
    expert_diagnosis: Optional[str] = None
    expert_action_plan: Optional[list] = None
    created_by: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CreateScenarioRequest(BaseModel):
    title: str
    difficulty: str = "intermediate"
    patient_personality: str = "distressed"
    category: str = "General Medicine"
    initial_symptoms: str
    expert_diagnosis: str
    expert_action_plan: list

class UpdateScenarioRequest(BaseModel):
    title: Optional[str] = None
    difficulty: Optional[str] = None
    patient_personality: Optional[str] = None
    category: Optional[str] = None
    initial_symptoms: Optional[str] = None
    expert_diagnosis: Optional[str] = None
    expert_action_plan: Optional[list] = None
    is_active: Optional[bool] = None

class TrainingStartResponse(BaseModel):
    report_id: int
    scenario: ScenarioResponse

# --- Routes ---

@router.get("/organization/me", response_model=OrganizationResponse)
async def get_my_organization(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if not current_user.organization_id:
        raise HTTPException(status_code=404, detail="User not linked to any organization.")
    
    stmt = select(Organization).where(Organization.id == current_user.organization_id)
    org = await db.scalar(stmt)
    return org

@router.get("/training/scenarios", response_model=List[ScenarioResponse])
async def list_training_scenarios(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List ghost replay scenarios. Super Admins see all, others only their organization."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin, UserRole.doctor]:
        raise HTTPException(status_code=403, detail="Access denied.")
    
    stmt = select(TrainingScenario).where(TrainingScenario.is_active == True)
    
    # ORG SCOPING: Super Admins are global, others are scoped
    if current_user.role != UserRole.super_admin:
        if not current_user.organization_id:
            raise HTTPException(status_code=403, detail="User not linked to an organization.")
        stmt = stmt.where(TrainingScenario.organization_id == current_user.organization_id)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/training/scenarios/{scenario_id}")
async def get_scenario_details(
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch full ghost data for a specific training replay."""
    stmt = select(TrainingScenario).where(TrainingScenario.id == scenario_id)
    scenario = await db.scalar(stmt)
    
    if not scenario or scenario.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Scenario not found.")
        
    return scenario

@router.post("/training/start/{scenario_id}")
async def start_training_session(
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Initializes a training report for the intern."""
    from ..models import TrainingReport
    
    # Check if scenario exists
    stmt = select(TrainingScenario).where(TrainingScenario.id == scenario_id)
    scenario = await db.scalar(stmt)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    report = TrainingReport(
        user_id=current_user.id,
        scenario_id=scenario_id,
        score=0,
        alignment_with_expert=0.0,
        feedback="Simulation Initialized"
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return {"report_id": report.id, "scenario": scenario}

class DiagnosisSubmission(BaseModel):
    diagnosis: str

@router.post("/training/submit/{scenario_id}")
async def submit_training_diagnosis(
    scenario_id: int,
    submission: DiagnosisSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Evaluates an intern's diagnosis and triggers n8n alert."""
    from ..services.n8n_services import N8nService
    from ..models import TrainingReport
    
    scenario = await db.get(TrainingScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    alignment = 85.0
    feedback = f"Simulation Evaluation Complete. Alignment: {alignment}%."

    report = TrainingReport(
        user_id=current_user.id,
        scenario_id=scenario_id,
        score=int(alignment),
        alignment_with_expert=alignment,
        feedback=feedback
    )
    db.add(report)
    await db.commit()

    if current_user.telegram_chat_id:
        await N8nService.trigger_workflow("dignova-training-result", {
            "telegram_chat_id": current_user.telegram_chat_id,
            "intern_name":      current_user.name,
            "score":            str(int(alignment)),
            "alignment":        f"{alignment}%",
            "feedback":         feedback
        })

    return {
        "status": "evaluated",
        "alignment_with_expert": alignment,
        "feedback": feedback
    }


# ═══════════════════════════════════════════════════
# AI TRAINING EVALUATION ENGINE
# ═══════════════════════════════════════════════════

class DiagnosisSubmission(BaseModel):
    diagnosis: str

def _extract_medical_keywords(text: str) -> set:
    """Extract normalized medical keywords from diagnosis text."""
    import re
    stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
                  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
                  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
                  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
                  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
                  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
                  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
                  'and', 'but', 'or', 'if', 'while', 'that', 'this', 'these', 'those',
                  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
                  'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
                  'who', 'whom', 'patient', 'present', 'presenting', 'shows', 'suggest',
                  'indicates', 'recommend', 'assessment', 'plan', 'consider'}
    words = re.findall(r'[a-z]+', text.lower())
    return {w for w in words if w not in stop_words and len(w) > 2}


def _calculate_alignment(intern_text: str, expert_text: str, expert_actions: list) -> dict:
    """Calculate alignment score using keyword-based NLP similarity."""
    intern_kw = _extract_medical_keywords(intern_text)
    expert_kw = _extract_medical_keywords(expert_text)

    # Also extract keywords from action plan descriptions
    for action in (expert_actions or []):
        if isinstance(action, dict) and 'description' in action:
            expert_kw.update(_extract_medical_keywords(action['description']))

    if not expert_kw:
        return {"alignment": 50.0, "matched": [], "missed": [], "extra": []}

    # Jaccard-style similarity with boosted exact matches
    matched = intern_kw & expert_kw
    missed = expert_kw - intern_kw
    extra = intern_kw - expert_kw

    # Weighted scoring: exact matches are gold, partial coverage matters
    if len(expert_kw) == 0:
        alignment = 50.0
    else:
        precision = len(matched) / max(len(intern_kw), 1)
        recall = len(matched) / len(expert_kw)
        if precision + recall == 0:
            alignment = 5.0
        else:
            f1 = 2 * (precision * recall) / (precision + recall)
            alignment = round(f1 * 100, 1)

    return {
        "alignment": min(alignment, 100.0),
        "matched": sorted(list(matched))[:15],
        "missed": sorted(list(missed))[:15],
        "extra": sorted(list(extra))[:10],
    }


def _generate_ai_feedback(alignment_data: dict, difficulty: str) -> dict:
    """Generate structured AI feedback based on alignment analysis."""
    alignment = alignment_data["alignment"]
    matched = alignment_data["matched"]
    missed = alignment_data["missed"]

    # Skill categorization
    skills = {
        "diagnostic_accuracy": min(alignment * 1.1, 100),
        "clinical_reasoning": min(alignment * 0.95 + (len(matched) * 2), 100),
        "treatment_planning": min(alignment * 0.85 + (5 if not missed else 0), 100),
        "risk_assessment": min(alignment * 0.9 + (10 if alignment > 60 else 0), 100),
        "communication": min(alignment * 0.8 + 20, 100),
    }

    # Generate feedback text
    if alignment >= 85:
        grade = "EXCELLENT"
        summary = "Outstanding diagnostic performance. Your analysis closely mirrors expert-level clinical reasoning."
        improvements = ["Consider adding differential diagnoses to strengthen your assessment."]
    elif alignment >= 65:
        grade = "PROFICIENT"
        summary = "Solid clinical assessment with good foundational reasoning. Some expert-level nuances were missed."
        improvements = [f"Review key concept: '{m}'" for m in missed[:3]] if missed else ["Continue refining your approach."]
    elif alignment >= 40:
        grade = "DEVELOPING"
        summary = "Shows understanding of core concepts but needs improvement in clinical precision."
        improvements = [f"Study critical term: '{m}' — this was in the expert diagnosis" for m in missed[:4]]
    else:
        grade = "NEEDS_IMPROVEMENT"
        summary = "Significant gaps in diagnostic alignment. Recommend reviewing fundamentals."
        improvements = [f"Critical miss: '{m}'" for m in missed[:5]]
        improvements.append("Consider reviewing the symptom-to-diagnosis mapping for this scenario type.")

    # Difficulty multiplier
    difficulty_mult = {"beginner": 0.8, "intermediate": 1.0, "advanced": 1.2}.get(difficulty, 1.0)
    adjusted_score = int(min(alignment * difficulty_mult, 100))

    return {
        "grade": grade,
        "score": adjusted_score,
        "summary": summary,
        "improvements": improvements,
        "skills": {k: round(v, 1) for k, v in skills.items()},
        "matched_concepts": matched,
        "missed_concepts": missed[:8],
    }


@router.post("/training/submit/{scenario_id}")
async def submit_training_diagnosis(
    scenario_id: int,
    submission: DiagnosisSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI-powered evaluation of intern's diagnosis against expert standard."""
    from ..models import TrainingReport
    
    # Fetch scenario
    scenario = await db.scalar(
        select(TrainingScenario).where(TrainingScenario.id == scenario_id)
    )
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    # Run AI alignment analysis
    alignment_data = _calculate_alignment(
        submission.diagnosis,
        scenario.expert_diagnosis,
        scenario.expert_action_plan or []
    )

    # Generate structured AI feedback
    feedback_data = _generate_ai_feedback(alignment_data, scenario.difficulty)

    # Save/update training report
    existing_report = await db.scalar(
        select(TrainingReport).where(
            TrainingReport.intern_id == current_user.id,
            TrainingReport.scenario_id == scenario_id,
        ).order_by(TrainingReport.created_at.desc())
    )

    if existing_report:
        existing_report.score = feedback_data["score"]
        existing_report.alignment_with_expert = alignment_data["alignment"]
        existing_report.feedback = feedback_data["summary"]
        existing_report.transcript = submission.diagnosis
    else:
        report = TrainingReport(
            organization_id=current_user.organization_id,
            intern_id=current_user.id,
            scenario_id=scenario_id,
            score=feedback_data["score"],
            alignment_with_expert=alignment_data["alignment"],
            feedback=feedback_data["summary"],
            transcript=submission.diagnosis,
        )
        db.add(report)

    await db.commit()

    return {
        "alignment_with_expert": round(alignment_data["alignment"], 1),
        "grade": feedback_data["grade"],
        "score": feedback_data["score"],
        "summary": feedback_data["summary"],
        "improvements": feedback_data["improvements"],
        "skills": feedback_data["skills"],
        "matched_concepts": feedback_data["matched_concepts"],
        "missed_concepts": feedback_data["missed_concepts"],
    }


# ═══════════════════════════════════════════════════
# INTERN PROGRESS & SKILL MATRIX
# ═══════════════════════════════════════════════════

@router.get("/training/progress")
async def get_intern_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get intern's training progress, skill evolution, and performance metrics."""
    from ..models import TrainingReport
    from sqlalchemy import func, desc

    # All reports for this intern
    reports_stmt = select(TrainingReport).where(
        TrainingReport.intern_id == current_user.id
    ).order_by(TrainingReport.created_at.asc())
    result = await db.execute(reports_stmt)
    reports = result.scalars().all()

    if not reports:
        return {
            "total_simulations": 0,
            "avg_score": 0,
            "avg_alignment": 0,
            "best_score": 0,
            "skill_level": "NOVICE",
            "xp": 0,
            "level": 1,
            "next_level_xp": 100,
            "score_history": [],
            "recent_reports": [],
            "strengths": [],
            "weaknesses": [],
            "recommended_difficulty": "beginner",
        }

    total = len(reports)
    scores = [r.score for r in reports if r.score]
    alignments = [r.alignment_with_expert for r in reports if r.alignment_with_expert]

    avg_score = sum(scores) / len(scores) if scores else 0
    avg_alignment = sum(alignments) / len(alignments) if alignments else 0
    best_score = max(scores) if scores else 0

    # XP system: each simulation earns XP based on score
    xp = sum(max(s, 5) for s in scores)
    level = 1 + xp // 100
    next_level_xp = (level) * 100

    # Skill level based on avg alignment
    if avg_alignment >= 80:
        skill_level = "EXPERT"
    elif avg_alignment >= 60:
        skill_level = "ADVANCED"
    elif avg_alignment >= 40:
        skill_level = "INTERMEDIATE"
    elif avg_alignment >= 20:
        skill_level = "BEGINNER"
    else:
        skill_level = "NOVICE"

    # Score history for trend chart
    score_history = [{
        "attempt": i + 1,
        "score": r.score or 0,
        "alignment": r.alignment_with_expert or 0,
        "date": r.created_at.isoformat() if r.created_at else "",
        "scenario_id": r.scenario_id,
    } for i, r in enumerate(reports)]

    # Recent reports with scenario titles
    recent = reports[-5:]
    recent_reports = []
    for r in reversed(recent):
        scenario = await db.scalar(
            select(TrainingScenario).where(TrainingScenario.id == r.scenario_id)
        ) if r.scenario_id else None
        recent_reports.append({
            "id": r.id,
            "scenario_title": scenario.title if scenario else "Unknown",
            "difficulty": scenario.difficulty if scenario else "unknown",
            "score": r.score,
            "alignment": r.alignment_with_expert,
            "feedback": r.feedback,
            "date": r.created_at.isoformat() if r.created_at else "",
        })

    # Adaptive difficulty recommendation
    if avg_alignment >= 75 and total >= 3:
        recommended_difficulty = "advanced"
    elif avg_alignment >= 45 and total >= 2:
        recommended_difficulty = "intermediate"
    else:
        recommended_difficulty = "beginner"

    # Trend direction
    if len(scores) >= 3:
        mid = len(scores) // 2
        first_half = sum(scores[:mid]) / mid
        second_half = sum(scores[mid:]) / len(scores[mid:])
        trend = "improving" if second_half > first_half * 1.05 else "declining" if second_half < first_half * 0.95 else "stable"
    else:
        trend = "insufficient_data"

    return {
        "total_simulations": total,
        "avg_score": round(avg_score, 1),
        "avg_alignment": round(avg_alignment, 1),
        "best_score": best_score,
        "skill_level": skill_level,
        "xp": xp,
        "level": level,
        "next_level_xp": next_level_xp,
        "score_history": score_history,
        "recent_reports": recent_reports,
        "recommended_difficulty": recommended_difficulty,
        "trend": trend,
    }


# ═══════════════════════════════════════════════════
# DOCTOR TRAINING LAB — SCENARIO CRUD
# ═══════════════════════════════════════════════════

def _require_doctor_or_admin(user: User):
    """Guard: Only experienced/mid-range doctors, org_admins, or super_admins can manage scenarios."""
    if user.role == UserRole.super_admin or user.role == UserRole.org_admin:
        return
    if user.role == UserRole.doctor and user.tier != DoctorTier.intern:
        return
    raise HTTPException(status_code=403, detail="Only experienced doctors and admins can manage training scenarios.")


@router.post("/training/scenarios", response_model=ScenarioResponse)
async def create_training_scenario(
    payload: CreateScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new training scenario. Doctors author clinical cases for interns."""
    _require_doctor_or_admin(current_user)

    if not current_user.organization_id and current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="You must be linked to an organization.")

    scenario = TrainingScenario(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        title=payload.title,
        difficulty=payload.difficulty,
        patient_personality=payload.patient_personality,
        category=payload.category,
        initial_symptoms=payload.initial_symptoms,
        expert_diagnosis=payload.expert_diagnosis,
        expert_action_plan=payload.expert_action_plan,
    )
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.put("/training/scenarios/{scenario_id}", response_model=ScenarioResponse)
async def update_training_scenario(
    scenario_id: int,
    payload: UpdateScenarioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing training scenario."""
    _require_doctor_or_admin(current_user)

    scenario = await db.scalar(
        select(TrainingScenario).where(TrainingScenario.id == scenario_id)
    )
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    # Org-scope check (super_admins bypass)
    if current_user.role != UserRole.super_admin:
        if scenario.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot edit scenarios from other organizations.")

    # Apply only provided fields
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(scenario, field, value)

    await db.commit()
    await db.refresh(scenario)
    return scenario


@router.delete("/training/scenarios/{scenario_id}")
async def archive_training_scenario(
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft-delete (archive) a training scenario."""
    _require_doctor_or_admin(current_user)

    scenario = await db.scalar(
        select(TrainingScenario).where(TrainingScenario.id == scenario_id)
    )
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    if current_user.role != UserRole.super_admin:
        if scenario.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot archive scenarios from other organizations.")

    scenario.is_active = False
    await db.commit()
    return {"status": "archived", "scenario_id": scenario_id}


# ═══════════════════════════════════════════════════
# DOCTOR VIEW — INTERN PERFORMANCE ACROSS SCENARIOS
# ═══════════════════════════════════════════════════

@router.get("/training/intern-performance")
async def get_intern_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get performance data for all interns in the doctor's organization."""
    _require_doctor_or_admin(current_user)

    org_id = current_user.organization_id

    # Get all interns in this org
    interns_stmt = select(User).where(
        User.organization_id == org_id,
        User.role == UserRole.doctor,
        User.tier == DoctorTier.intern
    )
    interns_result = await db.execute(interns_stmt)
    interns = interns_result.scalars().all()

    intern_data = []
    for intern in interns:
        # Get all reports for this intern
        reports_stmt = select(TrainingReport).where(
            TrainingReport.intern_id == intern.id
        ).order_by(TrainingReport.created_at.desc())
        reports_result = await db.execute(reports_stmt)
        reports = reports_result.scalars().all()

        scores = [r.score for r in reports if r.score is not None]
        alignments = [r.alignment_with_expert for r in reports if r.alignment_with_expert is not None]

        intern_data.append({
            "intern_id": intern.id,
            "intern_name": intern.name,
            "specialty": intern.specialty or "General",
            "total_simulations": len(reports),
            "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
            "avg_alignment": round(sum(alignments) / len(alignments), 1) if alignments else 0,
            "best_score": max(scores) if scores else 0,
            "recent_reports": [
                {
                    "scenario_id": r.scenario_id,
                    "score": r.score,
                    "alignment": r.alignment_with_expert,
                    "feedback": r.feedback,
                    "date": r.created_at.isoformat() if r.created_at else "",
                }
                for r in reports[:5]
            ],
        })

    # Org-wide scenario stats
    scenarios_stmt = select(TrainingScenario).where(
        TrainingScenario.organization_id == org_id
    )
    scenarios_result = await db.execute(scenarios_stmt)
    scenarios = scenarios_result.scalars().all()

    scenario_stats = []
    for s in scenarios:
        report_count_stmt = select(func.count(TrainingReport.id)).where(
            TrainingReport.scenario_id == s.id
        )
        count = await db.scalar(report_count_stmt) or 0

        avg_score_stmt = select(func.avg(TrainingReport.score)).where(
            TrainingReport.scenario_id == s.id
        )
        avg_sc = await db.scalar(avg_score_stmt) or 0

        # Get author name
        author_name = "System"
        if s.created_by:
            author = await db.scalar(select(User).where(User.id == s.created_by))
            if author:
                author_name = author.name

        scenario_stats.append({
            "id": s.id,
            "title": s.title,
            "difficulty": s.difficulty,
            "category": s.category or "General Medicine",
            "is_active": s.is_active,
            "author": author_name,
            "total_attempts": count,
            "avg_score": round(avg_sc, 1) if avg_sc else 0,
        })

    return {
        "interns": intern_data,
        "scenarios": scenario_stats,
        "total_interns": len(interns),
        "total_scenarios": len(scenarios),
    }
