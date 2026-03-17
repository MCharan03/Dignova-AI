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

# --- Rate Limiting (In-memory mock for now) ---
_login_attempts = defaultdict(list)
_LOCKOUT_THRESHOLD = 5
_LOCKOUT_DURATION = 900  # 15 minutes

def check_rate_limit(email):
    now = time.time()
    _login_attempts[email] = [ts for ts in _login_attempts[email] if now - ts < _LOCKOUT_DURATION]
    if len(_login_attempts[email]) >= _LOCKOUT_THRESHOLD:
        oldest = _login_attempts[email][0]
        remaining = int(_LOCKOUT_DURATION - (now - oldest))
        return True, remaining
    return False, 0

def record_failed_attempt(email):
    _login_attempts[email].append(time.time())

def clear_login_attempts(email):
    _login_attempts.pop(email, None)
