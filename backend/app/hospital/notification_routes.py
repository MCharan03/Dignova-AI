from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from ..models import Notification, User, UserRole
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# ═══════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    category: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class BroadcastRequest(BaseModel):
    title: str
    message: str
    type: str = "info"
    category: str = "system"
    link: Optional[str] = None
    target_role: Optional[str] = None  # None = all users in org

# ═══════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's notifications."""
    stmt = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(limit)
    
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get unread notification count for badge display."""
    count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    return {"unread_count": count or 0}

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
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
    return {"message": "Marked as read."}

@router.patch("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read."}

@router.post("/broadcast")
async def broadcast_notification(
    req: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Broadcast a notification to users. Admins can target by role."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Only admins can broadcast notifications.")
    
    # Find target users
    stmt = select(User)
    
    if current_user.role == UserRole.org_admin:
        # Org admins can only broadcast within their organization
        stmt = stmt.where(User.organization_id == current_user.organization_id)
    elif current_user.role == UserRole.super_admin and current_user.organization_id:
        # Super admin with org context — scope to that org
        # If no org context, broadcast platform-wide
        pass
    
    if req.target_role:
        try:
            role_enum = UserRole(req.target_role)
            stmt = stmt.where(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid target role.")
    
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    notifications = []
    for user in users:
        notif = Notification(
            user_id=user.id,
            organization_id=current_user.organization_id,
            title=req.title,
            message=req.message,
            type=req.type,
            category=req.category,
            link=req.link,
        )
        notifications.append(notif)
    
    db.add_all(notifications)
    await db.commit()
    
    return {"message": f"Broadcast sent to {len(notifications)} users.", "count": len(notifications)}
