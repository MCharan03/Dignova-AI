import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv
from pydantic import EmailStr
from typing import List, Any, Optional
import asyncio
import socket

load_dotenv()

# --- SMTP Configuration (Optimized for Gmail + Render) ---
# Pro-Tip: If Port 587 is blocked on Render, use Port 465 with MAIL_SSL_TLS=True
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_SSL_TLS = os.getenv("MAIL_USE_SSL", "False").lower() == "true"
MAIL_STARTTLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"

# Simulation / Dry Run Mode
SIMULATE_EMAIL = os.getenv("SIMULATE_EMAIL", "False").lower() == "true"

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Dignova AI"),
    MAIL_STARTTLS=MAIL_STARTTLS,
    MAIL_SSL_TLS=MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TIMEOUT=30
)

fastmail = FastMail(conf)

# ─── HTML Template Helpers ─────────────────────────────────────────────────── #

def _wrap_email(title: str, body_html: str) -> str:
    """Wraps body content in Dignova's branded email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0A0F1E; color: #E2E8F0; }}
    .shell {{ max-width: 620px; margin: 40px auto; background: #0F1729; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 40px rgba(0,212,255,0.12); }}
    .header {{ background: linear-gradient(135deg, #0D6EFD 0%, #00D4FF 100%); padding: 32px 36px 28px; }}
    .header h1 {{ font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }}
    .header p  {{ font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; }}
    .body      {{ padding: 36px; }}
    .greeting  {{ font-size: 20px; font-weight: 700; color: #F1F5F9; margin-bottom: 16px; }}
    .text      {{ font-size: 15px; line-height: 1.7; color: #94A3B8; margin-bottom: 14px; }}
    .btn       {{ display: inline-block; margin-top: 10px; padding: 14px 32px; background: linear-gradient(135deg,#0D6EFD,#00D4FF); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }}
    .info-box  {{ background: #1A2744; border-left: 4px solid #0D6EFD; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }}
    .info-box p{{ font-size: 14px; color: #CBD5E1; margin-bottom: 8px; }}
    .info-box .label {{ font-weight: 700; color: #7DD3FC; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
    .badge     {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }}
    .badge-blue{{ background: rgba(13,110,253,0.2); color: #60A5FA; border: 1px solid rgba(13,110,253,0.4); }}
    .badge-green{{ background: rgba(34,197,94,0.2); color: #4ADE80; border: 1px solid rgba(34,197,94,0.4); }}
    .divider   {{ border: none; border-top: 1px solid #1E2D4A; margin: 24px 0; }}
    .footer    {{ background: #060B16; padding: 20px 36px; text-align: center; font-size: 12px; color: #475569; }}
    .footer a  {{ color: #7DD3FC; text-decoration: none; }}
    table.rx   {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
    table.rx th{{ background: #0D6EFD; color: #fff; font-size: 12px; padding: 10px 12px; text-align: left; }}
    table.rx td{{ font-size: 13px; padding: 10px 12px; color: #CBD5E1; border-bottom: 1px solid #1E2D4A; }}
    table.rx tr:nth-child(even) td {{ background: #131F38; }}
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <h1>Dignova AI</h1>
      <p>Autonomous Healthcare Intelligence</p>
    </div>
    <div class="body">
      {body_html}
    </div>
    <div class="footer">
      <p>© 2026 Dignova AI &nbsp;*&nbsp; <a href="https://dignova.ai">dignova.ai</a> &nbsp;*&nbsp; Emergency: 1800-DIGNOVA</p>
      <p style="margin-top:6px;">This email was sent by Dignova AI. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>"""


def build_welcome_email(user_name: str, verify_url: str, role: str = "user") -> str:
    role_badge = "Doctor" if role == "doctor" else "Patient"
    badge_class = "badge-blue" if role == "doctor" else "badge-green"
    body = f"""
      <p class="greeting">Welcome, {user_name}! 👋</p>
      <p class="text">Your <strong>Dignova AI</strong> account has been created.
      You're now part of the future of healthcare - where AI meets compassion.</p>

      <div class="info-box">
        <p class="label">Your Role</p>
        <p><span class="badge {badge_class}">{role_badge}</span></p>
      </div>

      <p class="text">To activate your account and start using Dignova AI, please verify your email address:</p>
      <a href="{verify_url}" class="btn">[OK] Verify My Email</a>

      <hr class="divider">
      <p class="text" style="font-size:13px;">
        [AGENT] <strong>What can you do?</strong><br>
        Chat with our AI triage assistant 24/7 * Get instant prescriptions for minor issues *
        Connect with doctors in seconds * Track your health over time.
      </p>
      <p class="text" style="font-size:12px;color:#475569;">This link expires in 1 hour. If you didn't create this account, ignore this email.</p>
    """
    return _wrap_email("Welcome to Dignova AI", body)


