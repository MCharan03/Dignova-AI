from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select

from ..extensions import get_db
from ..models import AgencyTask
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/agency/tasks", tags=["Agency Tasks"])

class TaskCreatePayload(BaseModel):
    title: str
    description: Optional[str] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str]
    status: str
    result_summary: Optional[str]
    progress: int
    created_at: datetime
    completed_at: Optional[datetime]

@router.post("/create", response_model=TaskResponse)
async def create_background_task(
    payload: TaskCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Queue a new background task for Cherry to run asynchronously.
    """
    task = AgencyTask(
        title=payload.title,
        description=payload.description,
        status="pending",
        progress=0
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.get("", response_model=List[TaskResponse])
async def list_background_tasks(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all background tasks and their execution progress.
    """
    query = select(AgencyTask).order_by(AgencyTask.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()
