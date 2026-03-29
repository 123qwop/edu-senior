import os
import secrets
from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth import auth_utils, deps, models, schemas
from app.database.database import get_db
from app.study_sets import models as study_models

router = APIRouter()

# Frontend URL for OAuth redirects (no trailing slash)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


def _cookie_options():
    """Use cookie options that work on localhost (Lax, not Secure) and production (None, Secure)."""
    is_localhost = "localhost" in FRONTEND_URL or "localhost" in BACKEND_URL or "127.0.0.1" in FRONTEND_URL or "127.0.0.1" in BACKEND_URL
    if is_localhost:
        return {"samesite": "lax", "secure": False}
    return {"samesite": "none", "secure": True}


def _set_auth_cookies(response: JSONResponse, access_token: str, refresh_token: str, remember_me: bool) -> JSONResponse:
    """Set httpOnly auth cookies (options depend on localhost vs production)."""
    opts = _cookie_options()
    if remember_me:
        max_age_access = auth_utils.REMEMBER_ME_ACCESS_TOKEN_DAYS * 24 * 3600
        max_age_refresh = auth_utils.REMEMBER_ME_REFRESH_TOKEN_DAYS * 24 * 3600
    else:
        max_age_access = auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        max_age_refresh = auth_utils.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=max_age_access,
        path="/",
        **opts,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=max_age_refresh,
        path="/",
        **opts,
    )
    return response


# user registration
@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Ensure role has a default value
    role_name = payload.role if payload.role else "student"
    if role_name.lower() == "admin":
        raise HTTPException(status_code=400, detail="Cannot register as admin")

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
    
    remember_me = False
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email")
            password = body.get("password")
            remember_me = bool(body.get("remember_me", False))
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
        user.email, role=user.role.name if user.role else None, remember_me=remember_me
    )
    refresh_token, refresh_jti = auth_utils.create_refresh_token(
        user.email, remember_me=remember_me
    )

    response = JSONResponse(
        content={
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token,
        }
    )
    return _set_auth_cookies(response, access_token, refresh_token, remember_me)


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


