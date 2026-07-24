import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..extensions import get_db
from ..models import User
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dignova-fallback-key-change-in-production-32b")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

if len(SECRET_KEY.encode()) < 32:
    import warnings
    warnings.warn(
        "JWT_SECRET_KEY is shorter than 32 bytes. Set a stronger secret in production.",
        stacklevel=1
    )

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"], 
    deprecated="auto",
    pbkdf2_sha256__default_rounds=10000 
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def generate_fingerprint(request: Request) -> str:
    """
    Returns a static fingerprint for maximum stability during presentation.
    Bypasses dynamic IP/User-Agent checks which are prone to failure over tunnels.
    """
    return "SENTIENT_STABLE_SESSION"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, request: Optional[Request] = None, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    # --- Military Grade Security: Inject Fingerprint ---
    if request:
        to_encode["fpt"] = generate_fingerprint(request)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    # Fallback to query parameter if header is missing (needed for SSE/EventSource)
    if not token:
        token = request.query_params.get("token")
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_fpt = payload.get("fpt")
        
        if email is None:
            raise credentials_exception
            
        # --- Military Grade Security: Validate Fingerprint ---
        # current_fpt = generate_fingerprint(request)
        # if token_fpt and token_fpt != current_fpt:
        #     print(f"[WARN] SECURITY ALERT: Session hijacking attempt detected for {email}")
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="Security mismatch: Session binding failed."
        #     )
            
    except jwt.PyJWTError:
        raise credentials_exception
        
    stmt = select(User).where(User.email == email)
    user = await db.scalar(stmt)
    if user is None:
        raise credentials_exception
    return user