def build_diagnosis_receipt_email(
    patient_name: str,
    diagnosis: str,
    medications: list,
    doctor_name: str,
    pdf_url: str,
    call_id: int,
    is_auto: bool = False
) -> str:
    meds_rows = "".join(
        f"<tr><td>{i}</td><td><strong>{m.get('name','-')}</strong></td><td>{m.get('dosage','-')}</td>"
        f"<td>{m.get('frequency','As directed')}</td><td>{m.get('duration','-')}</td></tr>"
        for i, m in enumerate(medications, 1)
    )

    source = "[AGENT] <strong>AI Auto-Prescription</strong> (Zero-Touch)" if is_auto else f"👨‍⚕️ <strong>Dr. {doctor_name}</strong>"
    body = f"""
      <p class="greeting">Your Diagnosis & Prescription</p>
      <p class="text">Hi <strong>{patient_name}</strong>, your consultation is complete.
      Here's your diagnosis summary and prescription.</p>

      <div class="info-box">
        <p class="label">Diagnosis</p>
        <p style="font-size:16px;font-weight:700;color:#F1F5F9;">{diagnosis}</p>
        <p class="label" style="margin-top:10px;">Prescribed By</p>
        <p>{source}</p>
        <p class="label" style="margin-top:10px;">Reference</p>
        <p style="color:#7DD3FC;">Consultation #{call_id}</p>
      </div>

      <p class="text"><strong>Prescribed Medications:</strong></p>
      <table class="rx">
        <tr><th>#</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
        {meds_rows}
      </table>

      <a href="{pdf_url}" class="btn" style="margin-top:20px;">📄 Download PDF Prescription</a>

      <hr class="divider">
      <p class="text" style="font-size:12px;color:#475569;">
        [WARN] This prescription is AI-assisted and stored securely in Dignova AI.
        Always consult your doctor if symptoms worsen or do not improve within the prescribed duration.
      </p>
    """
    return _wrap_email("Your Dignova AI Prescription", body)


def build_appointment_reminder_email(
    patient_name: str,
    slot_time: str,
    doctor_name: str,
    appointment_id: int
) -> str:
    body = f"""
      <p class="greeting">Appointment Reminder 📅</p>
      <p class="text">Hi <strong>{patient_name}</strong>, this is a reminder for your upcoming appointment at Dignova AI.</p>

      <div class="info-box">
        <p class="label">Doctor</p>
        <p style="font-size:15px;font-weight:700;color:#F1F5F9;">Dr. {doctor_name}</p>
        <p class="label" style="margin-top:10px;">Date & Time</p>
        <p style="font-size:15px;font-weight:700;color:#00D4FF;">{slot_time}</p>
        <p class="label" style="margin-top:10px;">Appointment ID</p>
        <p style="color:#7DD3FC;">#{appointment_id}</p>
      </div>

      <p class="text">You can also manage your appointment directly from your Telegram bot.</p>

      <hr class="divider">
      <p class="text" style="font-size:12px;color:#475569;">
        If you need to reschedule, please do so at least 2 hours in advance.
        Need help? Contact us via the Telegram bot or call 1800-DIGNOVA.
      </p>
    """
    return _wrap_email("Your Dignova AI Appointment", body)


# ─── Pro Async Email Dispatcher ────────────────────────────────────────────── #

def _has_mx_record(email: str) -> bool:
    """Check if the email domain has a valid MX record. Drops fake domains silently."""
    try:
        domain = email.split("@")[1]
        socket.getaddrinfo(domain, None)
        return True
    except Exception:
        return False

