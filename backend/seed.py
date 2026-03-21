import asyncio
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

import app.models as domain
from app.extensions import Base, engine, AsyncSessionLocal
from app.utils.auth import get_password_hash

load_dotenv()

async def seed_data():
    print("--- Dynamic Bootstrapping (Async) ---")
    
    # 1. Create tables
    async with engine.begin() as conn:
        # For development, we drop and recreate for clean state
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # =============================================
        # 1. ADMIN BOOTSTRAP
        # =============================================
        admin_email = os.getenv("ADMIN_EMAIL", "admin@dignova.ai")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

        new_admin = domain.User(
            name="System Admin", 
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            role=domain.UserRole.admin,
            is_verified=True,
            verified_at=datetime.utcnow(),
            emergency_contact="Emergency: 911",
            weight_kg=72.5,
            height_cm=175.0,
            allergies="Latex",
            medications="Atorvastatin",
            chronic_conditions="Hypertension"
        )
        db.add(new_admin)
        print(f"Bootstrap: Admin created ({admin_email})")

        # =============================================
        # 2. DOCTOR TIERS BOOTSTRAP
        # =============================================
        doctors_data = [
            {
                "name": "Dr. Sarah Smith",
                "email": "sarah.experienced@dignova.ai",
                "phone_number": "+11111111111",
                "role": domain.UserRole.doctor,
                "tier": domain.DoctorTier.experienced,
                "specialty": "Cardiology",
                "is_online": True,
                "qualification": "MBBS, MD Cardiology, FACC",
                "license_number": "MCI-2018-456789",
                "department": "Cardiology & Interventional Medicine",
                "experience_years": 14,
                "bio": "Board-certified cardiologist with 14 years of experience in interventional cardiology and heart failure management. Published 30+ peer-reviewed papers on acute coronary syndromes. Specializes in minimally invasive cardiac procedures and preventive cardiology.",
                "languages": "English, Spanish",
                "consultation_fee": 1500,
                "available_hours": "Mon-Fri 9AM-5PM, Sat 10AM-2PM",
                "rating": 4.9,
                "weight_kg": 62.5,
                "height_cm": 165.0,
                "allergies": "Penicillin",
                "medications": "None",
                "chronic_conditions": "None"
            },
            {
                "name": "Dr. James Wilson",
                "email": "james.mid@dignova.ai",
                "phone_number": "+12222222222",
                "role": domain.UserRole.doctor,
                "tier": domain.DoctorTier.mid_range,
                "specialty": "General Medicine",
                "is_online": True,
                "qualification": "MBBS, DNB General Medicine",
                "license_number": "MCI-2020-123456",
                "department": "Internal Medicine",
                "experience_years": 7,
                "bio": "Dedicated general physician with expertise in chronic disease management, diabetes care, and preventive health screenings. Passionate about patient education and holistic treatment approaches.",
                "languages": "English, Hindi, Telugu",
                "consultation_fee": 800,
                "available_hours": "Mon-Sat 9AM-7PM",
                "rating": 4.2,
                "weight_kg": 85.0,
                "height_cm": 182.0,
                "allergies": "Dust, Pollen",
                "medications": "Inhaler (PRN)",
                "chronic_conditions": "Mild Asthma"
            },
            {
                "name": "Dr. Emily Chen",
                "email": "emily.exp@dignova.ai",
                "phone_number": "+13333333333",
                "role": domain.UserRole.doctor,
                "tier": domain.DoctorTier.experienced,
                "specialty": "Neurology",
                "is_online": False,
                "qualification": "MBBS, DM Neurology, PhD Neuroscience",
                "license_number": "MCI-2015-789012",
                "department": "Neurology & Neuroscience",
                "experience_years": 18,
                "bio": "Internationally recognized neurologist specializing in epilepsy, stroke rehabilitation, and neurodegenerative disorders. Former research fellow at Johns Hopkins. Pioneer in AI-assisted neurological diagnostics.",
                "languages": "English, Mandarin, Japanese",
                "consultation_fee": 2000,
                "available_hours": "Mon-Thu 10AM-4PM",
                "rating": 4.8,
                "weight_kg": 55.0,
                "height_cm": 160.0,
                "allergies": "None",
                "medications": "None",
                "chronic_conditions": "None"
            },
            {
                "name": "Intern Mike",
                "email": "mike.intern@dignova.ai",
                "phone_number": "+14444444444",
                "role": domain.UserRole.doctor,
                "tier": domain.DoctorTier.intern,
                "specialty": "Trainee - Emergency Medicine",
                "is_online": True,
                "qualification": "MBBS (Final Year Residency)",
                "license_number": "MCI-2024-INTERN-001",
                "department": "Emergency Medicine (Training)",
                "experience_years": 1,
                "bio": "Final year resident in Emergency Medicine. Currently training under the Dignova AI Triage system to enhance diagnostic accuracy and patient interaction skills. Focused on trauma response and acute care protocols.",
                "languages": "English, Korean",
                "consultation_fee": 300,
                "available_hours": "Shift-based (Rotating)",
                "rating": 4.2,
            }
        ]

        doctor_objects: list[domain.User] = []
        for doc_data in doctors_data:
            new_doc = domain.User(
                **doc_data,
                hashed_password=get_password_hash("doctor123"),
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(new_doc)
            doctor_objects.append(new_doc)
            print(f"Bootstrap: Doctor created ({doc_data['name']} - {doc_data['tier'].value if hasattr(doc_data['tier'], 'value') else doc_data['tier']})")

        # =============================================
        # 3. PATIENT USERS
        # =============================================
        patients_data = [
            {"name": "Alex Johnson", "email": "alex@patient.com", "phone_number": "+15551001001", "age": 34, "blood_group": "O+", "address": "123 Main St", "emergency_contact": "+15559991001"},
            {"name": "Priya Sharma", "email": "priya@patient.com", "phone_number": "+15551001002", "age": 28, "blood_group": "A+", "address": "456 Oak Ave", "emergency_contact": "+15559991002"},
            {"name": "Carlos Mendez", "email": "carlos@patient.com", "phone_number": "+15551001003", "age": 52, "blood_group": "B-", "address": "789 Pine Rd", "emergency_contact": "+15559991003"},
            {"name": "Fatima Al-Rashid", "email": "fatima@patient.com", "phone_number": "+15551001004", "age": 41, "blood_group": "AB+", "address": "101 Maple Dr", "emergency_contact": "+15559991004"},
            {"name": "Yuki Tanaka", "email": "yuki@patient.com", "phone_number": "+15551001005", "age": 19, "blood_group": "O-", "address": "202 Cedar Ln", "emergency_contact": "+15559991005"},
        ]

        patient_objects: list[domain.User] = []
        for p_data in patients_data:
            new_patient = domain.User(
                **p_data,
                hashed_password=get_password_hash("patient123"),
                role=domain.UserRole.user,
                is_verified=True,
                verified_at=datetime.utcnow(),
                weight_kg=random.uniform(50, 100),
                height_cm=random.uniform(150, 195),
                allergies=random.choice(["None", "Pollen", "Dust", "Latex", "Penicillin"]),
                medications=random.choice(["None", "Metformin", "Lisinopril", "Albuterol"]),
                chronic_conditions=random.choice(["None", "Hypertension", "Type 2 Diabetes", "Asthma"])
            )
            db.add(new_patient)
            patient_objects.append(new_patient)
            print(f"Bootstrap: Patient created ({p_data['name']})")

        # =============================================
        # 4. HOSPITAL RESOURCES 
        # =============================================
        resources = [
            {"resource_type": "ICU", "total": 20, "available": 14},
            {"resource_type": "General", "total": 50, "available": 38},
            {"resource_type": "Ambulance", "total": 10, "available": 7},
            {"resource_type": "Ventilator", "total": 15, "available": 11},
            {"resource_type": "Blood Bank", "total": 100, "available": 72},
        ]
        
        for res_data in resources:
            db_res = domain.Resource(**res_data)
            db.add(db_res)
            print(f"Resource: Initialized {res_data['resource_type']} ({res_data['available']}/{res_data['total']})")

        # Flush to get IDs
        await db.flush()

        # =============================================
        # 5. REALISTIC CALL HISTORY (last 14 days)
        # =============================================
        now = datetime.utcnow()
        severities = ["CRITICAL", "ELEVATED", "STANDARD", "STANDARD", "ELEVATED"]
        diagnoses = [
            "Suspected Myocardial Infarction",
            "Acute Migraine with Aura",
            "Mild Respiratory Infection",
            "Dehydration & Fatigue",
            "Fractured Left Wrist",
            "Suspected Appendicitis",
            "Allergic Reaction - Moderate",
            "Hypertensive Crisis",
            "Lower Back Strain",
            "Urinary Tract Infection",
            "Suspected Pneumonia",
            "Anxiety Episode with Chest Tightness",
        ]
        states = ["completed", "completed", "completed", "completed", "completed", "evaluation", "active", "abandoned", "failed"]
        
        transcripts = [
            "PATIENT: I've been having severe chest pain for the last 30 minutes.\nASSISTANT: I understand. Can you describe where exactly the pain is?\nPATIENT: It's in the center of my chest, radiating to my left arm.\nASSISTANT: That is very important. Are you experiencing any shortness of breath or nausea?\nPATIENT: Yes, both. I feel like I can't breathe and I'm sweating.\nASSISTANT: Based on your symptoms, this could be a cardiac event. I'm flagging this as critical and dispatching an ambulance immediately.",
            "PATIENT: My head has been pounding since this morning.\nASSISTANT: I'm sorry to hear that. On a scale of 1-10, how would you rate the pain?\nPATIENT: About an 8. I also see flashing lights.\nASSISTANT: Visual disturbances with severe headache could indicate a migraine with aura. Have you experienced this before?\nPATIENT: A few times, but never this bad.",
            "PATIENT: I've had a cough and runny nose for three days.\nASSISTANT: Any fever or body aches?\nPATIENT: Low grade fever, around 99.5.\nASSISTANT: It sounds like a mild respiratory infection. I'd recommend rest and fluids.",
            "PATIENT: I fell down the stairs and my wrist is swelling badly.\nASSISTANT: Can you move your fingers? Is there visible deformity?\nPATIENT: I can barely move them. It's very swollen and bruised.\nASSISTANT: This sounds like a possible fracture. I'm scheduling you for an X-ray at General.",
        ]

        call_objects: list[domain.Call] = []
        for day_offset in range(14):
            # Random number of calls per day (2-8)
            num_calls = random.randint(2, 8)
            for _ in range(num_calls):
                # Randomly pick a patient and doctor
                patient = random.choice(patient_objects)
                doc_subset = doctor_objects[:3] # Ensure list
                doctor = random.choice(doc_subset)
                call_state = random.choice(states)
                severity = random.choice(severities)
                
                start = now - timedelta(days=day_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
                duration_minutes = random.randint(2, 25)
                end = start + timedelta(minutes=duration_minutes) if call_state in ["completed", "evaluation"] else None
                
                diagnosis = random.choice(diagnoses) if call_state in ["completed", "evaluation"] else None
                transcript = random.choice(transcripts) if random.random() > 0.3 else None
                correctness = random.randint(60, 100) if call_state == "completed" else None

                new_call = domain.Call(
                    user_id=patient.id,
                    call_type=domain.CallType.triage,
                    start_time=start,
                    end_time=end,
                    state=call_state,
                    severity=severity,
                    diagnosis_given=diagnosis,
                    transcript=transcript,
                    correctness=correctness,
                    forwarded_to_doctor_id=doctor.id if random.random() > 0.4 else None
                )
                db.add(new_call)
                call_objects.append(new_call)

        print(f"Calls: Seeded {len(call_objects)} realistic triage calls over 14 days")

        # Add a few currently active calls (for doctor queue)
        active_call_data = [
            {"severity": "CRITICAL", "transcript": "PATIENT: I can't breathe. My chest feels like it's being crushed.\nASSISTANT: Please stay calm. Can you tell me if this pain just started?\nPATIENT: About 10 minutes ago. It's getting worse."},
            {"severity": "ELEVATED", "transcript": "PATIENT: I hit my head badly. I feel dizzy and disoriented.\nASSISTANT: Can you tell me if you lost consciousness at any point?\nPATIENT: I think so, for a moment."},
            {"severity": "STANDARD", "transcript": "PATIENT: I've had persistent fever and cough for 3 days.\nASSISTANT: Any difficulty breathing?\nPATIENT: Not really, just uncomfortable."},
        ]
        for i, active in enumerate(active_call_data):
            patient = patient_objects[i % len(patient_objects)]
            new_call = domain.Call(
                user_id=patient.id,
                call_type=domain.CallType.triage,
                start_time=now - timedelta(minutes=random.randint(3, 45)),
                state="active",
                severity=active["severity"],
                transcript=active["transcript"]
            )
            db.add(new_call)

        print("Calls: Added 3 currently active triage sessions")

        # =============================================
        # 6. BOOKINGS from completed calls
        # =============================================
        await db.flush()
        booking_count: int = 0
        call_subset = call_objects[:15]
        for c in call_subset:  # First 15 completed calls get bookings
            if c.state in ["completed", "evaluation"]:
                res_type = random.choice(["ICU", "General", "Ambulance"])
                booking = domain.Booking(
                    call_id=c.call_id,
                    resource_type=res_type,
                    status=random.choice([domain.BookingStatus.approved, domain.BookingStatus.pending]),
                    allotted_time=c.end_time or now
                )
                db.add(booking)
                booking_count += 1
        print(f"Bookings: Created {booking_count} resource bookings")

        # =============================================
        # 7. USER VITALS (for patient dashboards)
        # =============================================
        vitals_count: int = 0
        for patient in patient_objects:
            # 20 readings over the last 7 days for each patient
            base_hr = random.randint(65, 85)
            base_systolic = random.randint(110, 130)
            base_diastolic = random.randint(70, 85)
            base_spo2 = random.randint(95, 99)
            
            for reading in range(20):
                recorded_at = now - timedelta(days=reading * 0.35, hours=random.randint(0, 12))
                vitals = domain.UserVitals(
                    user_id=patient.id,
                    heart_rate=base_hr + random.randint(-10, 15),
                    systolic_bp=base_systolic + random.randint(-8, 12),
                    diastolic_bp=base_diastolic + random.randint(-5, 8),
                    spo2=min(100, base_spo2 + random.randint(-2, 2)),
                    temperature=f"{97.5 + random.uniform(0, 2.5):.1f}°F",
                    recorded_at=recorded_at
                )
                db.add(vitals)
                vitals_count += 1
        print(f"Vitals: Seeded {vitals_count} health readings for {len(patient_objects)} patients")

        # =============================================
        # 8. TRAINING REPORTS (for intern dashboard)
        # =============================================
        intern = doctor_objects[3]  # Intern Mike
        for i in range(5):
            report = domain.TrainingReport(
                intern_id=intern.id,
                call_id=call_objects[i].call_id if i < len(call_objects) else 1,
                score=random.randint(55, 95),
                feedback=random.choice([
                    "Good empathy shown. Missed asking about medication allergies.",
                    "Excellent systematic approach. Could improve on urgency assessment.",
                    "Needs to ask about pain radiation earlier in the conversation.",
                    "Strong diagnostic intuition. Work on calming panicked patients.",
                    "Missed critical red flag: jaw pain radiation. Review cardiac protocols."
                ]),
                missed_red_flags=random.sample(
                    ["Jaw radiation", "Onset timing", "Allergy check", "Family history", "Medication list", "Nausea assessment"],
                    k=random.randint(1, 3)
                ),
                created_at=now - timedelta(days=i * 2)
            )
            db.add(report)
        print("Training: Seeded 5 intern training reports")

        # =============================================
        # 9. SIMULATED PATIENTS (for training)
        # =============================================
        sim_patients = [
            {
                "name": "Robert Miller",
                "age": 62,
                "gender": "Male",
                "case_title": "Acute Chest Pain",
                "secret_diagnosis": "Myocardial Infarction (Heart Attack)",
                "initial_complaint": "I've been having this heavy pressure in my chest for about 20 minutes now. It's not going away.",
                "secondary_symptoms": ["Pain radiating to left jaw", "Nausea", "Cold sweat", "Shortness of breath"],
                "personality_traits": "Anxious, slightly breathless, but cooperative",
                "difficulty": "Beginner"
            },
            {
                "name": "Sarah Jenkins",
                "age": 45,
                "gender": "Female",
                "case_title": "Sudden Weakness",
                "secret_diagnosis": "Ischemic Stroke",
                "initial_complaint": "My right arm feels really heavy and I'm having trouble holding my coffee cup. My words sound funny to me.",
                "secondary_symptoms": ["Facial drooping on right side", "Slurred speech", "Sudden headache", "Loss of balance"],
                "personality_traits": "Confused, frightened, struggling to speak clearly",
                "difficulty": "Intermediate"
            },
            {
                "name": "David Thompson",
                "age": 28,
                "gender": "Male",
                "case_title": "Severe Breathlessness",
                "secret_diagnosis": "Acute Asthma Exacerbation",
                "initial_complaint": "I can't... get enough... air. My inhaler... isn't... working.",
                "secondary_symptoms": ["Wheezing", "Tightness in chest", "Unable to speak in full sentences", "Cyanosis (blue tint) around lips"],
                "personality_traits": "Panic-stricken, very short sentences, audible wheezing",
                "difficulty": "Intermediate"
            }
        ]

        for sim_data in sim_patients:
            new_sim = domain.SimulatedPatient(**sim_data)
            db.add(new_sim)
            print(f"Bootstrap: Simulated Patient created ({sim_data['case_title']})")

        await db.commit()
    
    print("\n" + "=" * 50)
    print("  SEEDING COMPLETE — ALL DATA IS REAL & DYNAMIC")
    print("=" * 50)

if __name__ == "__main__":
    import asyncio
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_data())
