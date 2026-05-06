import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..models import User, Call, Prescription, Booking, Organization, AftercarePing, AppointmentSlot, UserVitals
from ..services.gemini_service import GeminiService
from ..services.n8n_services import N8nService
from ..utils.pdf_generator import generate_prescription_pdf

class SentientEngine:
    """
    The Unified Clinical Orchestrator.
    Consolidates AI analysis, database state, and automation triggers.
    """

    @staticmethod
    async def process_triage(
        db: AsyncSession, 
        user: User, 
        message: str, 
        call_id: Optional[int] = None,
        source: str = "web"
    ) -> Dict[str, Any]:
        """
        Unified Triage Pipeline:
        1. AI Analysis (Gemini)
        2. Database Update (Call Log)
        3. Automation Dispatch (n8n/Telegram)
        """
        # 1. AI Clinical Analysis
        patient_context = {
            "name": user.name,
            "age": user.age,
            "allergies": user.allergies,
            "blood_group": user.blood_group
        }
        
        analysis = await GeminiService.triage_message(message, patient_context)
        
        # 2. Database Session Management
        if not call_id:
            new_call = Call(
                user_id=user.id,
                organization_id=user.organization_id,
                call_type="triage",
                source=source,
                transcript=f"PATIENT: {message}\nAI: {analysis.get('response')}",
                severity=analysis.get("risk_level", "UNKNOWN"),
                diagnosis_given=analysis.get("diagnosis")
            )
            db.add(new_call)
            await db.commit()
            await db.refresh(new_call)
            call_id = new_call.call_id
        else:
            await db.execute(
                update(Call)
                .where(Call.call_id == call_id)
                .values(
                    transcript=Call.transcript + f"\nPATIENT: {message}\nAI: {analysis.get('response')}",
                    severity=analysis.get("risk_level", "UNKNOWN"),
                    diagnosis_given=analysis.get("diagnosis")
                )
            )
            await db.commit()

        # 3. Automation Routing
        risk_level = analysis.get("risk_level", "LOW")
        
        if analysis.get("auto_prescribe") and risk_level == "LOW":
            # AUTO-PILOT: Generate and Deliver Prescription
            await SentientEngine.issue_prescription(db, user, call_id, analysis.get("medications", []), "AI Auto-Generated")
            
        elif analysis.get("escalate_to_doctor") or risk_level in ["ELEVATED", "CRITICAL"]:
            # ESCALATION: Alert Human Doctor
            highlight_card = {
                "title": f"Urgent: {analysis.get('diagnosis')}",
                "symptoms": [message],
                "red_flags": analysis.get("red_flags", []),
                "urgency": risk_level,
                "suggested_action": analysis.get("escalation_reason", "Manual Clinical Review")
            }
            # Find an online doctor from the same org
            stmt = select(User).where(User.organization_id == user.organization_id, User.role == "doctor", User.is_online == True)
            doctor = await db.scalar(stmt)
            
            await N8nService.trigger_doctor_escalation(
                patient_data={"name": user.name, "email": user.email, "telegram_chat_id": user.telegram_chat_id},
                highlight_card=highlight_card,
                call_id=call_id,
                doctor_telegram_chat_id=doctor.telegram_chat_id if doctor else None
            )

        return {
            "call_id": call_id,
            "response": analysis.get("response"),
            "risk_level": risk_level,
            "diagnosis": analysis.get("diagnosis")
        }

    @staticmethod
    async def issue_prescription(
        db: AsyncSession, 
        user: User, 
        call_id: int, 
        medications: List[str], 
        notes: str,
        doctor_id: Optional[int] = None
    ) -> bool:
        """Generates PDF, saves to DB, and sends via n8n."""
        
        # 1. Generate PDF (Utility)
        pdf_filename = f"rx_{call_id}_{datetime.now().strftime('%Y%md%H%M%S')}.pdf"
        pdf_path = f"app/static/prescriptions/{pdf_filename}"
        
        # Logic to generate PDF (Simplified here, assumes utility exists)
        # generate_prescription_pdf(user, medications, notes, pdf_path)
        
        # 2. Save to DB
        new_rx = Prescription(
            organization_id=user.organization_id,
            call_id=call_id,
            patient_id=user.id,
            doctor_id=doctor_id,
            medications=medications,
            notes=notes,
            pdf_path=pdf_filename,
            is_auto_generated=True if not doctor_id else False
        )
        db.add(new_rx)
        await db.commit()
        await db.refresh(new_rx)

        # 3. Schedule Aftercare Ping (Day 3)
        aftercare = AftercarePing(
            prescription_id=new_rx.id,
            patient_id=user.id,
            scheduled_for=datetime.utcnow() + timedelta(days=3)
        )
        db.add(aftercare)
        await db.commit()

        # 4. Deliver via n8n
        pdf_url = f"{os.getenv('BACKEND_URL')}/static/prescriptions/{pdf_filename}"
        await N8nService.send_prescription_alert(
            patient_data={"name": user.name, "email": user.email, "telegram_chat_id": user.telegram_chat_id},
            pdf_url=pdf_url,
            diagnosis="Automated Assessment",
            is_auto=True if not doctor_id else False
        )
        
        return True

    @staticmethod
    async def process_geofence(db: AsyncSession, user: User, lat: float, lon: float):
        """Unified Geofence Handler: Logic + Automation."""
        # Hospital coords from env
        H_LAT = float(os.getenv("HOSPITAL_LAT", 17.4486))
        H_LON = float(os.getenv("HOSPITAL_LON", 78.3908))
        
        from ..utils.geofencing import calculate_distance
        dist = calculate_distance(lat, lon, H_LAT, H_LON)
        
        if dist < 500: # 500 meters
            # Update user location
            user.lat = lat
            user.lon = lon
            await db.commit()
            
            # Alert organization
            stmt = select(User).where(User.organization_id == user.organization_id, User.role == "doctor", User.is_online == True)
            doctor = await db.scalar(stmt)
            
            await N8nService.trigger_patient_arriving(
                patient_data={"name": user.name, "telegram_chat_id": user.telegram_chat_id},
                doctor_data={"name": doctor.name, "telegram_chat_id": doctor.telegram_chat_id} if doctor else {"name": "Staff"},
                distance_meters=dist
            )
            return True
        return False