async def send_email_async(to: str, subject: str, body: str, html: str = None):
    """
    Async SMTP or Resend API dispatcher with deep diagnostics and simulation support.
    """
    recipients = [to]
    content = html or body

    # Layer 2: MX record check - drop emails to non-existent domains before hitting SMTP
    if not _has_mx_record(to):
        print(f"[EMAIL DROP] No MX record for domain in {to} - skipping send.")
        return False

    if SIMULATE_EMAIL:
        print(f"[SIMULATE] EMAIL SIMULATION: Email would be sent to {recipients}")
        print(f"Subject: {subject}")
        print(f"Body Preview: {content[:100]}...")
        return True

    # 1. Try Resend HTTP API if key is present (Render Free tier friendly)
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        try:
            print(f"[RESEND] ATTEMPT: Sending to {to} via Resend HTTP API...")
            import resend
            resend.api_key = resend_key
            
            mail_from = os.getenv("MAIL_FROM") or "onboarding@resend.dev"
            mail_from_name = os.getenv("MAIL_FROM_NAME") or "Dignova AI"
            formatted_from = f"{mail_from_name} <{mail_from}>" if mail_from_name else mail_from
            
            params = {
                "from": formatted_from,
                "to": recipients,
                "subject": subject,
                "html": html or body
            }
            # Run the blocking Resend HTTP call in a background threadpool so it doesn't block the FastAPI event loop
            await asyncio.to_thread(resend.Emails.send, params)
            print(f"[OK] RESEND SUCCESS: Email dispatched.")
            return True
        except Exception as re_err:
            print(f"[WARN] RESEND FAILURE: {re_err}")
            print("[INFO] Falling back to SMTP...")

    # 2. SMTP Fallback
    try:
        print(f"[SMTP] ATTEMPT: Sending to {recipients} via {conf.MAIL_SERVER}:{conf.MAIL_PORT}...")
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=content,
            subtype=MessageType.html if html else MessageType.plain
        )
        await fastmail.send_message(message)
        print(f"[OK] SMTP SUCCESS: Email dispatched.")
        return True
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] SMTP CRITICAL FAILURE: {error_msg}")
        
        # Diagnostic help
        if "AuthenticationFailed" in error_msg or "535" in error_msg:
            print("[PRO-TIP] GMAIL REJECTED PASSWORD. Check for: 1. Use 16-char App Password (2FA), 2. Remove quotes from password.")
        elif "connection" in error_msg.lower() or "timeout" in error_msg.lower() or "10060" in error_msg:
            print(f"[PRO-TIP] RENDER PORT {conf.MAIL_PORT} BLOCK. Render blocks 587. TRY PORT 465 + MAIL_USE_SSL=True.")
        return False


def send_email(to: str, subject: str, body: str, html: str = None):
    """
    Standard wrapper for sending emails from any thread.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If in a thread (AnyIO worker), schedule on the main loop
            asyncio.run_coroutine_threadsafe(send_email_async(to, subject, body, html), loop)
        else:
            asyncio.run(send_email_async(to, subject, body, html))
    except RuntimeError:
        # No loop in this thread, try run (standard)
        asyncio.run(send_email_async(to, subject, body, html))
    except Exception as e:
        print(f"[WARN] Email Dispatch Error: {e}")

    return True

def send_welcome_email(to: str, user_name: str, verify_url: str, role: str = "user"):
    """Sends the branded welcome + email verification email."""
    html = build_welcome_email(user_name, verify_url, role)
    return send_email(
        to=to,
        subject=f"Welcome to Dignova AI, {user_name}! Please verify your email",
        body=f"Welcome {user_name}! Verify your email: {verify_url}",
        html=html
    )

def send_diagnosis_receipt(to: str, patient_name: str, diagnosis: str, medications: list, doctor_name: str, pdf_url: str, call_id: int, is_auto: bool = False):
    html = build_diagnosis_receipt_email(patient_name, diagnosis, medications, doctor_name, pdf_url, call_id, is_auto)
    return send_email(to=to, subject=f"Your Dignova AI Prescription - Ref #{call_id}", body=f"Your prescription is ready. Download it at: {pdf_url}", html=html)

def send_appointment_reminder(to: str, patient_name: str, slot_time: str, doctor_name: str, appointment_id: int):
    """Sends a 24-hour appointment reminder email."""
    html = build_appointment_reminder_email(patient_name, slot_time, doctor_name, appointment_id)
    return send_email(
        to=to,
        subject=f"Reminder: Your Dignova AI Appointment Tomorrow",
        body=f"Appointment reminder for {patient_name} with Dr. {doctor_name} at {slot_time}",
        html=html
    )
