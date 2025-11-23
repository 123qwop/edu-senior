from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import auth_utils, deps, models, schemas
from app.database.database import get_db

router = APIRouter()


# user registration
@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Ensure role has a default value
    role_name = payload.role if payload.role else "student"
    
    role_obj = db.query(models.Role).filter(models.Role.name == role_name).first()
    if not role_obj:
        role_obj = models.Role(name=role_name)
        db.add(role_obj)
        db.commit()
        db.refresh(role_obj)

    # create user
    user = models.User(
        email=payload.email,
        password_hash=auth_utils.get_password_hash(payload.password),
        name=payload.full_name,
        role=role_obj,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    response = {
        "id": user.user_id,  # map user.user_id -> id
        "email": user.email,
        "full_name": user.name,  # map name -> full_name
        "role": user.role.name,  # map Role object -> role name (string)
    }
    return response


@router.post("/login", response_model=schemas.Token)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    content_type = request.headers.get("content-type", "").lower()
    email = None
    password = None
    
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email")
            password = body.get("password")
        except Exception:
            pass
    else:
        try:
            form_data = await request.form()
            email = form_data.get("username") or form_data.get("email")
            password = form_data.get("password")
        except Exception:
            pass
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth_utils.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token, access_jti = auth_utils.create_access_token(
        user.email, role=user.role.name if user.role else None
    )
    refresh_token, refresh_jti = auth_utils.create_refresh_token(user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


# refresh token
@router.post("/refresh", response_model=schemas.Token)
def refresh(payload: schemas.RefreshIn, db: Session = Depends(get_db)):
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            auth_utils.SECRET_KEY,
            algorithms=[auth_utils.ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    jti = decoded.get("jti")
    sub = decoded.get("sub")

    if db.query(models.RevokedToken).filter(models.RevokedToken.jti == jti).first():
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user = db.query(models.User).filter(models.User.email == sub).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token, _ = auth_utils.create_access_token(
        user.email, role=user.role.name if user.role else None
    )
    refresh_token, _ = auth_utils.create_refresh_token(user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


@router.post("/revoke_refresh")
def revoke_refresh(payload: schemas.RefreshIn, db: Session = Depends(get_db)):
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            auth_utils.SECRET_KEY,
            algorithms=[auth_utils.ALGORITHM],
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    jti = decoded.get("jti")
    revoked = models.RevokedToken(jti=jti, revoked_at=datetime.utcnow())
    db.add(revoked)
    db.commit()
    return {"msg": "Refresh token revoked"}


@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user=Depends(deps.get_current_user)):
    return {
        "id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.name,
        "role": current_user.role.name if current_user.role else None,
    }


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being changed and if it's already taken
    if payload.email and payload.email != user.email:
        existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = payload.email
    
    if payload.full_name:
        user.name = payload.full_name
    
    if payload.password:
        user.password_hash = auth_utils.get_password_hash(payload.password)
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.user_id,
        "email": user.email,
        "full_name": user.name,
        "role": user.role.name if user.role else None,
    }


# password reset
@router.post("/password-reset/request")
def password_reset_request(
    payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return {"msg": "If that email exists, a reset link was sent."}

    token, jti = auth_utils.create_jwt(user.email, timedelta(minutes=30))

    # TODO: send token via email
    return {"msg": "Reset token generated (DEV mode)", "reset_token": token}


@router.post("/password-reset/confirm")
def password_reset_confirm(
    payload: schemas.PasswordResetConfirm, db: Session = Depends(get_db)
):
    try:
        decoded = jwt.decode(
            payload.token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")

    email = decoded.get("sub")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = auth_utils.get_password_hash(payload.new_password)
    db.add(user)
    db.commit()
    return {"msg": "Password updated successfully"}
