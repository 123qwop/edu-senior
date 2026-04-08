"""
Admin-only API: user and study set moderation.
"""
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.admin import schemas
from app.auth.deps import require_admin
from app.auth.models import User, Role
from app.database.database import get_db
from app.study_sets import models as study_models

router = APIRouter()


ALLOWED_ROLES = frozenset({"student", "teacher", "admin"})


@router.get("/users", response_model=list[schemas.AdminUserOut])
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .options(joinedload(User.role))
        .order_by(User.user_id.asc())
        .all()
    )
    return [
        schemas.AdminUserOut(
            id=u.user_id,
            email=u.email,
            full_name=u.name,
            role=u.role.name if u.role else None,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/role", response_model=schemas.AdminUserOut)
def patch_user_role(
    user_id: int,
    body: schemas.AdminRolePatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    role_lower = body.role.strip().lower()
    if role_lower not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role. Use student, teacher, or admin.")

    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user = db.query(User).options(joinedload(User.role)).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_obj = db.query(Role).filter(func.lower(Role.name) == role_lower).first()
    if not role_obj:
        role_obj = Role(name=role_lower)
        db.add(role_obj)
        db.flush()

    user.role = role_obj
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Could not update role (database constraint).")

    return schemas.AdminUserOut(
        id=user.user_id,
        email=user.email,
        full_name=user.name,
        role=user.role.name if user.role else None,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        db.delete(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete user: related records exist (assignments, classes, etc.).",
        )
    return None


@router.get("/studysets", response_model=list[schemas.AdminStudySetOut])
def list_all_study_sets(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(study_models.StudySet, User)
        .join(User, study_models.StudySet.creator_id == User.user_id)
        .order_by(study_models.StudySet.set_id.desc())
        .all()
    )
    out = []
    for s, creator in rows:
        out.append(
            schemas.AdminStudySetOut(
                id=s.set_id,
                title=s.title,
                subject=s.subject,
                type=s.type,
                creator_id=creator.user_id,
                creator_name=creator.name,
                creator_email=creator.email,
            )
        )
    return out


@router.delete("/studysets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_study_set(
    set_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    study_set = db.query(study_models.StudySet).filter(study_models.StudySet.set_id == set_id).first()
    if not study_set:
        raise HTTPException(status_code=404, detail="Study set not found")
    try:
        db.delete(study_set)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete study set: related records exist.",
        )
    return None
