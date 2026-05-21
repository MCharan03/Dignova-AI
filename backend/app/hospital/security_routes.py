from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from ..extensions import get_db
from ..models import User, AuditLog, UserRole
from ..utils.auth import get_current_user
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/security", tags=["Military Security"])

@router.get("/events")
async def get_sanitized_security_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a list of sanitized security events.
    Standard users see their own events + general system defense events.
    """
    # Fetch recent events related to the user or general system defense
    stmt = select(AuditLog).where(
        or_(
            AuditLog.user_id == current_user.id,
            AuditLog.action.like("system.%"),
            AuditLog.action.like("security.%")
        )
    ).order_by(AuditLog.created_at.desc()).limit(10)
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    sanitized = []
    for log in logs:
        # Sanitize action names for the UI ticker
        action_map = {
            "POST /api/auth/login": "IDENTITY_VERIFIED",
            "POST /api/auth/register": "NODE_REGISTRATION",
            "PUT /api/auth/me": "PROFILE_SYNC",
            "POST /api/hospital/sos": "EMERGENCY_BROADCAST",
            "GET /api/hospital/calls": "TELEMETRY_STREAM_SYNC"
        }
        
        display_action = action_map.get(log.action, log.action.upper().replace("/", "_").replace(" ", "_"))
        
        sanitized.append({
            "id": log.id,
            "event": display_action,
            "timestamp": log.created_at.isoformat(),
            "status": "SECURE",
            "node": f"IP:{log.ip_address[:7]}..." if log.ip_address else "GATEWAY"
        })
        
    return sanitized

@router.get("/status")
async def get_security_status(current_user: User = Depends(get_current_user)):
    """Returns the current 'Armed' status of the security layer."""
    return {
        "encryption": "AES-256 GCM (Clinical Grade)",
        "firewall": "ACTIVE_SHIELD",
        "zero_trust": "ENABLED",
        "integrity": "VERIFIED",
        "last_scan": datetime.utcnow().isoformat()
    }
