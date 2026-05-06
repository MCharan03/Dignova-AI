from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import asyncio, json

from ..extensions import get_db
from ..models import User, UserRole, Notification
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# ─── SSE Broadcaster ──────────────────────────────────────────────────────────
# Import the broadcaster from sos_routes to share the same registry
def _get_broadcaster():
    from .sos_routes import register_sse_subscriber, unregister_sse_subscriber
    return register_sse_subscriber, unregister_sse_subscriber


# ─── SSE Stream Endpoint ───────────────────────────────────────────────────────

@router.get("/stream")
async def notification_stream(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-Sent Events stream for real-time notification push.
    Client connects once and receives events as they are broadcast.
    """
    register_fn, unregister_fn = _get_broadcaster()
    queue = register_fn(current_user.id)

    async def event_generator():
        try:
            # Send initial heartbeat
            yield f"data: {json.dumps({'type': 'connected', 'user_id': current_user.id})}\n\n"

            while True:
                try:
                    # Wait for new notification, heartbeat every 25s
                    payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat to keep connection alive
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            unregister_fn(current_user.id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ─── Notification CRUD ────────────────────────────────────────────────────────

@router.get("/count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    return {"unread_count": count or 0}


@router.get("/list")
async def get_notifications(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifs = result.scalars().all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "category": n.category,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    await db.commit()
    return {"status": "marked_read"}


@router.put("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.commit()
    return {"status": "all_read"}
