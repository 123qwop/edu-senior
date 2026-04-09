"""Study set access checks (public catalog vs private vs assignments)."""

from __future__ import annotations

from sqlalchemy import and_, or_, text
from sqlalchemy.orm import Session

from app.auth.models import User
from app.study_sets import models


def enrolled_class_ids(db: Session, user_id: int) -> list[int]:
    r = db.execute(
        text("SELECT class_id FROM public.enrollment WHERE user_id = :uid"),
        {"uid": user_id},
    )
    return [row[0] for row in r]


def teacher_class_ids(db: Session, user_id: int) -> list[int]:
    rows = db.query(models.Class.class_id).filter(models.Class.teacher_id == user_id).all()
    return [row[0] for row in rows]


def student_legacy_assignment_exists(db: Session, user_id: int, set_id: int) -> bool:
    direct = (
        db.query(models.StudySetAssignment)
        .join(models.StudySetStudentAssignment)
        .filter(
            and_(
                models.StudySetAssignment.set_id == set_id,
                models.StudySetStudentAssignment.user_id == user_id,
            )
        )
        .first()
        is not None
    )
    if direct:
        return True
    enrolled = enrolled_class_ids(db, user_id)
    if not enrolled:
        return False
    return (
        db.query(models.StudySetAssignment)
        .filter(
            and_(
                models.StudySetAssignment.set_id == set_id,
                models.StudySetAssignment.class_id.in_(enrolled),
            )
        )
        .first()
        is not None
    )


def can_view_study_set(db: Session, user: User, study_set: models.StudySet) -> bool:
    if study_set.creator_id == user.user_id:
        return True

    role_name = (user.role.name or "").lower() if user.role else ""

    if study_set.is_public:
        return True

    if role_name == "student":
        return student_legacy_assignment_exists(db, user.user_id, study_set.set_id)

    if role_name == "teacher":
        if study_set.is_shared and study_set.creator_id != user.user_id:
            return True
        return False

    if role_name == "admin":
        return True

    return False


def build_student_list_conditions(db: Session, user_id: int) -> list:
    enrolled = enrolled_class_ids(db, user_id)
    conds = [
        models.StudySet.creator_id == user_id,
        models.StudySet.is_public == True,  # noqa: E712
    ]
    conds.append(
        models.StudySet.set_id.in_(
            db.query(models.StudySetAssignment.set_id)
            .join(models.StudySetStudentAssignment)
            .filter(models.StudySetStudentAssignment.user_id == user_id)
        )
    )
    if enrolled:
        conds.append(
            models.StudySet.set_id.in_(
                db.query(models.StudySetAssignment.set_id).filter(
                    models.StudySetAssignment.class_id.in_(enrolled)
                )
            )
        )
    return conds


def build_teacher_list_conditions(db: Session, user_id: int) -> list:
    return [
        models.StudySet.creator_id == user_id,
        models.StudySet.is_public == True,  # noqa: E712
        and_(models.StudySet.is_shared == True, models.StudySet.creator_id != user_id),  # noqa: E712
    ]


def effective_practice_feedback_mode(db: Session, user: User, study_set: models.StudySet) -> str:
    """
    immediate: check answers & see correct option during practice (personal / public default).
    end_only: stricter — feedback mainly after submitting the session (teacher-assigned default).
    """
    role_name = (user.role.name or "").lower() if user.role else ""
    if role_name != "student":
        return "immediate"
    if study_set.creator_id == user.user_id:
        return "immediate"
    if study_set.is_public:
        return "immediate"

    modes: list[str] = []

    direct_rows = (
        db.query(models.StudySetAssignment)
        .join(models.StudySetStudentAssignment)
        .filter(
            and_(
                models.StudySetAssignment.set_id == study_set.set_id,
                models.StudySetStudentAssignment.user_id == user.user_id,
            )
        )
        .all()
    )
    for row in direct_rows:
        modes.append(getattr(row, "practice_feedback_mode", None) or "end_only")

    enrolled = enrolled_class_ids(db, user.user_id)
    if enrolled:
        class_rows = (
            db.query(models.StudySetAssignment)
            .filter(
                and_(
                    models.StudySetAssignment.set_id == study_set.set_id,
                    models.StudySetAssignment.class_id.in_(enrolled),
                )
            )
            .all()
        )
        for row in class_rows:
            modes.append(getattr(row, "practice_feedback_mode", None) or "end_only")

    if not modes:
        return "immediate"

    if "end_only" in modes:
        return "end_only"
    return "immediate"
