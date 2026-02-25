import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple

import jwt
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))
# When "Remember me" is checked: longer-lived tokens (default 30 days access, 90 days refresh)
REMEMBER_ME_ACCESS_TOKEN_DAYS = int(os.getenv("REMEMBER_ME_ACCESS_TOKEN_DAYS", "30"))
REMEMBER_ME_REFRESH_TOKEN_DAYS = int(os.getenv("REMEMBER_ME_REFRESH_TOKEN_DAYS", "90"))

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_jwt(
    subject: str, expires_delta: timedelta, extra: Optional[dict] = None
) -> Tuple[str, str]:
    jti = str(uuid.uuid4())
    now = datetime.utcnow()
    to_encode = {"sub": subject, "iat": now, "jti": jti}
    if extra:
        to_encode.update(extra)
    expire = now + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, jti


def create_access_token(
    subject: str, role: Optional[str] = None, remember_me: bool = False
) -> Tuple[str, str]:
    extra = {"role": role} if role else {}
    if remember_me:
        expires = timedelta(days=REMEMBER_ME_ACCESS_TOKEN_DAYS)
    else:
        expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_jwt(subject, expires, extra)


def create_refresh_token(subject: str, remember_me: bool = False) -> Tuple[str, str]:
    days = REMEMBER_ME_REFRESH_TOKEN_DAYS if remember_me else REFRESH_TOKEN_EXPIRE_DAYS
    return create_jwt(subject, timedelta(days=days), None)
