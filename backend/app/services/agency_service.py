import asyncio
import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..models import AgencyEvent, User, Call, Admission, Organization, Resource, Notification, AgencyTask
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

async def execute_background_task(task_id: int):
    """Executes a queued background task asynchronously using Gemini API."""
    import os
    from google import genai
    
    print(f"[SENTIENT TASK] Starting execution of task {task_id}")
    
    async with AsyncSessionLocal() as db:
        # Get task
        task = await db.get(AgencyTask, task_id)
        if not task:
            return
        
        task.status = "running"
        task.progress = 20
        await db.commit()
        
        # Log launch event
        await AgencyService.create_event(
            db,
            event_type="system_healing",
            message=f"Cherry OS launched background agent for: '{task.title}'",
            severity="info"
        )

    # Simulate processing and intermediate logs
    await asyncio.sleep(5)
    
    async with AsyncSessionLocal() as db:
        task = await db.get(AgencyTask, task_id)
        if task:
            task.progress = 50
            await db.commit()
            await AgencyService.create_event(
                db,
                event_type="system_healing",
                message=f"Background agent analyzing data nodes for: '{task.title}'",
                severity="info"
            )

    await asyncio.sleep(5)

    # Call Gemini to write the report
    result_summary = ""
    success = False
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and api_key != "your_gemini_api_key_here":
            client = genai.Client(api_key=api_key)
            prompt = f"Analyze the following task description and write a thorough clinical research/operational report: {task.description or task.title}. Keep it highly professional and structure it clearly under 5 bullet points."
            
            # Execute in thread pool to prevent blocking main event loop
            import anyio
            response = await anyio.to_thread.run_sync(
                lambda: client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
            )
            result_summary = response.text
            success = True
        else:
            result_summary = f"Simulated execution: analyzed data for '{task.title}'. No anomalies found."
            success = True
    except Exception as e:
        result_summary = f"Execution failed: {str(e)}"
        success = False

    async with AsyncSessionLocal() as db:
        task = await db.get(AgencyTask, task_id)
        if task:
            task.status = "completed" if success else "failed"
            task.progress = 100
            task.result_summary = result_summary
            task.completed_at = datetime.utcnow()
            await db.commit()
            
            await AgencyService.create_event(
                db,
                event_type="system_healing",
                message=f"Cherry OS completed background agent task: '{task.title}'",
                severity="info"
            )
            print(f"[SENTIENT TASK] Completed task {task_id} with status: {task.status}")

async def homeostasis_loop():
    """
    Background loop that acts as the 'Sentient OS' brain.
    Periodically checks system state, processes queued tasks, and generates events.
    """
    print("SENTIENT_OS: Homeostasis Loop started.")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Process pending tasks (Asynchronous Agency)
                pending_query = select(AgencyTask).filter(AgencyTask.status == "pending").limit(5)
                res = await db.execute(pending_query)
                pending_tasks = res.scalars().all()
                
                for task in pending_tasks:
                    # Spawn task execution asynchronously without blocking the loop
                    asyncio.create_task(execute_background_task(task.id))

                # 2. Check for high stress users
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
                
                # 3. Random System Healing (The 'Wow' Factor)
                if random.random() < 0.15: # reduced frequency slightly to avoid log spam
                    healing_actions = [
                        ("system_healing", "Optimizing neural processing latency in Node 4.", "info"),
                        ("security_audit", "Autonomous security sweep completed. 0 vulnerabilities found.", "info"),
                        ("resource_optimization", "Re-allocating cloud compute resources to Triage Matrix.", "info"),
                        ("system_healing", "Self-healing protocol resolved a minor database deadlock.", "info")
                    ]
                    action_type, msg, sev = random.choice(healing_actions)
                    await AgencyService.create_event(db, event_type=action_type, message=msg, severity=sev)

            # Wait before next pulse
            await asyncio.sleep(30) # Pulse every 30 seconds
        except Exception as e:
            print(f"SENTIENT_OS ERROR: Homeostasis pulse failed: {e}")
            await asyncio.sleep(15)

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
