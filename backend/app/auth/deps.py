from typing import Optional
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.auth_utils import ALGORITHM, SECRET_KEY
from app.auth.models import RevokedToken, User
from app.database.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_token_from_request(
    request: Request, token_from_header: Optional[str] = Depends(oauth2_scheme)
) -> Optional[str]:
    """Prefer httpOnly cookie, fall back to Authorization header."""
    return request.cookies.get("access_token") or token_from_header


def get_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        sub = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise credentials_exception

    if db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
        raise HTTPException(status_code=401, detail="Token revoked")

    user = db.query(User).filter(User.email == sub).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(role: str):
    def role_checker(user=Depends(get_current_user)):
        if user.role is None or user.role.name.lower() != role.lower():
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return role_checker
