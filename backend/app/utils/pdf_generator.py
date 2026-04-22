import os
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def generate_prescription_pdf(
    patient_name: str,
    age: int,
    medications: list,
    doctor_name: str,
    file_path: str,
    diagnosis: str = None,
    notes: str = None,
    blood_group: str = None,
    prescription_id: str = None
):
    """
    Generates a professional, clinic-quality prescription PDF using ReportLab.
    Falls back to a structured text file if ReportLab is unavailable.
    """
    if not REPORTLAB_AVAILABLE:
        _generate_text_prescription(patient_name, age, medications, doctor_name, file_path, diagnosis)
        return

    try:
        # ── Colour palette ──────────────────────────────────────────────────────
        PRIMARY   = colors.HexColor("#0D6EFD")   # Dignova Blue
        DARK      = colors.HexColor("#0A0F1E")   # Near-black header
        ACCENT    = colors.HexColor("#00D4FF")   # Cyan accent
        TABLE_HDR = colors.HexColor("#E8F4FD")   # Light blue table header
        DIVIDER   = colors.HexColor("#CBD5E1")   # Soft grey

        doc = SimpleDocTemplate(
            file_path,
            pagesize=A4,
            rightMargin=1.8*cm,
            leftMargin=1.8*cm,
            topMargin=1.5*cm,
            bottomMargin=2*cm
        )
        styles = getSampleStyleSheet()
        story  = []

        # ── Styles ──────────────────────────────────────────────────────────────
        brand_style = ParagraphStyle("brand",
            parent=styles["Normal"],
            fontSize=26, fontName="Helvetica-Bold",
            textColor=PRIMARY, alignment=TA_LEFT, spaceAfter=0
        )
        tagline_style = ParagraphStyle("tagline",
            parent=styles["Normal"],
            fontSize=9, fontName="Helvetica",
            textColor=colors.HexColor("#64748B"), alignment=TA_LEFT, spaceBefore=2
        )
        rx_style = ParagraphStyle("rx",
            parent=styles["Normal"],
            fontSize=42, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#E2E8F0"), alignment=TA_RIGHT
        )
        section_hdr = ParagraphStyle("section_hdr",
            parent=styles["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=colors.HexColor("#94A3B8"), spaceBefore=10, spaceAfter=4
        )
        field_val = ParagraphStyle("field_val",
            parent=styles["Normal"],
            fontSize=10.5, fontName="Helvetica-Bold",
            textColor=DARK, spaceBefore=0, spaceAfter=6
        )
        normal_sm = ParagraphStyle("normal_sm",
            parent=styles["Normal"],
            fontSize=9.5, fontName="Helvetica",
            textColor=colors.HexColor("#334155")
        )
        footer_style = ParagraphStyle("footer",
            parent=styles["Normal"],
            fontSize=8, fontName="Helvetica",
            textColor=colors.HexColor("#94A3B8"), alignment=TA_CENTER
        )
        sig_style = ParagraphStyle("sig",
            parent=styles["Normal"],
            fontSize=10, fontName="Helvetica-Bold",
            textColor=DARK, alignment=TA_LEFT
        )
        diag_style = ParagraphStyle("diag",
            parent=styles["Normal"],
            fontSize=10, fontName="Helvetica",
            textColor=colors.HexColor("#1E3A5F"), spaceBefore=4, spaceAfter=2
        )

        # ── Header: Brand + Rx ──────────────────────────────────────────────────
        header_data = [[
            [Paragraph("Dignova AI", brand_style),
             Paragraph("Autonomous Healthcare Intelligence", tagline_style)],
            Paragraph("℞", rx_style)
        ]]
        header_table = Table(header_data, colWidths=["70%", "30%"])
        header_table.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), DARK),
            ("TOPPADDING", (0,0), (-1,-1), 14),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING", (0,0), (0,-1), 16),
            ("RIGHTPADDING", (-1,0), (-1,-1), 16),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))

        # Accent bar
        accent_bar = Table([[""]], colWidths=["100%"], rowHeights=[4])
        accent_bar.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1), PRIMARY)]))
        story.append(accent_bar)
        story.append(Spacer(1, 14))

        # ── Patient Information ─────────────────────────────────────────────────
        story.append(Paragraph("PATIENT INFORMATION", section_hdr))
        story.append(HRFlowable(width="100%", thickness=0.5, color=DIVIDER, spaceAfter=8))

        rx_date  = datetime.utcnow().strftime("%d %B %Y")
        rx_id    = prescription_id or f"RX-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        patient_info = [
            ["Patient Name", patient_name,     "Age",         str(age) if age else "N/A"],
            ["Blood Group",  blood_group or "—", "Date",        rx_date],
            ["Diagnosis",    diagnosis or "—", "Ref. No",     rx_id],
        ]
        patient_table = Table(patient_info, colWidths=["18%", "32%", "18%", "32%"])
        patient_table.setStyle(TableStyle([
            ("FONTNAME",    (0,0), (-1,-1), "Helvetica"),
            ("FONTNAME",    (0,0), (0,-1), "Helvetica-Bold"),
            ("FONTNAME",    (2,0), (2,-1), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0), (-1,-1), 9.5),
            ("TEXTCOLOR",   (0,0), (0,-1), colors.HexColor("#64748B")),
            ("TEXTCOLOR",   (2,0), (2,-1), colors.HexColor("#64748B")),
            ("TEXTCOLOR",   (1,0), (1,-1), DARK),
            ("TEXTCOLOR",   (3,0), (3,-1), DARK),
            ("VALIGN",      (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",  (0,0), (-1,-1), 5),
            ("BOTTOMPADDING",(0,0), (-1,-1), 5),
            ("BACKGROUND",  (0,0), (-1,-1), colors.white),
            ("ROWBACKGROUNDS",(0,0),(-1,-1),[colors.white, colors.HexColor("#F8FAFC")]),
        ]))
        story.append(patient_table)
        story.append(Spacer(1, 14))

        # ── Medications ─────────────────────────────────────────────────────────
        story.append(Paragraph("PRESCRIBED MEDICATIONS", section_hdr))
        story.append(HRFlowable(width="100%", thickness=0.5, color=DIVIDER, spaceAfter=8))

        med_data = [["#", "Medication", "Dosage", "Frequency", "Duration"]]
        for idx, med in enumerate(medications, 1):
            med_data.append([
                str(idx),
                med.get("name", "—"),
                med.get("dosage", "—"),
                med.get("frequency", "As directed"),
                med.get("duration", "—")
            ])

        med_table = Table(med_data, colWidths=["5%", "30%", "20%", "25%", "20%"])
        med_table.setStyle(TableStyle([
            # Header row
            ("BACKGROUND",  (0,0), (-1,0), PRIMARY),
            ("TEXTCOLOR",   (0,0), (-1,0), colors.white),
            ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0), (-1,0), 9),
            ("ALIGN",       (0,0), (-1,0), "CENTER"),
            # Data rows
            ("FONTNAME",    (0,1), (-1,-1), "Helvetica"),
            ("FONTSIZE",    (0,1), (-1,-1), 9.5),
            ("TEXTCOLOR",   (0,1), (-1,-1), DARK),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, TABLE_HDR]),
            ("ALIGN",       (0,1), (0,-1), "CENTER"),
            ("FONTNAME",    (1,1), (1,-1), "Helvetica-Bold"),
            # Grid
            ("GRID",        (0,0), (-1,-1), 0.4, DIVIDER),
            ("TOPPADDING",  (0,0), (-1,-1), 7),
            ("BOTTOMPADDING",(0,0),(-1,-1), 7),
            ("LEFTPADDING", (0,0), (-1,-1), 8),
            ("RIGHTPADDING",(0,0), (-1,-1), 8),
        ]))
        story.append(med_table)
        story.append(Spacer(1, 14))

        # ── Notes ───────────────────────────────────────────────────────────────
        if notes:
            story.append(Paragraph("CLINICAL NOTES", section_hdr))
            story.append(HRFlowable(width="100%", thickness=0.5, color=DIVIDER, spaceAfter=6))
            notes_box = Table([[Paragraph(notes, diag_style)]],
                              colWidths=["100%"])
            notes_box.setStyle(TableStyle([
                ("BACKGROUND",  (0,0),(-1,-1), colors.HexColor("#EFF6FF")),
                ("LEFTPADDING", (0,0),(-1,-1), 12),
                ("RIGHTPADDING",(0,0),(-1,-1), 12),
                ("TOPPADDING",  (0,0),(-1,-1), 8),
                ("BOTTOMPADDING",(0,0),(-1,-1),8),
                ("ROUNDEDCORNERS",(0,0),(-1,-1),4),
            ]))
            story.append(notes_box)
            story.append(Spacer(1, 14))

        # ── AI Disclosure ────────────────────────────────────────────────────────
        disclosure_data = [[
            Paragraph(
                "⚡ <b>AI-Assisted Prescription</b> — Generated by Dignova AI Triage Engine. "
                "This document has been reviewed and is valid only with a licensed practitioner's digital approval. "
                "Not a substitute for in-person medical consultation.",
                ParagraphStyle("disc", parent=styles["Normal"], fontSize=8,
                               textColor=colors.HexColor("#1E40AF"), fontName="Helvetica")
            )
        ]]
        disc_table = Table(disclosure_data, colWidths=["100%"])
        disc_table.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,-1), colors.HexColor("#DBEAFE")),
            ("LEFTPADDING", (0,0),(-1,-1), 10),
            ("TOPPADDING",  (0,0),(-1,-1), 8),
            ("BOTTOMPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(disc_table)
        story.append(Spacer(1, 20))

        # ── Doctor Signature ─────────────────────────────────────────────────────
        sig_data = [[
            [Paragraph("_________________________", sig_style),
             Paragraph(f"Dr. {doctor_name}", sig_style),
             Paragraph("Licensed Practitioner — Dignova AI", normal_sm)],
            [Paragraph("VALID PRESCRIPTION", ParagraphStyle("stamp",
                parent=styles["Normal"], fontSize=13, fontName="Helvetica-Bold",
                textColor=colors.HexColor("#15803D"), alignment=TA_RIGHT)),
             Paragraph(f"Date: {rx_date}", ParagraphStyle("date",
                parent=styles["Normal"], fontSize=9, fontName="Helvetica",
                textColor=colors.HexColor("#64748B"), alignment=TA_RIGHT))]
        ]]
        sig_table = Table(sig_data, colWidths=["55%", "45%"])
        sig_table.setStyle(TableStyle([
            ("VALIGN", (0,0),(-1,-1), "BOTTOM"),
            ("TOPPADDING",(0,0),(-1,-1), 0),
        ]))
        story.append(sig_table)

        # ── Footer ───────────────────────────────────────────────────────────────
        story.append(Spacer(1, 12))
        story.append(HRFlowable(width="100%", thickness=0.5, color=DIVIDER))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Dignova AI Healthcare Intelligence Platform  •  dignova.ai  •  "
            "Emergency: 1800-DIGNOVA  •  This prescription is digitally secured.",
            footer_style
        ))

        doc.build(story)
        print(f"✅ ReportLab prescription generated: {file_path}")

    except Exception as e:
        print(f"❌ ReportLab PDF error: {e}. Falling back to text.")
        _generate_text_prescription(patient_name, age, medications, doctor_name, file_path, diagnosis)


def _generate_text_prescription(patient_name, age, medications, doctor_name, file_path, diagnosis=None):
    """Fallback text-based prescription."""
    with open(file_path, "w") as f:
        f.write("=" * 60 + "\n")
        f.write("         DIGNOVA AI — MEDICAL PRESCRIPTION\n")
        f.write("=" * 60 + "\n")
        f.write(f"Patient Name : {patient_name}\n")
        f.write(f"Age          : {age}\n")
        f.write(f"Date         : {datetime.utcnow().strftime('%d %B %Y')}\n")
        if diagnosis:
            f.write(f"Diagnosis    : {diagnosis}\n")
        f.write(f"\nDoctor       : Dr. {doctor_name}\n")
        f.write("-" * 60 + "\nMEDICATIONS:\n")
        for i, med in enumerate(medications, 1):
            f.write(f"  {i}. {med.get('name')} — {med.get('dosage')} for {med.get('duration')}\n")
        f.write("=" * 60 + "\n")
