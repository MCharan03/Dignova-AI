from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Boolean, Text, JSON, Float, Date
from .extensions import Base
import enum
from datetime import datetime

class UserRole(enum.Enum):
    admin = "admin"
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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    age = Column(Integer, nullable=True)
    blood_group = Column(String, nullable=True)
    address = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.user)

    # Doctor specific fields
    tier = Column(Enum(DoctorTier), nullable=True)
    specialty = Column(String, nullable=True)
    is_online = Column(Boolean, default=False)

    # Doctor medical profile
    qualification = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    experience_years = Column(Integer, nullable=True)
    bio = Column(Text, nullable=True)
    languages = Column(String, nullable=True)
    consultation_fee = Column(Integer, nullable=True)
    available_hours = Column(String, nullable=True)
    rating = Column(Float, nullable=True)

    # Patient health telemetry
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    allergies = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)

    # === NEW: Telegram Integration ===
    telegram_chat_id = Column(String, nullable=True, index=True)  # User's Telegram chat ID
    telegram_username = Column(String, nullable=True)              # @username

    # === NEW: Preventive Care Tracking ===
    last_checkup_date = Column(DateTime, nullable=True)            # Date of last full check-up
    last_blood_test_date = Column(DateTime, nullable=True)         # Date of last blood test

    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, unique=True, index=True)
    total = Column(Integer, default=0)
    available = Column(Integer, default=0)


class Call(Base):
    __tablename__ = "calls"
    call_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    call_type = Column(Enum(CallType), default=CallType.triage)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    state = Column(String, default="history")
    diagnosis_given = Column(String, nullable=True)
    transcript = Column(Text, nullable=True)
    correctness = Column(Integer, nullable=True)
    forwarded_to_doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    severity = Column(String, default="UNKNOWN")
    # === NEW: Source tracking ===
    source = Column(String, default="web")  # web, telegram, whatsapp


class TrainingReport(Base):
    __tablename__ = "training_reports"
    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="CASCADE"))
    score = Column(Integer)
    feedback = Column(Text)
    missed_red_flags = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class Booking(Base):
    __tablename__ = "bookings"
    booking_id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="CASCADE"))
    resource_type = Column(String, ForeignKey("resources.resource_type"))
    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    allotted_time = Column(DateTime, default=datetime.utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)


class UserVitals(Base):
    __tablename__ = "user_vitals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    heart_rate = Column(Integer, nullable=True)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    spo2 = Column(Integer, nullable=True)
    temperature = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class VisualAnalysis(Base):
    __tablename__ = "visual_analysis"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="CASCADE"))
    image_path = Column(String)
    analysis_text = Column(Text)
    severity = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="CASCADE"))
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    medications = Column(JSON)
    pdf_path = Column(String, nullable=True)
    diagnosis = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    # === NEW: Source tracking ===
    is_auto_generated = Column(Boolean, default=False)  # True = Zero-Touch AI prescription
    approved_by_doctor = Column(Boolean, nullable=True)  # None=pending, True=approved, False=rejected
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# === NEW MODELS FOR TELEGRAM + AUTOMATION INTEGRATION ===
# ============================================================

class TelegramSession(Base):
    """
    Tracks active Telegram bot conversation state per user.
    This allows n8n to maintain stateful conversations without
    all context living inside n8n itself.
    """
    __tablename__ = "telegram_sessions"
    id = Column(Integer, primary_key=True, index=True)
    telegram_chat_id = Column(String, nullable=False, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    active_call_id = Column(Integer, ForeignKey("calls.call_id", ondelete="SET NULL"), nullable=True)
    # Conversation state machine: idle | triage | awaiting_voice | awaiting_doctor | completed
    state = Column(String, default="idle")
    context_json = Column(JSON, nullable=True)   # stores last AI context (diagnosis, risk, etc.)
    last_interaction = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppointmentSlot(Base):
    """
    Tracks appointment slots for Google Calendar integration.
    n8n writes to this when a patient books via Telegram.
    """
    __tablename__ = "appointment_slots"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    slot_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=15)
    google_event_id = Column(String, nullable=True)   # Google Calendar event ID for deletion/rescheduling
    status = Column(String, default="confirmed")      # confirmed | rescheduled | cancelled
    notes = Column(Text, nullable=True)
    reminder_sent = Column(Boolean, default=False)    # True once 24h Telegram reminder is fired
    created_at = Column(DateTime, default=datetime.utcnow)


class AftercarePing(Base):
    """
    Tracks the day-3 aftercare follow-up for each prescription.
    n8n's daily cron queries this to find pending pings.
    """
    __tablename__ = "aftercare_pings"
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ping_due_date = Column(DateTime, nullable=False)          # prescription.created_at + 3 days
    ping_sent = Column(Boolean, default=False)                # True once Telegram message is sent
    ping_sent_at = Column(DateTime, nullable=True)
    patient_response = Column(String, nullable=True)          # "yes_better" | "no_still_sick"
    responded_at = Column(DateTime, nullable=True)
    doctor_flagged = Column(Boolean, default=False)           # True if patient said No
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulatedPatient(Base):
    """
    Medical cases for training interns.
    """
    __tablename__ = "simulated_patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    case_title = Column(String, nullable=False)
    secret_diagnosis = Column(String, nullable=False)
    initial_complaint = Column(Text, nullable=False)
    secondary_symptoms = Column(JSON, nullable=True)   # Symptoms revealed only if specifically asked
    personality_traits = Column(String, nullable=True) # e.g., "Anxious", "Breathless"
    difficulty = Column(String, default="Beginner")   # Beginner | Intermediate | Advanced
    created_at = Column(DateTime, default=datetime.utcnow)


class TrainingSession(Base):
    """
    An active or completed training session between an intern and a simulated patient.
    """
    __tablename__ = "training_sessions"
    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sim_patient_id = Column(Integer, ForeignKey("simulated_patients.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="active")   # active | completed
    transcript = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    missed_red_flags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
