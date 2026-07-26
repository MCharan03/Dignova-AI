from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import os, json

from ..extensions import get_db
from ..models import Prescription, User, UserRole, UserVitals, AuditLog
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/hospital/prescriptions", tags=["Prescriptions"])

# ─── Schemas ───────────────────────────────────────────────────────────────────

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class CreatePrescriptionRequest(BaseModel):
    patient_id: int
    call_id: Optional[int] = None
    diagnosis: str
    medications: List[MedicationItem]
    notes: Optional[str] = None

class PrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    call_id: Optional[int]
    patient_id: int
    doctor_id: Optional[int]
    diagnosis: Optional[str]
    medications: Optional[list]
    notes: Optional[str]
    pdf_path: Optional[str]
    is_auto_generated: bool
    approved_by_doctor: Optional[bool]
    created_at: datetime


# ─── PDF Generation ────────────────────────────────────────────────────────────

def _generate_prescription_pdf(prescription: Prescription, patient: User, doctor: User, vitals=None) -> str:
    """Generate a professional Dignova-branded prescription PDF using reportlab."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                         Table, TableStyle, HRFlowable)
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed.")

    os.makedirs("app/static/prescriptions", exist_ok=True)
    pdf_filename = f"rx_{prescription.id}_{int(datetime.utcnow().timestamp())}.pdf"
    pdf_path = f"app/static/prescriptions/{pdf_filename}"

    doc = SimpleDocTemplate(
        pdf_path, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    # Color palette
    DIGNOVA_CYAN   = colors.HexColor("#06b6d4")
    DIGNOVA_DARK   = colors.HexColor("#0B0F19")
    DIGNOVA_PURPLE = colors.HexColor("#8B5CF6")
    GRAY_LIGHT     = colors.HexColor("#F1F5F9")
    GRAY_DARK      = colors.HexColor("#334155")

    styles = getSampleStyleSheet()
    story = []

    # ── Header ──────────────────────────────────────────────────────────────────
    header_style = ParagraphStyle("Header",
        fontName="Helvetica-Bold", fontSize=22,
        textColor=DIGNOVA_DARK, spaceAfter=4, alignment=TA_LEFT)
    sub_style = ParagraphStyle("Sub",
        fontName="Helvetica", fontSize=9,
        textColor=GRAY_DARK, spaceAfter=2)
    label_style = ParagraphStyle("Label",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=DIGNOVA_CYAN, spaceAfter=2)
    value_style = ParagraphStyle("Value",
        fontName="Helvetica", fontSize=10,
        textColor=DIGNOVA_DARK)
    section_style = ParagraphStyle("Section",
        fontName="Helvetica-Bold", fontSize=11,
        textColor=DIGNOVA_DARK, spaceBefore=10, spaceAfter=6)

    # Title row
    story.append(Paragraph("Dignova AI Healthcare", header_style))
    story.append(Paragraph("Sentient Clinical Platform - Official Prescription", sub_style))
    story.append(Paragraph(f"Issued: {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}", sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=DIGNOVA_CYAN, spaceAfter=12))

    # ── Patient & Doctor Info ────────────────────────────────────────────────────
    info_data = [
        [Paragraph("<b>PATIENT</b>", label_style), Paragraph("<b>PRESCRIBING PHYSICIAN</b>", label_style)],
        [Paragraph(patient.name or "-", value_style), Paragraph(doctor.name if doctor else "-", value_style)],
        [Paragraph(f"ID: {patient.id} | Age: {patient.age or '-'}", sub_style),
         Paragraph(f"{doctor.specialty or 'General'} | {doctor.qualification or ''}", sub_style)],
        [Paragraph(f"Blood Group: {patient.blood_group or '-'}", sub_style),
         Paragraph(f"License: {doctor.license_number or '-'}", sub_style)],
        [Paragraph(f"Email: {patient.email}", sub_style),
         Paragraph(f"Dept: {doctor.department or '-'}", sub_style)],
    ]
    info_table = Table(info_data, colWidths=[8.5*cm, 8.5*cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DIGNOVA_CYAN),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [GRAY_LIGHT, colors.white]),
        ("BOX", (0,0), (-1,-1), 0.5, GRAY_DARK),
        ("INNERGRID", (0,0), (-1,-1), 0.25, GRAY_DARK),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Diagnosis ────────────────────────────────────────────────────────────────
    story.append(Paragraph("CLINICAL DIAGNOSIS", label_style))
    diag_data = [[Paragraph(prescription.diagnosis or "-", value_style)]]
    diag_table = Table(diag_data, colWidths=[17*cm])
    diag_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), GRAY_LIGHT),
        ("BOX", (0,0), (-1,-1), 1, DIGNOVA_CYAN),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Medications ──────────────────────────────────────────────────────────────
    story.append(Paragraph("PRESCRIBED MEDICATIONS", section_style))
    meds = prescription.medications or []
    if isinstance(meds, str):
        try: meds = json.loads(meds)
        except: meds = []

    med_data = [["Rx#", "Medication", "Dosage", "Frequency", "Duration", "Instructions"]]
    for i, med in enumerate(meds, 1):
        if isinstance(med, dict):
            med_data.append([
                str(i),
                med.get("name", "-"),
                med.get("dosage", "-"),
                med.get("frequency", "-"),
                med.get("duration", "-"),
                med.get("instructions", "-"),
            ])

    med_table = Table(med_data, colWidths=[1*cm, 3.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 5*cm])
    med_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DIGNOVA_DARK),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,0), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, GRAY_LIGHT]),
        ("BOX", (0,0), (-1,-1), 0.5, GRAY_DARK),
        ("INNERGRID", (0,0), (-1,-1), 0.25, GRAY_DARK),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("FONTSIZE", (0,1), (-1,-1), 8),
    ]))
    story.append(med_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Notes ────────────────────────────────────────────────────────────────────
    if prescription.notes:
        story.append(Paragraph("PHYSICIAN NOTES", label_style))
        notes_data = [[Paragraph(prescription.notes, value_style)]]
        notes_table = Table(notes_data, colWidths=[17*cm])
        notes_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#FFF7ED")),
            ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
            ("TOPPADDING", (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
        ]))
        story.append(notes_table)
        story.append(Spacer(1, 0.4*cm))

    # ── Vitals Snapshot ──────────────────────────────────────────────────────────
    if vitals:
        story.append(Paragraph("VITALS AT TIME OF PRESCRIPTION", label_style))
        v_data = [
            ["Heart Rate", "Blood Pressure", "SpO2", "Temperature", "Glucose"],
            [
                f"{vitals.heart_rate or '-'} bpm",
                f"{vitals.systolic_bp or '-'}/{vitals.diastolic_bp or '-'} mmHg",
                f"{vitals.spo2 or '-'}%",
                f"{vitals.temperature or '-'} deg C",
                f"{vitals.blood_glucose or '-'} mg/dL",
            ]
        ]
        v_table = Table(v_data, colWidths=[3.4*cm]*5)
        v_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), DIGNOVA_PURPLE),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 8),
            ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [GRAY_LIGHT]),
            ("BOX", (0,0), (-1,-1), 0.5, GRAY_DARK),
            ("INNERGRID", (0,0), (-1,-1), 0.25, GRAY_DARK),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(v_table)
        story.append(Spacer(1, 0.4*cm))

    # ── Footer ───────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=DIGNOVA_CYAN, spaceBefore=16))
    footer_data = [[
        Paragraph("Digitally issued by Dignova AI Sentient Platform", sub_style),
        Paragraph(f"Prescription ID: RX-{prescription.id:06d}", sub_style),
        Paragraph("Valid for 30 days from date of issue", sub_style),
    ]]
    f_table = Table(footer_data, colWidths=[6*cm, 5*cm, 6*cm])
    f_table.setStyle(TableStyle([("ALIGN", (0,0), (-1,-1), "CENTER"), ("FONTSIZE", (0,0), (-1,-1), 7)]))
    story.append(f_table)

    doc.build(story)
    return pdf_path


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/create", response_model=PrescriptionResponse)
async def create_prescription(
    payload: CreatePrescriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor creates a new prescription for a patient."""
    if current_user.role not in [UserRole.doctor, UserRole.org_admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Only doctors can create prescriptions.")

    # Verify patient exists
    patient = await db.scalar(select(User).where(User.id == payload.patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Derive call_id
    call_id = payload.call_id
    if not call_id:
        # Try to find a recent call for this patient
        from ..models import Call
        call = await db.scalar(
            select(Call).where(Call.user_id == payload.patient_id).order_by(Call.start_time.desc())
        )
        if call:
            call_id = call.call_id

    meds_list = [m.model_dump() for m in payload.medications]

    rx = Prescription(
        organization_id=current_user.organization_id,
        call_id=call_id or 0,  # 0 if no call associated
        patient_id=payload.patient_id,
        doctor_id=current_user.id,
        diagnosis=payload.diagnosis,
        medications=meds_list,
        notes=payload.notes,
        approved_by_doctor=True,
        is_auto_generated=False,
    )
    db.add(rx)
    await db.commit()
    await db.refresh(rx)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        action="prescription.create",
        target_type="prescription",
        target_id=rx.id,
        details={"patient_id": payload.patient_id, "diagnosis": payload.diagnosis}
    ))

    # Generate PDF
    try:
        vitals = await db.scalar(
            select(UserVitals).where(UserVitals.user_id == payload.patient_id)
            .order_by(UserVitals.recorded_at.desc())
        )
        pdf_path = _generate_prescription_pdf(rx, patient, current_user, vitals)
        rx.pdf_path = pdf_path
        await db.commit()
        await db.refresh(rx)
    except Exception as e:
        print(f"PDF generation warning: {e}")

    await db.commit()
    return rx


@router.get("/me", response_model=List[PrescriptionResponse])
async def get_my_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Patient views their own prescriptions."""
    result = await db.execute(
        select(Prescription).where(Prescription.patient_id == current_user.id)
        .order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()


@router.get("/doctor", response_model=List[PrescriptionResponse])
async def get_doctor_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Doctor views all prescriptions they have issued."""
    if current_user.role not in [UserRole.doctor, UserRole.org_admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Access denied.")
    result = await db.execute(
        select(Prescription).where(Prescription.doctor_id == current_user.id)
        .order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()


@router.get("/all", response_model=List[PrescriptionResponse])
async def get_all_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin/org_admin view for all prescriptions in their org."""
    if current_user.role not in [UserRole.super_admin, UserRole.org_admin]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    stmt = select(Prescription)
    if current_user.role == UserRole.org_admin and current_user.organization_id:
        stmt = stmt.where(Prescription.organization_id == current_user.organization_id)
    result = await db.execute(stmt.order_by(Prescription.created_at.desc()))
    return result.scalars().all()


@router.get("/{prescription_id}/pdf")
async def download_prescription_pdf(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download the PDF for a specific prescription."""
    rx = await db.scalar(select(Prescription).where(Prescription.id == prescription_id))
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found.")

    # Access control: patient, doctor, or admin
    if current_user.role == UserRole.user and rx.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Regenerate PDF if missing
    if not rx.pdf_path or not os.path.exists(rx.pdf_path):
        patient = await db.scalar(select(User).where(User.id == rx.patient_id))
        doctor  = await db.scalar(select(User).where(User.id == rx.doctor_id)) if rx.doctor_id else None
        vitals  = await db.scalar(
            select(UserVitals).where(UserVitals.user_id == rx.patient_id)
            .order_by(UserVitals.recorded_at.desc())
        )
        if not patient:
            raise HTTPException(status_code=404, detail="Patient data not found.")
        pdf_path = _generate_prescription_pdf(rx, patient, doctor, vitals)
        rx.pdf_path = pdf_path
        await db.commit()
    
    return FileResponse(
        rx.pdf_path,
        media_type="application/pdf",
        filename=f"Dignova_RX_{prescription_id:06d}.pdf"
    )
