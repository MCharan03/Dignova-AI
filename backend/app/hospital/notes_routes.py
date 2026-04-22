from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from ..models import User, UserRole
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/hospital/notes", tags=["Clinical Notes"])


# ═══════════════════════════════════════════════════
# IN-MEMORY CLINICAL NOTES (production: DB model)
# ═══════════════════════════════════════════════════

_notes_store: list = []
_note_id_counter = 0


class NoteCreate(BaseModel):
    content: str
    type: str = "clinical"  # clinical, observation, plan


def _get_note_id():
    global _note_id_counter
    _note_id_counter += 1
    return _note_id_counter


@router.get("/{patient_id}")
async def get_patient_notes(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get clinical notes for a patient — doctors and admins only."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin, UserRole.doctor]:
        raise HTTPException(status_code=403, detail="Requires clinical privileges.")

    patient_notes = [n for n in _notes_store if n["patient_id"] == int(patient_id)]
    patient_notes.sort(key=lambda x: x["created_at"], reverse=True)
    return patient_notes


@router.post("/{patient_id}")
async def add_patient_note(
    patient_id: int,
    note_in: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a clinical note to a patient's record."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin, UserRole.doctor]:
        raise HTTPException(status_code=403, detail="Requires clinical privileges.")

    patient = await db.scalar(select(User).where(User.id == int(patient_id)))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_note = {
        "id": _get_note_id(),
        "patient_id": int(patient_id),
        "doctor_id": current_user.id,
        "doctor_name": current_user.name,
        "content": note_in.content,
        "type": note_in.type,
        "created_at": datetime.utcnow().isoformat(),
    }
    _notes_store.append(new_note)

    return {"message": "Note added.", "id": new_note["id"]}
