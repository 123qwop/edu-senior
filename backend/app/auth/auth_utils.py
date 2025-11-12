from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import jwt
import uuid

from typing import Optional, Tuple

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "replace-this")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_jwt(subject: str, expires_delta: timedelta, extra: Optional[dict] = None) -> Tuple[str, str]:
    jti = str(uuid.uuid4())
    now = datetime.utcnow()
    to_encode = {"sub": subject, "iat": now, "jti": jti}
    if extra:
        to_encode.update(extra)
    expire = now + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, jti

def create_access_token(subject: str, role: Optional[str] = None) -> Tuple[str, str]:
    extra = {"role": role} if role else {}
    return create_jwt(subject, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), extra)

def create_refresh_token(subject: str) -> Tuple[str, str]:
    return create_jwt(subject, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), None)