@router.delete("/me")
def delete_me(
    current_user=Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the current user's account and associated data.
    Works for both teachers and students.
    """
    uid = current_user.user_id
    try:
        # 1. Study set progress and student assignments (user as student)
        db.query(study_models.StudySetProgress).filter(study_models.StudySetProgress.user_id == uid).delete(synchronize_session=False)
        db.query(study_models.StudySetStudentAssignment).filter(study_models.StudySetStudentAssignment.user_id == uid).delete(synchronize_session=False)
        db.query(study_models.StudySetOffline).filter(study_models.StudySetOffline.user_id == uid).delete(synchronize_session=False)

        # 2. If teacher: delete assignments that reference their classes, then classes, then teacher row
        teacher_classes = db.query(study_models.Class.class_id).filter(study_models.Class.teacher_id == uid).all()
        if teacher_classes:
            class_ids = [r[0] for r in teacher_classes]
            db.query(study_models.StudySetAssignment).filter(study_models.StudySetAssignment.class_id.in_(class_ids)).delete(synchronize_session=False)
            db.query(study_models.Class).filter(study_models.Class.teacher_id == uid).delete(synchronize_session=False)
            db.execute(text("DELETE FROM public.teacher WHERE teacher_id = :uid"), {"uid": uid})

        # 3. Assignments created by this user (assigned_by)
        db.query(study_models.StudySetAssignment).filter(study_models.StudySetAssignment.assigned_by == uid).delete(synchronize_session=False)

        # 4. Study sets created by this user (cascade will remove questions, tags, progress for those sets)
        db.query(study_models.StudySet).filter(study_models.StudySet.creator_id == uid).delete(synchronize_session=False)

        # 5. Enrollment - remove user from all classes
        db.execute(text("DELETE FROM public.enrollment WHERE user_id = :uid"), {"uid": uid})

        # 6. User
        db.query(models.User).filter(models.User.user_id == uid).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        import logging
        logging.getLogger(__name__).exception("Account deletion failed")
        raise HTTPException(status_code=500, detail="Failed to delete account")
    return {"msg": "Account deleted successfully"}


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

    user.password_hash = auth_utils.get_password_hash(payload.new_password)
    db.commit()
    return {"msg": "Password updated successfully"}


# ----- OAuth (Google / GitHub) -----

def _oauth_get_or_create_user(db: Session, email: str, name: str, role_name: str = "student") -> models.User:
    """Get existing user by email or create one (OAuth users get a random password hash)."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user
    role_obj = db.query(models.Role).filter(models.Role.name == role_name).first()
    if not role_obj:
        role_obj = models.Role(name=role_name)
        db.add(role_obj)
        db.commit()
        db.refresh(role_obj)
    user = models.User(
        email=email,
        password_hash=auth_utils.get_password_hash(secrets.token_urlsafe(32)),
        name=name or email.split("@")[0],
        role=role_obj,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _oauth_success_redirect(access_token: str, refresh_token: str) -> RedirectResponse:
    """Build redirect to frontend with auth cookies set (works on localhost and production)."""
    response = RedirectResponse(url=f"{FRONTEND_URL}/dashboard", status_code=302)
    opts = _cookie_options()
    max_a = auth_utils.REMEMBER_ME_ACCESS_TOKEN_DAYS * 24 * 3600
    max_r = auth_utils.REMEMBER_ME_REFRESH_TOKEN_DAYS * 24 * 3600
    response.set_cookie("access_token", access_token, httponly=True, max_age=max_a, path="/", **opts)
    response.set_cookie("refresh_token", refresh_token, httponly=True, max_age=max_r, path="/", **opts)
    return response


def _oauth_error_redirect() -> RedirectResponse:
    """Redirect to frontend login with error (do not leak tokens)."""
    return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_failed", status_code=302)


def _redirect_signup_error(error: str) -> RedirectResponse:
    """Redirect to frontend signup with an error param."""
    return RedirectResponse(url=f"{FRONTEND_URL}/signup?error={error}", status_code=302)


def _redirect_login_error(error: str) -> RedirectResponse:
    """Redirect to frontend login with an error param."""
    return RedirectResponse(url=f"{FRONTEND_URL}/login?error={error}", status_code=302)


def _oauth_parse_state(state: str | None) -> tuple[str, str]:
    """
    Parse OAuth state as 'flow:role' or 'flow'.
    Returns (flow, role) where flow is 'signup' or 'login', role is 'student' or 'teacher'.
    """
    if not state or not state.strip():
        return "login", "student"
    s = state.strip().lower()
    if ":" in s:
        flow, role = s.split(":", 1)
        flow, role = flow.strip(), role.strip()
        if flow == "signup" and role in ("student", "teacher"):
            return "signup", role
        if flow == "login":
            return "login", "student"
    if s in ("student", "teacher"):
        return "signup", s
    if s == "login":
        return "login", "student"
    return "login", "student"


@router.get("/google/start")
async def google_start(request: Request):
    """
    Redirect to Google OAuth. Query params:
    - flow=signup|login (required): sign-up vs login intent.
    - role=student|teacher (for flow=signup): role for new account.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_failed", status_code=302)
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/google/callback"
    scope = "openid email profile"
    flow = (request.query_params.get("flow") or "login").strip().lower()
    role = (request.query_params.get("role") or "student").strip().lower()
    if flow not in ("signup", "login"):
        flow = "login"
    if role not in ("student", "teacher"):
        role = "student"
    state = f"{flow}:{role}" if flow == "signup" else "login"
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={state}"
    )
    return RedirectResponse(url=url, status_code=302)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Exchange code for tokens, get user info, create/update user, set cookies, redirect to frontend."""
    code = request.query_params.get("code")
    if not code:
        return _oauth_error_redirect()
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        return _oauth_error_redirect()
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/google/callback"
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token_external = token_data.get("access_token")
            if not access_token_external:
                return _oauth_error_redirect()
            user_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token_external}"},
            )
            user_res.raise_for_status()
            user_info = user_res.json()
    except Exception as e:
        # Log but do not leak details to user
        import logging
        logging.getLogger(__name__).exception("Google OAuth token/user request failed")
        return _oauth_error_redirect()
    email = user_info.get("email")
    name = (user_info.get("name") or "").strip() or user_info.get("email", "").split("@")[0]
    if not email:
        return _oauth_error_redirect()
    flow, role_name = _oauth_parse_state(request.query_params.get("state"))
    existing_user = db.query(models.User).filter(models.User.email == email).first()

    if flow == "signup":
        if existing_user:
            return _redirect_signup_error("account_exists")
        user = _oauth_get_or_create_user(db, email=email, name=name, role_name=role_name)
    else:
        if not existing_user:
            return _redirect_login_error("no_account")
        user = existing_user

    access_token, _ = auth_utils.create_access_token(
        user.email, role=user.role.name if user.role else None, remember_me=True
    )
    refresh_token, _ = auth_utils.create_refresh_token(user.email, remember_me=True)
    return _oauth_success_redirect(access_token, refresh_token)


