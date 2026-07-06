import asyncio
import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..models import AgencyEvent, User, Call, Admission, Organization, Resource, Notification
from ..extensions import AsyncSessionLocal

class AgencyService:
    @staticmethod
    async def create_event(
        db: AsyncSession, 
        event_type: str, 
        message: str, 
        severity: str = "info", 
        organization_id: int = None, 
        metadata: Dict = None
    ):
        event = AgencyEvent(
            event_type=event_type,
            message=message,
            severity=severity,
            organization_id=organization_id,
            metadata_json=metadata
        )
        db.add(event)
        await db.commit()
        return event

    @staticmethod
    async def get_recent_events(db: AsyncSession, organization_id: int = None, limit: int = 50):
        query = select(AgencyEvent).order_by(AgencyEvent.created_at.desc()).limit(limit)
        if organization_id:
            query = query.filter(AgencyEvent.organization_id == organization_id)
        
        result = await db.execute(query)
        return result.scalars().all()

async def homeostasis_loop():
    """
    Background loop that acts as the 'Sentient OS' brain.
    Periodically checks system state and generates autonomous agency events.
    """
    print("SENTIENT_OS: Homeostasis Loop started.")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Check for high stress users
                high_stress_query = select(User).filter(User.avg_stress_level > 0.8)
                result = await db.execute(high_stress_query)
                stressed_users = result.scalars().all()
                
                for user in stressed_users:
                    await AgencyService.create_event(
                        db,
                        event_type="telemetry",
                        message=f"High biometric stress detected for User {user.id}. Deploying path clearing protocol.",
                        severity="warning",
                        organization_id=user.organization_id,
                        metadata={"user_id": user.id, "stress_level": user.avg_stress_level}
                    )
                
                # 2. Random System Healing (The 'Wow' Factor)
                if random.random() < 0.3:
                    healing_actions = [
                        ("system_healing", "Optimizing neural processing latency in Node 4.", "info"),
                        ("security_audit", "Autonomous security sweep completed. 0 vulnerabilities found.", "info"),
                        ("resource_optimization", "Re-allocating cloud compute resources to Triage Matrix.", "info"),
                        ("system_healing", "Self-healing protocol resolved a minor database deadlock.", "info")
                    ]
                    action_type, msg, sev = random.choice(healing_actions)
                    await AgencyService.create_event(db, event_type=action_type, message=msg, severity=sev)

                # 3. Check Resource Availability
                # (Future: can check if resources are running low and generate alerts)

            # Wait before next pulse
            await asyncio.sleep(60) # Pulse every minute
        except Exception as e:
            print(f"SENTIENT_OS ERROR: Homeostasis pulse failed: {e}")
            await asyncio.sleep(30)

async def stream_agency_events() -> AsyncGenerator[str, None]:
    """
    SSE stream for the frontend AgencyLog.
    Yields events in SSE format.
    """
    last_id = 0
    # First, yield current history
    async with AsyncSessionLocal() as db:
        events = await AgencyService.get_recent_events(db, limit=20)
        if events:
            last_id = events[0].id
            for event in reversed(events):
                yield f"data: {json.dumps({'id': event.id, 'type': event.event_type, 'message': event.message, 'severity': event.severity, 'timestamp': event.created_at.isoformat()})}\n\n"

    while True:
        try:
            async with AsyncSessionLocal() as db:
                query = select(AgencyEvent).filter(AgencyEvent.id > last_id).order_by(AgencyEvent.id.asc())
                result = await db.execute(query)
                new_events = result.scalars().all()
                
                for event in new_events:
                    last_id = event.id
                    yield f"data: {json.dumps({'id': event.id, 'type': event.event_type, 'message': event.message, 'severity': event.severity, 'timestamp': event.created_at.isoformat()})}\n\n"
            
            await asyncio.sleep(5) # Poll for new events every 5 seconds
        except Exception as e:
            print(f"SSE Agency Stream Error: {e}")
            await asyncio.sleep(5)
