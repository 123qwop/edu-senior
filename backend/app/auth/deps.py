from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import jwt
from auth import SECRET_KEY, ALGORITHM
from models import User, RevokedToken
from schemas import TokenPayload
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
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
