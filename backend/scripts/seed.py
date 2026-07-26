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
    print("--- Dignova Sentient Ecosystem Refactor: Multi-Tenant Bootstrap ---")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. ORGANIZATIONS (The Brains)
        # 1. ORGANIZATIONS (The Brains)
        manipal_stmt = select(domain.Organization).where(domain.Organization.org_code == "MANIPAL-2026")
        manipal = await db.scalar(manipal_stmt)
        if not manipal:
            manipal = domain.Organization(
                name="Manipal Hospitals",
                org_code="MANIPAL-2026",
                address="98, HAL Old Airport Rd, Bengaluru",
                contact_email="admin@manipal.edu",
                subscription_tier="enterprise",
                ai_philosophy="aggressive",
                stress_threshold=0.7,
                primary_color="#006400", # Manipal Green
                accent_color="#ffffff"
            )
            db.add(manipal)
            await db.commit()
            await db.refresh(manipal)
            print("Bootstrap: Created Manipal Organization")
        else:
            print("Bootstrap: Manipal Organization already exists")

        apollo_stmt = select(domain.Organization).where(domain.Organization.org_code == "APOLLO-2026")
        apollo = await db.scalar(apollo_stmt)
        if not apollo:
            apollo = domain.Organization(
                name="Apollo Hospitals",
                org_code="APOLLO-2026",
                address="Bannerghatta Main Rd, Bengaluru",
                contact_email="admin@apollohospitals.com",
                subscription_tier="sentient",
                ai_philosophy="balanced",
                stress_threshold=0.8,
                primary_color="#004d99", # Apollo Blue
                accent_color="#f2f2f2"
            )
            db.add(apollo)
            await db.commit()
            await db.refresh(apollo)
            print("Bootstrap: Created Apollo Organization")
        else:
            print("Bootstrap: Apollo Organization already exists")

        # 2. SUPER ADMIN
        admin_email = os.getenv("ADMIN_EMAIL", "cherrycostech@gmail.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

        stmt = select(domain.User).where(domain.User.email == admin_email)
        existing = await db.scalar(stmt)
        if not existing:
            super_admin = domain.User(
                name="Dignova Core Admin", 
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role=domain.UserRole.super_admin,
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(super_admin)
            print("Bootstrap: Super Admin created")

        # 3. ORG ADMIN
        stmt = select(domain.User).where(domain.User.email == "admin@manipal.ai")
        existing = await db.scalar(stmt)
        if not existing:
            org_admin = domain.User(
                name="Manipal Admin",
                email="admin@manipal.ai",
                hashed_password=get_password_hash("admin123"),
                role=domain.UserRole.org_admin,
                organization_id=manipal.id,
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(org_admin)
            print("Bootstrap: Org Admin created")

        # 4. EXPERIENCED DOCTOR
        stmt = select(domain.User).where(domain.User.email == "sarah.manipal@dignova.ai")
        existing = await db.scalar(stmt)
        if not existing:
            exp_doctor = domain.User(
                name="Dr. Sarah Smith",
                email="sarah.manipal@dignova.ai",
                hashed_password=get_password_hash("doctor123"),
                role=domain.UserRole.doctor,
                tier=domain.DoctorTier.experienced,
                specialty="Cardiology",
                organization_id=manipal.id,
                is_online=True,
                qualification="MD, DM Cardiology",
                license_number="KA-MED-2018-4521",
                department="Cardiology",
                experience_years=12,
                bio="Senior Interventional Cardiologist with 12 years of experience.",
                consultation_fee=1500,
                diagnostic_accuracy=94.5,
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(exp_doctor)
            print("Bootstrap: Experienced Doctor created")

        # 5. MID-RANGE DOCTOR
        stmt = select(domain.User).where(domain.User.email == "priya.manipal@dignova.ai")
        existing = await db.scalar(stmt)
        if not existing:
            mid_doctor = domain.User(
                name="Dr. Priya Nair",
                email="priya.manipal@dignova.ai",
                hashed_password=get_password_hash("doctor123"),
                role=domain.UserRole.doctor,
                tier=domain.DoctorTier.mid_range,
                specialty="Neurology",
                organization_id=manipal.id,
                is_online=True,
                qualification="MD, DM Neurology",
                license_number="KA-MED-2021-7832",
                department="Neurology",
                experience_years=5,
                bio="Neurologist specializing in stroke management and epilepsy.",
                consultation_fee=1000,
                diagnostic_accuracy=87.2,
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(mid_doctor)
            print("Bootstrap: Mid-Range Doctor created")

        # 6. INTERN
        stmt = select(domain.User).where(domain.User.email == "mike.intern@dignova.ai")
        existing = await db.scalar(stmt)
        if not existing:
            intern = domain.User(
                name="Intern Mike",
                email="mike.intern@dignova.ai",
                hashed_password=get_password_hash("doctor123"),
                role=domain.UserRole.doctor,
                tier=domain.DoctorTier.intern,
                specialty="Emergency Medicine",
                organization_id=manipal.id,
                is_online=True,
                qualification="MBBS (Final Year)",
                department="Emergency",
                experience_years=0,
                bio="Final year MBBS intern rotating through Emergency Medicine.",
                diagnostic_accuracy=45.0,
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(intern)
            print("Bootstrap: Intern created")

        # 7. NORMAL REGISTERED USER
        stmt = select(domain.User).where(domain.User.email == "mallelacharankumar@gmail.com")
        existing = await db.scalar(stmt)
        if not existing:
            normal_user = domain.User(
                name="Charan Kumar",
                email="mallelacharankumar@gmail.com",
                hashed_password=get_password_hash("user123"),
                role=domain.UserRole.user,
                age=20,
                blood_group="A+",
                emergency_contact="9036205526",
                preferred_language="English",
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(normal_user)
            print("Bootstrap: Normal User created (no org)")

        # 8. ORG-MONITORED PATIENT
        stmt = select(domain.User).where(domain.User.email == "ramesh.gupta@test.com")
        existing = await db.scalar(stmt)
        if not existing:
            monitored_patient = domain.User(
                name="Ramesh Gupta",
                email="ramesh.gupta@test.com",
                hashed_password=get_password_hash("user123"),
                role=domain.UserRole.user,
                organization_id=manipal.id,
                age=58,
                blood_group="B+",
                emergency_contact="9876543210",
                preferred_language="Hindi",
                height_cm=170.0,
                allergies="Penicillin, Sulfa drugs",
                medications="Metformin 500mg BD, Amlodipine 5mg OD",
                chronic_conditions="Type 2 Diabetes, Hypertension",
                last_checkup_date=datetime.utcnow() - timedelta(days=180),
                is_verified=True,
                verified_at=datetime.utcnow()
            )
            db.add(monitored_patient)
            print("Bootstrap: Org-Monitored Patient created (Manipal)")
            
        await db.commit()
        print("Bootstrap: Org-Monitored Patient created (Manipal)")

        # 5. TRAINING SCENARIOS (Ghost Replays - Rich Library)
        training_scenarios = [
            # ─── BEGINNER ────────────────────────────────────
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Common Cold Triage - Case #101",
                difficulty="beginner",
                category="General Medicine",
                patient_personality="calm and cooperative",
                initial_symptoms="I've been sneezing a lot for the past 2 days, runny nose, and mild sore throat. No fever.",
                expert_diagnosis="Acute Viral Upper Respiratory Infection (Common Cold). Self-limiting, no antibiotics needed.",
                expert_action_plan=[
                    {"timestamp": 10, "action": "Assess duration and severity of symptoms", "description": "Ask about symptom onset, severity, and any known triggers."},
                    {"timestamp": 30, "action": "Rule out flu and allergies", "description": "Check for high fever, body aches, or seasonal pattern."},
                    {"timestamp": 60, "action": "Recommend supportive care", "description": "Advise rest, hydration, warm fluids, and OTC antihistamines if needed."},
                    {"timestamp": 90, "action": "Set follow-up criteria", "description": "Instruct patient to return if symptoms worsen or persist beyond 10 days."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Mild Allergic Reaction - Case #102",
                difficulty="beginner",
                category="Allergy & Immunology",
                patient_personality="anxious but stable",
                initial_symptoms="I ate some shrimp an hour ago and now I have itchy red bumps on my arms and chest. No breathing difficulty.",
                expert_diagnosis="Acute Urticaria (Hives) secondary to food allergen exposure. Mild reaction, no anaphylaxis signs.",
                expert_action_plan=[
                    {"timestamp": 10, "action": "Identify allergen exposure", "description": "Confirm food ingestion timeline and known allergies."},
                    {"timestamp": 25, "action": "Assess for anaphylaxis signs", "description": "Check breathing, throat swelling, blood pressure, pulse. Rule out systemic reaction."},
                    {"timestamp": 45, "action": "Administer antihistamine", "description": "Recommend oral cetirizine 10mg or diphenhydramine 25mg."},
                    {"timestamp": 70, "action": "Monitor and educate", "description": "Observe for 2 hours, advise future allergen avoidance and EpiPen prescription if recurrent."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="UTI Assessment - Case #103",
                difficulty="beginner",
                category="Urology",
                patient_personality="embarrassed and hesitant",
                initial_symptoms="I've been having burning sensation when urinating for 3 days. Going to bathroom very frequently. Slightly cloudy urine.",
                expert_diagnosis="Uncomplicated Lower Urinary Tract Infection. Likely E. coli. Empiric antibiotic therapy indicated.",
                expert_action_plan=[
                    {"timestamp": 10, "action": "Symptom characterization", "description": "Assess dysuria, frequency, urgency, and urine color/odor."},
                    {"timestamp": 30, "action": "Rule out complications", "description": "Check for fever, flank pain, nausea (pyelonephritis indicators)."},
                    {"timestamp": 50, "action": "Order diagnostics", "description": "Request urinalysis and urine culture if recurrent."},
                    {"timestamp": 75, "action": "Initiate empiric treatment", "description": "Prescribe Nitrofurantoin 100mg BID x 5 days. Advise increased water intake."}
                ]
            ),

            # ─── INTERMEDIATE ────────────────────────────────
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Diabetic Ketoacidosis - Case #201",
                difficulty="intermediate",
                category="Internal Medicine",
                patient_personality="confused and lethargic",
                initial_symptoms="I'm a Type 1 diabetic. I've been vomiting since this morning, feeling very thirsty, and my breath smells fruity. My sugar reading was 'HI' on my meter.",
                expert_diagnosis="Diabetic Ketoacidosis (DKA). Requires immediate IV fluid resuscitation, insulin infusion, and electrolyte monitoring.",
                expert_action_plan=[
                    {"timestamp": 5, "action": "Recognize DKA triad", "description": "Identify hyperglycemia, ketosis (fruity breath), and metabolic acidosis signs."},
                    {"timestamp": 15, "action": "Initiate aggressive IV fluids", "description": "Start Normal Saline 1L bolus, then 250-500mL/hr. Monitor urine output."},
                    {"timestamp": 30, "action": "Start insulin drip", "description": "Regular insulin 0.1 units/kg/hr IV infusion after initial fluid resuscitation."},
                    {"timestamp": 45, "action": "Monitor electrolytes", "description": "Check potassium q2h, add KCl to IV when K+ < 5.3. Monitor bicarbonate and anion gap."},
                    {"timestamp": 90, "action": "Identify precipitating factor", "description": "Screen for infection, missed insulin doses, or new-onset diabetes."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Asthma Exacerbation - Case #202",
                difficulty="intermediate",
                category="Pulmonology",
                patient_personality="panicked and breathless",
                initial_symptoms="I can't breathe properly. My chest feels very tight and I'm wheezing. I used my blue inhaler 3 times but it's not helping. This started after I was cleaning a dusty room.",
                expert_diagnosis="Moderate-to-Severe Acute Asthma Exacerbation. Triggered by dust exposure. Requires nebulization and systemic corticosteroids.",
                expert_action_plan=[
                    {"timestamp": 5, "action": "Assess severity immediately", "description": "Check SpO2, respiratory rate, ability to speak in sentences, use of accessory muscles."},
                    {"timestamp": 15, "action": "Administer bronchodilator", "description": "Nebulized salbutamol 5mg + ipratropium 500mcg. Repeat q20min x3 if needed."},
                    {"timestamp": 30, "action": "Give systemic steroids", "description": "Oral prednisolone 40mg or IV hydrocortisone 100mg for anti-inflammatory effect."},
                    {"timestamp": 60, "action": "Reassess and disposition", "description": "If SpO2 > 94% and able to speak: discharge with 5-day prednisolone course. If not improving: escalate."},
                    {"timestamp": 90, "action": "Trigger avoidance counseling", "description": "Educate on dust mite precautions, inhaler technique review, and action plan."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Pediatric Febrile Seizure - Case #203",
                difficulty="intermediate",
                category="Pediatrics",
                patient_personality="parent is crying and terrified",
                initial_symptoms="My 2-year-old son suddenly started shaking all over. His eyes rolled back and the whole body was jerking for about 2 minutes. He had a fever of 103 deg F since yesterday. He's now drowsy but breathing.",
                expert_diagnosis="Simple Febrile Seizure secondary to viral febrile illness. Self-limiting, but requires fever source identification and parental reassurance.",
                expert_action_plan=[
                    {"timestamp": 5, "action": "Ensure airway protection", "description": "Place child in recovery position. Do NOT insert anything in mouth. Time the seizure."},
                    {"timestamp": 15, "action": "Assess post-ictal state", "description": "Check responsiveness, breathing, and signs of meningitis (neck stiffness, bulging fontanelle)."},
                    {"timestamp": 30, "action": "Administer antipyretic", "description": "Paracetamol 15mg/kg rectally or orally once conscious. Tepid sponging."},
                    {"timestamp": 50, "action": "Identify fever source", "description": "Check ears, throat, urine for UTI. Consider blood cultures if clinically indicated."},
                    {"timestamp": 80, "action": "Reassure and educate parents", "description": "Explain benign nature of simple febrile seizures. Provide seizure first aid education and return criteria."}
                ]
            ),

            # ─── ADVANCED ────────────────────────────────────
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Cardiac Arrest Triage - Case #301",
                difficulty="advanced",
                category="Cardiology",
                patient_personality="panicked and breathless",
                initial_symptoms="My chest is crushing - like an elephant is sitting on it. The pain is going to my left arm and jaw. I'm sweating buckets. Started 20 minutes ago while climbing stairs.",
                expert_diagnosis="Acute Myocardial Infarction (STEMI). Requires immediate cath lab activation and dual antiplatelet therapy.",
                expert_action_plan=[
                    {"timestamp": 5, "action": "Identify STEMI criteria", "description": "Classic triad: crushing substernal chest pain, radiation to left arm/jaw, diaphoresis."},
                    {"timestamp": 15, "action": "Immediate interventions", "description": "Aspirin 325mg chew, sublingual nitroglycerin, morphine for pain. 12-lead ECG within 10 min."},
                    {"timestamp": 30, "action": "Activate cath lab", "description": "Call interventional cardiology. Target door-to-balloon < 90 min."},
                    {"timestamp": 45, "action": "Dispatch ALS Ambulance", "description": "If pre-hospital: dispatch Advanced Life Support unit with continuous cardiac monitoring."},
                    {"timestamp": 120, "action": "Secondary management", "description": "Start heparin bolus, beta-blocker if no contraindication, and serial troponin monitoring."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Acute Stroke Assessment - Case #302",
                difficulty="advanced",
                category="Neurology",
                patient_personality="confused, speech is slurred",
                initial_symptoms="My husband suddenly can't move his right arm. His face is drooping on one side and he can't speak properly. It started about 45 minutes ago while he was watching TV.",
                expert_diagnosis="Acute Ischemic Stroke (Left MCA territory). Within thrombolysis window. FAST-positive presentation.",
                expert_action_plan=[
                    {"timestamp": 5, "action": "FAST assessment", "description": "Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Establish symptom onset time."},
                    {"timestamp": 10, "action": "Activate stroke code", "description": "Immediate CT head to rule out hemorrhagic stroke. Target door-to-CT < 25 min."},
                    {"timestamp": 20, "action": "Check thrombolysis eligibility", "description": "Confirm symptom onset < 4.5 hours, no contraindications (recent surgery, active bleeding, INR)."},
                    {"timestamp": 30, "action": "Administer tPA", "description": "Alteplase 0.9mg/kg IV (max 90mg). 10% bolus, rest over 60 minutes. Monitor for hemorrhagic conversion."},
                    {"timestamp": 60, "action": "Post-tPA monitoring", "description": "Neuro checks q15min x 2h, then q30min x 6h. BP target < 180/105. Repeat CT at 24h."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Sepsis Protocol - Case #303",
                difficulty="advanced",
                category="Emergency Medicine",
                patient_personality="delirious and shivering",
                initial_symptoms="I had a small cut on my leg that got infected 4 days ago. Now I have high fever 104 deg F, shaking chills, heart racing, and I feel confused about where I am. The wound is red and swollen with pus.",
                expert_diagnosis="Severe Sepsis with suspected cellulitis source. Meets SIRS criteria. Requires Hour-1 Sepsis Bundle activation.",
                expert_action_plan=[
                    {"timestamp": 5, "action": "Recognize sepsis criteria", "description": "SIRS: Temp > 38.3 deg C, HR > 90, altered mental status. Calculate qSOFA score."},
                    {"timestamp": 10, "action": "Obtain cultures BEFORE antibiotics", "description": "Blood cultures x2 (different sites), wound culture/swab. Lactate level STAT."},
                    {"timestamp": 15, "action": "Initiate Hour-1 Bundle", "description": "Broad-spectrum IV antibiotics (piperacillin-tazobactam). 30mL/kg crystalloid bolus for hypotension."},
                    {"timestamp": 30, "action": "Source control", "description": "Surgical consult for wound debridement if abscess present. I&D may be required."},
                    {"timestamp": 60, "action": "Reassess perfusion", "description": "If MAP < 65 after fluids: start norepinephrine. Repeat lactate at 6h. Target clearance > 10%."}
                ]
            ),
            domain.TrainingScenario(
                organization_id=manipal.id,
                title="Anaphylaxis Management - Case #304",
                difficulty="advanced",
                category="Emergency Medicine",
                patient_personality="gasping, unable to speak clearly",
                initial_symptoms="I got stung by a bee 10 minutes ago. My throat is swelling shut, I can barely breathe, I'm covered in hives, and I feel dizzy like I'm going to faint. I don't have my EpiPen.",
                expert_diagnosis="Anaphylaxis - Hymenoptera venom allergy. Life-threatening. Requires immediate IM epinephrine and airway management.",
                expert_action_plan=[
                    {"timestamp": 2, "action": "Administer epinephrine IMMEDIATELY", "description": "IM Epinephrine 0.3-0.5mg (1:1000) mid-lateral thigh. This is the FIRST and MOST critical step."},
                    {"timestamp": 5, "action": "Secure airway", "description": "Position supine with legs elevated (unless respiratory distress → sit upright). Prepare for intubation if airway compromised."},
                    {"timestamp": 10, "action": "Establish IV access and fluids", "description": "Large-bore IV. NS 1-2L bolus for hypotension. Monitor BP, HR, SpO2 continuously."},
                    {"timestamp": 15, "action": "Adjunctive medications", "description": "IV diphenhydramine 50mg, ranitidine 50mg, methylprednisolone 125mg IV (prevents biphasic reaction)."},
                    {"timestamp": 20, "action": "Repeat epinephrine if needed", "description": "If no improvement in 5-15 min: repeat IM epinephrine. Prepare epinephrine drip if refractory."},
                    {"timestamp": 60, "action": "Observation and discharge planning", "description": "Monitor 4-6 hours minimum (biphasic reactions). Prescribe EpiPen, allergy referral, and medic-alert bracelet."}
                ]
            ),
        ]
        db.add_all(training_scenarios)
        await db.commit()
        print(f"Bootstrap: {len(training_scenarios)} Training Scenarios created across beginner/intermediate/advanced")

if __name__ == "__main__":
    asyncio.run(seed_data())
