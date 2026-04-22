from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from ..extensions import get_db
from .. import models as domain
from ..utils.auth import get_current_user
from ..schemas.call_schema import Call, CallStartRequest
from ..schemas.booking_schema import Booking

router = APIRouter(prefix="/api", tags=["Calls & Bookings"])

@router.get("/calls", response_model=List[Call])
async def get_all_calls(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Get all calls filtered by role and organization.
    Super Admin: Global access.
    Org Admin: Org-wide access.
    Doctor: Forwarded or own calls within org.
    User: Own calls only.
    """
    stmt = select(domain.Call).order_by(domain.Call.start_time.desc())
    
    if current_user.role == domain.UserRole.super_admin:
        # Global access, no filter
        pass
    elif current_user.role == domain.UserRole.org_admin:
        # Filter by organization
        stmt = stmt.where(domain.Call.organization_id == current_user.organization_id)
    elif current_user.role == domain.UserRole.doctor:
        # Filter by organization and (assigned to them OR unassigned)
        stmt = stmt.where(domain.Call.organization_id == current_user.organization_id)
        # We could add more granular doctor filtering here if needed
    else:
        # Standard user: only own calls
        stmt = stmt.where(domain.Call.user_id == current_user.id)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/calls/{call_id}", response_model=Call)
async def get_call_details(call_id: int, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Authorization check
    if current_user.role == domain.UserRole.super_admin:
        return db_call
        
    if current_user.role == domain.UserRole.org_admin:
        if db_call.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this call")
        return db_call
        
    if current_user.role == domain.UserRole.doctor:
        if db_call.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this call")
        return db_call
        
    if db_call.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this call")
        
    return db_call

@router.post("/calls/start", response_model=Call)
async def start_call(request: CallStartRequest, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Initializes a new triage call and links it to the user's organization.
    """
    new_call = domain.Call(
        user_id=current_user.id, 
        organization_id=current_user.organization_id,
        start_time=datetime.utcnow(), 
        state="active"
    )
    db.add(new_call)
    await db.commit()
    await db.refresh(new_call)
    return new_call

from fastapi.responses import StreamingResponse
from ..services.ai_service import SentientOrchestrator
from ..services.n8n_services import N8nService
from ..schemas.call_schema import Call, CallStartRequest, ChatRequest, ChatResponse

@router.post("/calls/{call_id}/chat")
async def chat_with_agent(call_id: int, request: ChatRequest, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Streaming text-based triage fallback.
    """
    print(f"DEBUG: Chat request for call {call_id}: {request.message}")
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        print(f"DEBUG: Call {call_id} not found")
        raise HTTPException(status_code=404, detail="Call not found")

    # Fetch organization philosophy
    philosophy = "balanced"
    if db_call.organization_id:
        org_stmt = select(domain.Organization).where(domain.Organization.id == db_call.organization_id)
        org = await db.scalar(org_stmt)
        if org: philosophy = org.ai_philosophy

    agent = SentientOrchestrator(philosophy=philosophy)
    
    # 1. Update transcript with user message
    db_call.transcript = (db_call.transcript or "") + f"PATIENT: {request.message}\n"
    await db.commit()

    async def stream_generator():
        full_response = ""
        # The agent returns a synchronous generator, we iterate it
        for chunk in agent.process_message_stream(db_call.transcript or "", request.message):
            full_response += chunk
            yield chunk
            await asyncio.sleep(0.01) # Yield to event loop
        
        # Post-process response for triggers
        async with AsyncSessionLocal() as session:
            # Re-fetch call in this context
            c_stmt = select(domain.Call).where(domain.Call.call_id == call_id)
            inner_call = await session.scalar(c_stmt)
            
            inner_call.transcript = (inner_call.transcript or "") + f"ASSISTANT: {full_response}\n"
            
            if "[EMERGENCY_DETECTED]" in full_response or "[DIAGNOSIS_READY]" in full_response:
                # 🛠 AUTO EVALUATION
                eval_res = agent.evaluate_performance(inner_call.transcript)
                inner_call.diagnosis_given = eval_res.get("diagnosis", "Preliminary Assessment Complete")
                inner_call.severity = "CRITICAL" if "[EMERGENCY_DETECTED]" in full_response else "ELEVATED"
                
                # 🛠 AUTO BOOKING (n8n Integration)
                rec_resource = eval_res.get("recommended_resource", "General")
                new_booking = domain.Booking(
                    call_id=call_id,
                    organization_id=inner_call.organization_id,
                    resource_type=rec_resource,
                    status=domain.BookingStatus.approved
                )
                session.add(new_booking)
                
                # Trigger n8n Nervous System (Telegram/Email)
                await N8nService.trigger_onboarding(current_user.email, current_user.name)
            
            await session.commit()

    return StreamingResponse(stream_generator(), media_type="text/plain")

@router.post("/calls/{call_id}/terminate", response_model=Call)
async def terminate_call(call_id: int, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Auth check
    if current_user.role != domain.UserRole.super_admin and db_call.user_id != current_user.id:
        if current_user.role == domain.UserRole.org_admin and db_call.organization_id != current_user.organization_id:
             raise HTTPException(status_code=403, detail="Not authorized")
    
    db_call.state = "completed"
    db_call.end_time = datetime.utcnow()
    await db.commit()
    await db.refresh(db_call)
    return db_call

@router.get("/bookings", response_model=List[Booking])
async def get_bookings(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Get all bookings filtered by organization.
    """
    stmt = select(domain.Booking).order_by(domain.Booking.allotted_time.desc())
    
    if current_user.role == domain.UserRole.super_admin:
        pass
    elif current_user.role in [domain.UserRole.org_admin, domain.UserRole.doctor]:
        stmt = stmt.where(domain.Booking.organization_id == current_user.organization_id)
    else:
        # Standard users might not need to see all bookings, 
        # but for now we filter by calls they own
        subq = select(domain.Call.call_id).where(domain.Call.user_id == current_user.id)
        stmt = stmt.where(domain.Booking.call_id.in_(subq))
        
    result = await db.execute(stmt)
    return result.scalars().all()
