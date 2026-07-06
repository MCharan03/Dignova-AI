from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from ..extensions import get_db
from ..models import AgencyEvent
from ..services.awareness_service import PassiveVisionAgent, WorkspaceContextStore
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/awareness", tags=["Awareness"])

@router.get("/context")
async def get_workspace_context(current_user = Depends(get_current_user)):
    """
    Get current active workspace context (patient name, document, summary).
    """
    return WorkspaceContextStore.get()

async def run_bg_scan(db: AsyncSession, user_email: str):
    """Run passive screen analysis and log agency event if anomaly detected."""
    import anyio
    
    # Run Pillow capture and Gemini API call in a thread pool to prevent blocking the event loop
    result = await anyio.to_thread.run_sync(PassiveVisionAgent.capture_and_analyze)
    
    if "error" not in result:
        anomalies = result.get("detected_anomalies", [])
        if anomalies:
            event = AgencyEvent(
                event_type="system_healing",
                message=f"Passive screen awareness flagged active alerts for {user_email}: {', '.join(anomalies)}",
                severity="warning",
                metadata_json={"anomalies": anomalies}
            )
            db.add(event)
            await db.commit()

@router.post("/trigger")
async def trigger_workspace_scan(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually trigger a passive workspace screen snapshot and analysis.
    Runs asynchronously in a background task to prevent blocking the HTTP response.
    """
    background_tasks.add_task(run_bg_scan, db, current_user.email)
    return {"status": "scan_initiated"}
