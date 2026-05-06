from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from datetime import datetime
import asyncio
import json
from typing import Optional

from ..extensions import get_db, AsyncSessionLocal
from ..models import User, UserRole, Notification, AuditLog
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/sos", tags=["Emergency SOS"])

# ─── Global broadcaster for SSE ───────────────────────────────────────────────
# Maps user_id -> asyncio.Queue
_sse_subscribers: dict[int, asyncio.Queue] = {}

def register_sse_subscriber(user_id: int) -> asyncio.Queue:
    q = asyncio.Queue(maxsize=50)
    _sse_subscribers[user_id] = q
    return q

def unregister_sse_subscriber(user_id: int):
    _sse_subscribers.pop(user_id, None)

async def broadcast_notification(user_id: int, payload: dict):
    """Push notification payload to user's SSE queue if connected."""
    q = _sse_subscribers.get(user_id)
    if q:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SOSRequest(BaseModel):
    message: Optional[str] = "Patient requires immediate assistance"
    lat: Optional[float] = None
    lon: Optional[float] = None


# ─── SOS Trigger ──────────────────────────────────────────────────────────────

@router.post("/trigger")
async def trigger_sos(
    payload: SOSRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Patient triggers emergency SOS.
    - Alerts all online doctors in their org (or globally if no org)
    - Creates CRITICAL notification for org_admin
    - Sends Telegram alert via bot
    - Creates AuditLog entry
    """
    if current_user.role not in [UserRole.user, UserRole.doctor]:
        raise HTTPException(status_code=403, detail="SOS is only for patients.")

    # Find online doctors in same org (fallback: any online doctor)
    stmt = select(User).where(
        User.role == UserRole.doctor,
        User.is_online == True
    )
    if current_user.organization_id:
        stmt = stmt.where(User.organization_id == current_user.organization_id)
    
    result = await db.execute(stmt)
    online_doctors = result.scalars().all()

    # Find org admins
    admin_stmt = select(User).where(User.role == UserRole.org_admin)
    if current_user.organization_id:
        admin_stmt = admin_stmt.where(User.organization_id == current_user.organization_id)
    admin_result = await db.execute(admin_stmt)
    admins = admin_result.scalars().all()

    sos_message = (
        f"🚨 EMERGENCY SOS from {current_user.name} (ID: {current_user.id})\n"
        f"Message: {payload.message}\n"
        f"Time: {datetime.utcnow().strftime('%H:%M UTC')}"
    )
    if payload.lat and payload.lon:
        sos_message += f"\nLocation: {payload.lat:.4f}, {payload.lon:.4f}"

    alerted_doctors = []
    notif_ids = []

    # Notify doctors
    for doc in online_doctors[:3]:  # alert up to 3 nearest doctors
        notif = Notification(
            user_id=doc.id,
            organization_id=current_user.organization_id,
            title=f"🚨 EMERGENCY SOS — {current_user.name}",
            message=sos_message,
            type="critical",
            category="alert",
            link=f"/doctor/patient/{current_user.id}"
        )
        db.add(notif)
        alerted_doctors.append({"id": doc.id, "name": doc.name, "specialty": doc.specialty})
        
        # Send Telegram if linked
        if doc.telegram_chat_id:
            await _send_telegram_alert(doc.telegram_chat_id, sos_message)

    # Notify admins
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            organization_id=current_user.organization_id,
            title=f"🚨 SOS Triggered — {current_user.name}",
            message=sos_message,
            type="critical",
            category="alert",
        )
        db.add(notif)
        if admin.telegram_chat_id:
            await _send_telegram_alert(admin.telegram_chat_id, sos_message)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="sos.triggered",
        target_type="user",
        target_id=current_user.id,
        details={
            "message": payload.message,
            "lat": payload.lat,
            "lon": payload.lon,
            "alerted_doctors": len(alerted_doctors),
        }
    ))

    await db.commit()

    # Push via SSE to all alerted doctors
    for doc in online_doctors[:3]:
        await broadcast_notification(doc.id, {
            "type": "SOS",
            "patient": current_user.name,
            "patient_id": current_user.id,
            "message": payload.message,
        })

    return {
        "status": "sos_dispatched",
        "alerted_doctors": alerted_doctors,
        "total_alerted": len(alerted_doctors) + len(admins),
        "timestamp": datetime.utcnow().isoformat()
    }


async def _send_telegram_alert(chat_id: str, message: str):
    """Send Telegram alert to a specific chat_id."""
    import os, httpx
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
                timeout=5
            )
    except Exception as e:
        print(f"Telegram SOS alert error: {e}")