@router.get("/github/start")
async def github_start(request: Request):
    """
    Redirect to GitHub OAuth. Query params:
    - flow=signup|login (required)
    - role=student|teacher (for flow=signup)
    """
    client_id = os.getenv("GITHUB_CLIENT_ID")
    if not client_id:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_failed", status_code=302)
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/github/callback"
    scope = "user:email read:user"
    flow = (request.query_params.get("flow") or "login").strip().lower()
    role = (request.query_params.get("role") or "student").strip().lower()
    if flow not in ("signup", "login"):
        flow = "login"
    if role not in ("student", "teacher"):
        role = "student"
    state = f"{flow}:{role}" if flow == "signup" else "login"
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&state={state}"
    )
    return RedirectResponse(url=url, status_code=302)


@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    """Exchange code for tokens, get user email/name, create/update user, set cookies, redirect to frontend."""
    code = request.query_params.get("code")
    if not code:
        return _oauth_error_redirect()
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        return _oauth_error_redirect()
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/auth/github/callback"
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token_external = token_data.get("access_token")
            if not access_token_external:
                return _oauth_error_redirect()
            user_res = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token_external}"},
            )
            user_res.raise_for_status()
            user_info = user_res.json()
            # GitHub may hide email; fetch from emails endpoint if needed
            email = user_info.get("email")
            if not email:
                emails_res = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token_external}"},
                )
                if emails_res.is_success:
                    for e in emails_res.json():
                        if e.get("primary") and e.get("email"):
                            email = e["email"]
                            break
                if not email and user_info.get("login"):
                    email = f"{user_info['login']}@users.noreply.github.com"
            name = (user_info.get("name") or "").strip() or (user_info.get("login") or email or "").split("@")[0]
    except Exception:
        import logging
        logging.getLogger(__name__).exception("GitHub OAuth token/user request failed")
        return _oauth_error_redirect()
    if not email:
        return _oauth_error_redirect()
    flow, role_name = _oauth_parse_state(request.query_params.get("state"))
    existing_user = db.query(models.User).filter(models.User.email == email).first()

    if flow == "signup":
        if existing_user:
            return _redirect_signup_error("account_exists")
        user = _oauth_get_or_create_user(db, email=email, name=name, role_name=role_name)
    else:
        if not existing_user:
            return _redirect_login_error("no_account")
        user = existing_user

    access_token, _ = auth_utils.create_access_token(
        user.email, role=user.role.name if user.role else None, remember_me=True
    )
    refresh_token, _ = auth_utils.create_refresh_token(user.email, remember_me=True)
    return _oauth_success_redirect(access_token, refresh_token)


@router.get("/logout")
async def logout():
    """Clear auth cookies and redirect to frontend login."""
    response = RedirectResponse(url=f"{FRONTEND_URL}/login", status_code=302)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response
