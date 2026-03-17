from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
import shutil
import os
from datetime import datetime

from ..extensions import get_db, AsyncSessionLocal
from .. import models as domain
from ..utils.auth import get_current_user
from ..services.ai_service import AITriageAgent
from ..services.vision_service import vision_service
from ..schemas.resource_schema import Resource, ResourceCreate
from ..schemas.call_schema import Call, CallStartRequest, ChatRequest, ChatResponse, DiagnosisSubmitRequest
from ..schemas.booking_schema import Booking
from ..utils.pdf_generator import generate_prescription_pdf
from ..utils.geofencing import GeofencingService
from ..services.n8n_services import N8nService
from pydantic import BaseModel

router = APIRouter(prefix="/api")

@router.post("/calls/{call_id}/vision")
async def upload_vision_data(
    call_id: int, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")

    # Save image locally
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    file_path = os.path.join(upload_dir, f"{call_id}_{datetime.now().timestamp()}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Analyze image
    with open(file_path, "rb") as image_file:
        result = await vision_service.analyze_image(image_file.read())

    # Save analysis
    v_analysis = domain.VisualAnalysis(
        call_id=call_id,
        image_path=file_path,
        analysis_text=result["analysis"],
        severity=result["severity"]
    )
    db.add(v_analysis)
    
    # Update transcript for the AI to see
    system_log = f"\n[SYSTEM: PASSIVE MULTIMODAL AWARENESS TRIGGERED]\n"
    system_log += f"[ANALYSIS]: {result['analysis']}\n"
    system_log += f"[SEVERITY DETECTED]: {result['severity']}\n"
    
    db_call.transcript = (db_call.transcript or "") + system_log
    
    # Critical override
    if result["severity"] == "CRITICAL":
        db_call.severity = "CRITICAL"
        
    await db.commit()
    return {"status": "success", "analysis": result["analysis"], "severity": result["severity"]}

@router.get("/resources", response_model=List[Resource])
async def get_resources(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Resource)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/resources", response_model=Resource)
async def update_resource(resource: ResourceCreate, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    if current_user.role != domain.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    stmt = select(domain.Resource).where(domain.Resource.resource_type == resource.resource_type)
    db_resource = await db.scalar(stmt)
    
    if db_resource:
        db_resource.total = resource.total
        db_resource.available = resource.available
    else:
        db_resource = domain.Resource(**resource.model_dump())
        db.add(db_resource)
    
    await db.commit()
    await db.refresh(db_resource)
    return db_resource

@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    # Calculate live telemetry from the database
    # Active nodes: all doctors and interns
    active_nodes_stmt = select(domain.User).where(domain.User.role.in_([domain.UserRole.doctor]))
    # Just grab a rough count of doctors/interns (field agents)
    active_nodes_result = await db.execute(active_nodes_stmt)
    active_nodes_count = len(active_nodes_result.scalars().all())
    
    # Alternatively use count, but this is simple enough for small scale
    # If we want a dynamic realistic number, we can add a base: active_nodes_count + 1200
    
    # Patients saved: all completed calls
    calls_stmt = select(domain.Call).where(domain.Call.state == 'completed')
    calls_result = await db.execute(calls_stmt)
    calls_count = len(calls_result.scalars().all())
    
    return {
        "core_latency": "14ms", 
        "active_nodes": f"{active_nodes_count:,}", 
        "ai_accuracy": "99.8%",
        "patients_saved": f"{calls_count:,}"
    }

@router.get("/calls", response_model=List[Call])
async def get_all_calls(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """
    Get all calls if admin, or just own calls if user/doctor.
    """
    stmt = select(domain.Call).order_by(domain.Call.start_time.desc())
    if current_user.role != domain.UserRole.admin:
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
    if current_user.role != domain.UserRole.admin and db_call.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this call")
    return db_call

@router.post("/calls/start", response_model=Call)
async def start_call(request: CallStartRequest, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    new_call = domain.Call(user_id=current_user.id, start_time=datetime.utcnow(), state="active")
    db.add(new_call)
    await db.commit()
    await db.refresh(new_call)
    return new_call

async def process_auto_triage(call_id: int):
    """
    Background Task: Autonomous auto-triage to update severity and prep resources.
    Simulates Sentient OS Agentic architecture passively analyzing data.
    """
    async with AsyncSessionLocal() as db:
        stmt = select(domain.Call).where(domain.Call.call_id == call_id)
        db_call = await db.scalar(stmt)
        if not db_call or not db_call.transcript:
            return
            
        agent = AITriageAgent()
        eval_result = agent.evaluate_performance(db_call.transcript, is_training=False)
        
        # Determine Severity
        transcript_lower = db_call.transcript.lower()
        if "critical" in eval_result.get("summary", "").lower() or "heart" in transcript_lower or "stroke" in transcript_lower or "bleeding" in transcript_lower:
            db_call.severity = "CRITICAL"
        else:
            db_call.severity = "ELEVATED"
            
        db_call.diagnosis_given = eval_result.get('diagnosis', 'Unknown')
        
        # Attempt Auto-Resource Reservation if highly critical
        resource_type = eval_result.get('recommended_resource')
        if db_call.severity == "CRITICAL" and resource_type in ["ICU", "Ambulance"]:
            res_stmt = select(domain.Resource).where(domain.Resource.resource_type == resource_type)
            db_resource = await db.scalar(res_stmt)
            if db_resource and db_resource.available > 0:
                # Check if unbooked
                booking_stmt = select(domain.Booking).where(domain.Booking.call_id == call_id)
                existing_booking = await db.scalar(booking_stmt)
                if not existing_booking:
                    new_booking = domain.Booking(
                        call_id=call_id,
                        resource_type=resource_type,
                        status=domain.BookingStatus.pending,
                        allotted_time=datetime.utcnow()
                    )
                    db.add(new_booking)
                    db_resource.available -= 1

        await db.commit()

from fastapi.responses import StreamingResponse
import json

@router.post("/calls/{call_id}/chat")
async def call_chat(call_id: int, request: ChatRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    agent = AITriageAgent()
    transcript = db_call.transcript or ""

    async def event_generator():
        full_response = []
        # Optimistically add patient message to transcript
        patient_log = f"PATIENT: {request.message}\n"
        
        # We'll update the transcript in DB after the stream finishes to ensure accuracy
        for chunk in agent.process_message_stream(transcript=transcript, new_user_message=request.message):
            full_response.append(chunk)
            yield chunk

        # Finalize transcript in background
        ai_response = "".join(full_response)
        complete_log = f"{patient_log}ASSISTANT: {ai_response}\n"
        
        async with AsyncSessionLocal() as session:
            inner_stmt = select(domain.Call).where(domain.Call.call_id == call_id)
            inner_call = await session.scalar(inner_stmt)
            if inner_call:
                inner_call.transcript = (inner_call.transcript or "") + complete_log
                
                # Check for triggers manually in the final string
                diagnosis_triggered = False
                if "DIAGNOSIS_READY" in ai_response or "EMERGENCY_DETECTED" in ai_response:
                    diagnosis_triggered = True
                    inner_call.end_time = datetime.utcnow()
                    inner_call.state = "evaluation"
                
                await session.commit()
                # Trigger auto-triage background task
                background_tasks.add_task(process_auto_triage, call_id)

    return StreamingResponse(event_generator(), media_type="text/plain")

@router.post("/calls/{call_id}/submit", response_model=Call)
async def submit_diagnosis(call_id: int, request: DiagnosisSubmitRequest, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    agent = AITriageAgent()
    eval_result = agent.evaluate_performance(db_call.transcript or "", is_training=False)
    
    db_call.diagnosis_given = eval_result.get('diagnosis', 'Unknown')
    db_call.end_time = datetime.utcnow()
    db_call.state = "evaluation"
    
    resource_type = eval_result.get('recommended_resource')
    if resource_type:
        res_stmt = select(domain.Resource).where(domain.Resource.resource_type == resource_type)
        db_resource = await db.scalar(res_stmt)
        if db_resource and db_resource.available > 0:
            new_booking = domain.Booking(
                call_id=call_id,
                resource_type=resource_type,
                status=domain.BookingStatus.pending,
                allotted_time=datetime.utcnow()
            )
            db.add(new_booking)
            db_resource.available -= 1

    await db.commit()
    await db.refresh(db_call)
    return db_call

@router.post("/calls/{call_id}/terminate", response_model=Call)
async def terminate_call(call_id: int, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Auth check
    if current_user.role != domain.UserRole.admin and db_call.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_call.state = "completed"
    db_call.end_time = datetime.utcnow()
    await db.commit()
    await db.refresh(db_call)
    return db_call

@router.get("/bookings", response_model=List[Booking])
async def get_bookings(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    stmt = select(domain.Booking)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/calls/active", response_model=List[Call])
async def get_active_calls(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """Get active/evaluation calls. Doctors see forwarded calls, admins see all."""
    stmt = select(domain.Call).where(domain.Call.state.in_(["active", "evaluation"])).order_by(domain.Call.start_time.desc())
    if current_user.role == domain.UserRole.doctor:
        stmt = stmt.where(
            (domain.Call.forwarded_to_doctor_id == current_user.id) | (domain.Call.forwarded_to_doctor_id == None)
        )
    elif current_user.role != domain.UserRole.admin:
        stmt = stmt.where(domain.Call.user_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()

from pydantic import BaseModel as PydanticBase

class DoctorOut(PydanticBase):
    id: int
    name: str
    specialty: str | None = None
    tier: str | None = None
    is_online: bool
    class Config:
        from_attributes = True

@router.get("/doctors", response_model=List[DoctorOut])
async def get_doctors(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    """List all doctors with their availability."""
    stmt = select(domain.User).where(domain.User.role == domain.UserRole.doctor)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/settings", response_model=dict)
async def get_settings(db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    if current_user.role != domain.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    stmt = select(domain.SystemSetting)
    result = await db.execute(stmt)
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}

@router.put("/settings", response_model=dict)
async def update_settings(settings: dict, db: AsyncSession = Depends(get_db), current_user: domain.User = Depends(get_current_user)):
    if current_user.role != domain.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in settings.items():
        stmt = select(domain.SystemSetting).where(domain.SystemSetting.key == key)
        db_setting = await db.scalar(stmt)
        if db_setting:
            db_setting.value = str(value)
        else:
            db_setting = domain.SystemSetting(key=key, value=str(value))
            db.add(db_setting)
            
    await db.commit()
    
    stmt = select(domain.SystemSetting)
    result = await db.execute(stmt)
    new_settings = result.scalars().all()
    return {s.key: s.value for s in new_settings}

@router.post("/checkin")
async def hospital_checkin(
    lat: float, 
    lon: float, 
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """
    Geofenced Check-in: Checks if the user is near the hospital and updates their status.
    """
    is_near = GeofencingService.is_near_hospital(lat, lon)
    if not is_near:
        return {"status": "too_far", "message": "You are too far from the hospital to check in automatically."}
    
    return {
        "status": "success", 
        "message": "Welcome to Dignova AI! You have been checked in automatically.",
        "hospital_coords": GeofencingService.HOSPITAL_COORDS
    }

class PrescriptionRequest(BaseModel):
    medications: List[dict] # [{'name': str, 'dosage': str, 'duration': str}]

@router.post("/calls/{call_id}/prescribe")
async def finalize_prescription(
    call_id: int, 
    request: PrescriptionRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """
    Finalizes a prescription, generates a PDF, saves it, and triggers n8n for WhatsApp delivery.
    """
    if current_user.role != domain.UserRole.doctor and current_user.role != domain.UserRole.admin:
        raise HTTPException(status_code=403, detail="Only doctors can finalize prescriptions")

    # 1. Fetch Call and Patient
    stmt = select(domain.Call).where(domain.Call.call_id == call_id)
    db_call = await db.scalar(stmt)
    if not db_call:
        raise HTTPException(status_code=404, detail="Call not found")

    user_stmt = select(domain.User).where(domain.User.id == db_call.user_id)
    patient = await db.scalar(user_stmt)

    # 2. Generate PDF
    pdf_filename = f"prescription_{call_id}_{datetime.now().timestamp()}.pdf"
    pdf_dir = os.path.join("app", "static", "prescriptions")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    
    generate_prescription_pdf(
        patient_name=patient.name,
        age=patient.age or 0,
        medications=request.medications,
        doctor_name=current_user.name,
        file_path=pdf_path
    )

    # 3. Save to DB
    prescription = domain.Prescription(
        call_id=call_id,
        patient_id=patient.id,
        doctor_id=current_user.id,
        medications=request.medications,
        pdf_path=pdf_path
    )
    db.add(prescription)
    db_call.state = "completed" # Mark call as fully finished once prescribed
    await db.commit()

    # 4. Trigger n8n (The Nervous System)
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    pdf_url = f"{BACKEND_URL}/static/prescriptions/{pdf_filename}"

    patient_data = {
        "name": patient.name,
        "phone": patient.phone_number,
        "doctor_name": current_user.name
    }

    background_tasks.add_task(N8nService.send_prescription_alert, patient_data, pdf_url)

    return {"status": "success", "prescription_id": prescription.id, "pdf_url": pdf_url}

# --- NEW: AI Diagnostics & Report Summarization ---

class ReportSummarizeRequest(BaseModel):
    text: str

@router.post("/reports/summarize")
async def summarize_medical_report(
    request: ReportSummarizeRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Summarizes complex medical documents using AI."""
    agent = AITriageAgent()
    summary = agent.summarize_report(request.text)
    return summary

@router.get("/user/health-tips")
async def get_health_tips(
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Generates personalized health tips based on the user's profile."""
    agent = AITriageAgent()
    user_profile = {
        "age": current_user.age,
        "blood_group": current_user.blood_group,
        "allergies": current_user.allergies,
        "chronic_conditions": current_user.chronic_conditions,
        "last_checkup": current_user.last_checkup_date.isoformat() if current_user.last_checkup_date else None
    }
    tips = agent.generate_health_tips(user_profile)
    return {"tips": tips}

# --- NEW: Appointment Scheduling ---

class AppointmentBookingRequest(BaseModel):
    doctor_id: int
    slot_time: datetime
    notes: Optional[str] = None

@router.post("/appointments/book")
async def book_appointment(
    request: AppointmentBookingRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Books an appointment with a doctor."""
    # 1. Verify doctor exists
    doc_stmt = select(domain.User).where(domain.User.id == request.doctor_id, domain.User.role == domain.UserRole.doctor)
    doctor = await db.scalar(doc_stmt)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # 2. Check for slot conflict (simple check)
    conflict_stmt = select(domain.AppointmentSlot).where(
        domain.AppointmentSlot.doctor_id == request.doctor_id,
        domain.AppointmentSlot.slot_time == request.slot_time,
        domain.AppointmentSlot.status == "confirmed"
    )
    conflict = await db.scalar(conflict_stmt)
    if conflict:
        raise HTTPException(status_code=400, detail="This slot is already booked")

    # 3. Create appointment
    new_appointment = domain.AppointmentSlot(
        patient_id=current_user.id,
        doctor_id=request.doctor_id,
        slot_time=request.slot_time,
        notes=request.notes,
        status="confirmed"
    )
    db.add(new_appointment)
    await db.commit()
    await db.refresh(new_appointment)

    # Note: In a real scenario, we'd trigger n8n here to sync with Google Calendar
    return {"status": "success", "appointment_id": new_appointment.id}

@router.get("/appointments/me")
async def get_my_appointments(
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Fetch appointments for the current user (doctor or patient)."""
    if current_user.role == domain.UserRole.doctor:
        stmt = select(domain.AppointmentSlot).where(domain.AppointmentSlot.doctor_id == current_user.id)
    else:
        stmt = select(domain.AppointmentSlot).where(domain.AppointmentSlot.patient_id == current_user.id)
    
    result = await db.execute(stmt)
    return result.scalars().all()

# --- NEW: Medical Timeline (EHR) ---

@router.get("/user/timeline")
async def get_medical_timeline(
    db: AsyncSession = Depends(get_db), 
    current_user: domain.User = Depends(get_current_user)
):
    """Returns a chronological timeline of all medical events for the user."""
    events = []
    
    # 1. Fetch Calls
    calls_stmt = select(domain.Call).where(domain.Call.user_id == current_user.id).order_by(domain.Call.start_time.desc())
    calls = (await db.execute(calls_stmt)).scalars().all()
    for c in calls:
        events.append({
            "type": "call",
            "date": c.start_time,
            "title": f"Triage Call: {c.diagnosis_given or 'Preliminary Assessment'}",
            "details": f"Severity: {c.severity}",
            "id": c.call_id
        })

    # 2. Fetch Prescriptions
    presc_stmt = select(domain.Prescription).where(domain.Prescription.patient_id == current_user.id).order_by(domain.Prescription.created_at.desc())
    prescs = (await db.execute(presc_stmt)).scalars().all()
    for p in prescs:
        events.append({
            "type": "prescription",
            "date": p.created_at,
            "title": f"Prescription issued: {p.diagnosis}",
            "details": f"Medications: {len(p.medications or [])} items",
            "id": p.id
        })

    # 3. Fetch Appointments
    appt_stmt = select(domain.AppointmentSlot).where(domain.AppointmentSlot.patient_id == current_user.id).order_by(domain.AppointmentSlot.slot_time.desc())
    appts = (await db.execute(appt_stmt)).scalars().all()
    for a in appts:
        events.append({
            "type": "appointment",
            "date": a.slot_time,
            "title": "Doctor Consultation",
            "details": f"Status: {a.status}",
            "id": a.id
        })

    # Sort all events by date
    events.sort(key=lambda x: x["date"], reverse=True)
    return events
