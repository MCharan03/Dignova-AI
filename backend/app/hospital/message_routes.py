from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from ..extensions import get_db
from ..models import User, UserRole
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messaging"])


# ═══════════════════════════════════════════════════
# MODELS - In-memory message store (production: use DB model)
# ═══════════════════════════════════════════════════

# Simple in-memory store; in production, back with a DB table
_messages_store: list = []
_msg_id_counter = 0


class MessageCreate(BaseModel):
    content: str


def _get_next_id():
    global _msg_id_counter
    _msg_id_counter += 1
    return _msg_id_counter


# ═══════════════════════════════════════════════════
# CONVERSATIONS
# ═══════════════════════════════════════════════════

@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all conversations for the current user."""
    # Get unique conversation partners
    partners = set()
    for msg in _messages_store:
        if msg["sender_id"] == current_user.id:
            partners.add(msg["receiver_id"])
        elif msg["receiver_id"] == current_user.id:
            partners.add(msg["sender_id"])

    conversations = []
    for partner_id in partners:
        partner = await db.scalar(select(User).where(User.id == partner_id))
        if not partner:
            continue

        # Get last message between them
        partner_msgs = [m for m in _messages_store
            if (m["sender_id"] == current_user.id and m["receiver_id"] == partner_id) or
               (m["sender_id"] == partner_id and m["receiver_id"] == current_user.id)]
        partner_msgs.sort(key=lambda x: x["created_at"], reverse=True)

        last_msg = partner_msgs[0] if partner_msgs else None
        unread = sum(1 for m in partner_msgs if m["receiver_id"] == current_user.id and not m["is_read"])

        conversations.append({
            "id": partner_id,
            "other_user_id": partner_id,
            "other_user_name": partner.name,
            "other_user_role": partner.role.value if hasattr(partner.role, 'value') else str(partner.role),
            "last_message": last_msg["content"][:50] if last_msg else "",
            "last_message_at": last_msg["created_at"] if last_msg else datetime.utcnow().isoformat(),
            "unread_count": unread,
            "is_online": getattr(partner, 'is_online', False),
        })

    conversations.sort(key=lambda x: x["last_message_at"], reverse=True)
    return conversations


# ═══════════════════════════════════════════════════
# MESSAGES
# ═══════════════════════════════════════════════════

@router.get("/{other_user_id}")
async def get_messages(
    other_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages between current user and another user."""
    other_user = await db.scalar(select(User).where(User.id == other_user_id))
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Filter messages between these two users
    msgs = [m for m in _messages_store
        if (m["sender_id"] == current_user.id and m["receiver_id"] == other_user_id) or
           (m["sender_id"] == other_user_id and m["receiver_id"] == current_user.id)]

    # Mark received messages as read
    for m in msgs:
        if m["receiver_id"] == current_user.id:
            m["is_read"] = True

    msgs.sort(key=lambda x: x["created_at"])

    # Resolve sender names
    user_cache = {
        current_user.id: {"name": current_user.name, "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)},
        other_user.id: {"name": other_user.name, "role": other_user.role.value if hasattr(other_user.role, 'value') else str(other_user.role)},
    }

    return [{
        "id": m["id"],
        "sender_id": m["sender_id"],
        "content": m["content"],
        "created_at": m["created_at"],
        "is_read": m["is_read"],
        "sender_name": user_cache.get(m["sender_id"], {}).get("name", "Unknown"),
        "sender_role": user_cache.get(m["sender_id"], {}).get("role", "user"),
    } for m in msgs]


@router.post("/{other_user_id}")
async def send_message(
    other_user_id: int,
    msg_in: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to another user."""
    other_user = await db.scalar(select(User).where(User.id == other_user_id))
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_msg = {
        "id": _get_next_id(),
        "sender_id": current_user.id,
        "receiver_id": other_user_id,
        "content": msg_in.content,
        "created_at": datetime.utcnow().isoformat(),
        "is_read": False,
    }
    _messages_store.append(new_msg)

    return {"message": "Sent successfully.", "id": new_msg["id"]}
