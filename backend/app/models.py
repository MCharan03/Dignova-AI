from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Boolean, Text, JSON, Float, Date
from .extensions import Base
import enum
from datetime import datetime

class UserRole(enum.Enum):
    super_admin = "super_admin" # Dignova Global Admin
    org_admin = "org_admin"     # Hospital Admin (Manipal/Apollo)
    doctor = "doctor"
    user = "user"

class DoctorTier(enum.Enum):
    experienced = "experienced"
    mid_range = "mid_range"
    intern = "intern"

class CallType(enum.Enum):
    emergency = "emergency"
    triage = "triage"
    training = "training"

class BookingStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# ============================================================
# === NEW: ORGANIZATION MODEL (The Brain of the Hospital) ===
# ============================================================
class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    org_code = Column(String, unique=True, index=True, nullable=False) # e.g., MANIPAL-2026
    address = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    
    # Sentient Layer Settings (The "Hospital Pulse" Config)
    subscription_tier = Column(String, default="sentient") # standard | sentient | enterprise
    ai_philosophy = Column(String, default="balanced")   # aggressive | balanced | conservative
    stress_threshold = Column(Float, default=0.75)         # Telemetry trigger point
    
    # Capacity & Status
    is_active = Column(Boolean, default=True)
    max_beds = Column(Integer, default=100)
    max_doctors = Column(Integer, default=50)
    logo_url = Column(String, nullable=True)
    
    # Branded OS Skin
    primary_color = Column(String, default="#06b6d4") 
    accent_color = Column(String, default="#a855f7")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.user)
    address = Column(String, nullable=True)

    # Doctor specific
    tier = Column(Enum(DoctorTier), nullable=True)
    specialty = Column(String, nullable=True)
    is_online = Column(Boolean, default=False)
    qualification = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)
    bio = Column(Text, nullable=True)
    consultation_fee = Column(Integer, nullable=True)
    
    # Emotional Telemetry & Performance
    avg_stress_level = Column(Float, default=0.0)
    diagnostic_accuracy = Column(Float, default=0.0)
    
    # Bharat-Ready Telemetry
    age = Column(Integer, nullable=True)
    blood_group = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    preferred_language = Column(String, default="English") # Hindi, Kannada, Tamil, etc.
    lat = Column(Float, nullable=True) # Real-time position for Asha Node
    lon = Column(Float, nullable=True)
    
    # Patient health telemetry
    height_cm = Column(Float, nullable=True)
    allergies = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)

    telegram_chat_id = Column(String, nullable=True, index=True)
    telegram_username = Column(String, nullable=True)
    
    # Preventive Care Telemetry
    last_checkup_date = Column(DateTime, nullable=True)
    last_blood_test_date = Column(DateTime, nullable=True)

    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Call(Base):
    __tablename__ = "calls"
    call_id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    call_type = Column(Enum(CallType), default=CallType.triage)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    state = Column(String, default="active") # active | history | training_replay
    diagnosis_given = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    severity = Column(String, default="UNKNOWN")
    source = Column(String, default="web")
    
    # Bharat-Ready Context
    network_acuity = Column(String, default="high") # low (survivor) | mid | high
    language_mode = Column(String, default="auto") 
    is_recovered = Column(Boolean, nullable=True) # Feedback from Aftercare (True=Better, False=Sick)

# ============================================================
# === NEW: TRAINING SCENARIO (The Ghost Replay Engine) ===
# ============================================================
class TrainingScenario(Base):
    """
    Stores "Ghost Replays" of real cases for Intern training.
    """
    __tablename__ = "training_scenarios"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"))
    source_call_id = Column(Integer, ForeignKey("calls.call_id"), nullable=True) # The "Real Data" source
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Doctor who authored the scenario
    
    title = Column(String, nullable=False)
    difficulty = Column(String, default="intermediate")
    patient_personality = Column(String, default="distressed")
    category = Column(String, default="General Medicine") # Specialty: Cardiology, ER, Neurology, etc.
    initial_symptoms = Column(Text, nullable=True) # Patient's opening complaint shown to interns
    
    # The "Gold Standard" from the real expert
    expert_diagnosis = Column(Text, nullable=False)
    expert_action_plan = Column(JSON, nullable=False) # Timestamps of interventions
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrainingReport(Base):
    __tablename__ = "training_reports"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    intern_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    scenario_id = Column(Integer, ForeignKey("training_scenarios.id", ondelete="CASCADE"), nullable=True)
    transcript = Column(Text, nullable=True) # To track intern performance
    score = Column(Integer)
    alignment_with_expert = Column(Float) # How close to the "Ghost Replay" they were
    feedback = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Booking(Base):
    __tablename__ = "bookings"
    booking_id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="CASCADE"))
    resource_type = Column(String) # e.g., Ambulance, ICU Bed
    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    allotted_time = Column(DateTime, default=datetime.utcnow)

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="CASCADE"))
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    medications = Column(JSON)
    pdf_path = Column(String, nullable=True)
    diagnosis = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_auto_generated = Column(Boolean, default=False)
    approved_by_doctor = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TelegramSession(Base):
    __tablename__ = "telegram_sessions"
    id = Column(Integer, primary_key=True, index=True)
    telegram_chat_id = Column(String, nullable=False, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    active_call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="SET NULL"), nullable=True)
    state = Column(String, default="idle")
    context_json = Column(JSON, nullable=True)
    last_interaction = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class AppointmentSlot(Base):
    __tablename__ = "appointment_slots"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    slot_time = Column(DateTime, nullable=False)
    status = Column(String, default="pending") # pending | confirmed | cancelled
    notes = Column(Text, nullable=True)
    google_event_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AftercarePing(Base):
    __tablename__ = "aftercare_pings"
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"))
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    scheduled_for = Column(DateTime, nullable=False) # Maps to ping_due_date in some logic
    status = Column(String, default="pending") # pending | sent | responded
    patient_response = Column(String, nullable=True) # better | worse
    responded_at = Column(DateTime, nullable=True)
    doctor_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Keep system settings global for Dignova Layer management
class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)

class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g., Ambulance, ICU Bed
    status = Column(String, default="available") # available | busy | maintenance
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============================================================
# === PHASE 1: ECOSYSTEM INFRASTRUCTURE MODELS ===
# ============================================================

class Department(Base):
    """Hospital departments within an organization (e.g., Cardiology, Neurology)."""
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    head_doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    floor = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    bed_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DoctorSchedule(Base):
    """Weekly shift schedule for doctors within an organization."""
    __tablename__ = "doctor_schedules"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(String, nullable=False)      # "09:00"
    end_time = Column(String, nullable=False)         # "17:00"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    """Immutable audit trail for all significant actions."""
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)           # e.g., "user.create", "org.suspend", "call.escalate"
    target_type = Column(String, nullable=True)       # e.g., "user", "organization", "call"
    target_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)             # Additional context
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    """In-app notifications for all user roles."""
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")             # info | warning | critical | success
    category = Column(String, default="system")       # system | triage | appointment | prescription | alert
    link = Column(String, nullable=True)               # Deep link to relevant page
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserVitals(Base):
    """Real patient vitals replacing mocked data. Supports manual entry and IoT webhook."""
    __tablename__ = "user_vitals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    heart_rate = Column(Integer, nullable=True)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    spo2 = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)        # in Fahrenheit
    respiratory_rate = Column(Integer, nullable=True)
    blood_glucose = Column(Float, nullable=True)      # mg/dL
    weight_kg = Column(Float, nullable=True)
    source = Column(String, default="manual")          # manual | wearable | iot | clinic
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
