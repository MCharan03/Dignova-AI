from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import os
from dotenv import load_dotenv
from datetime import datetime
from collections import defaultdict
import time

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-fallback")

def _get_serializer():
    """Returns a URLSafeTimedSerializer using the app's SECRET_KEY."""
    return URLSafeTimedSerializer(SECRET_KEY)

def generate_verification_token(email):
    """Generate a timed token for email verification."""
    s = _get_serializer()
    return s.dumps(email, salt='email-verification')

def confirm_verification_token(token, max_age=3600):
    """
    Confirm an email verification token.
    Returns the email if valid, None if expired or invalid.
    max_age: token validity in seconds (default 1 hour).
    """
    s = _get_serializer()
    try:
        email = s.loads(token, salt='email-verification', max_age=max_age)
        return email
    except (SignatureExpired, BadSignature):
        return None

def generate_reset_token(email):
    """Generate a timed token for password reset."""
    s = _get_serializer()
    return s.dumps(email, salt='password-reset')

def confirm_reset_token(token, max_age=1800):
    """
    Confirm a password reset token.
    Returns the email if valid, None if expired or invalid.
    max_age: token validity in seconds (default 30 minutes).
    """
    s = _get_serializer()
    try:
        email = s.loads(token, salt='password-reset', max_age=max_age)
        return email
    except (SignatureExpired, BadSignature):
        return None

def generate_sync_token(user_id):
    """Generate a short-lived token for Telegram linking."""
    s = _get_serializer()
    return s.dumps(user_id, salt='telegram-sync')

def confirm_sync_token(token, max_age=300):
    """
    Confirm a telegram sync token. Valid for 5 minutes.
    Returns the user_id if valid.
    """
    s = _get_serializer()
    try:
        user_id = s.loads(token, salt='telegram-sync', max_age=max_age)
        return user_id
    except (SignatureExpired, BadSignature):
        return None

# --- Rate Limiting (DISABLED) ---
def check_rate_limit(email):
    # System bypassed per Sentient Core requirement
    return False, 0

def record_failed_attempt(email):
    pass

def clear_login_attempts(email):
    pass
