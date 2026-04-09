"""Create notifications + optional email + WebSocket push when a class assignment is created."""

import asyncio
import os
from datetime import datetime
from typing import List, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.models import User
from app.notifications import email_service
from app.notifications.models import Notification as NotificationModel
from app.notifications.ws_manager import manager as ws_manager
from app.study_sets import models as study_models


def _frontend_base() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


async def _push_ws_batch(items: List[Tuple[int, dict]]) -> None:
    if not items:
        return
    await asyncio.gather(*[ws_manager.send_json_to_user(uid, pl) for uid, pl in items])


def notify_students_new_assignment(
    db: Session,
    *,
    assignment_row: study_models.StudySetAssignment,
    study_set_title: str,
    teacher_user: User,
    class_name: str,
) -> None:
    """Notify all enrolled students in the class (in-app + email + WS)."""
    if not assignment_row.class_id:
        return

    class_id = assignment_row.class_id
    r = db.execute(
        text("SELECT user_id FROM public.enrollment WHERE class_id = :cid"),
        {"cid": class_id},
    )
    student_ids = [int(row[0]) for row in r.fetchall()]
    if not student_ids:
        return

    due_part = ""
    if assignment_row.due_date:
        due_part = f"\nDue: {assignment_row.due_date.strftime('%Y-%m-%d %H:%M UTC')}"
    limit_part = ""
    if assignment_row.time_limit_minutes:
        limit_part = f"\nTime limit for one session: {assignment_row.time_limit_minutes} minutes"

    title = f"New assignment: {study_set_title}"
    practice_url = f"{_frontend_base()}/dashboard/study-sets/{assignment_row.set_id}/practice"
    body = (
        f"Your teacher assigned a study set to {class_name}.\n"
        f"Set: {study_set_title}"
        f"{due_part}"
        f"{limit_part}\n"
        f"\nOpen the app to start: {practice_url}"
    )

    teacher_label = teacher_user.name or teacher_user.email

    ws_items: List[Tuple[int, dict]] = []

    for sid in student_ids:
        n = NotificationModel(
            user_id=sid,
            title=title,
            body=body,
            category="assignment_new",
            related_assignment_id=assignment_row.assignment_id,
            created_at=datetime.utcnow(),
        )
        db.add(n)
        db.flush()

        user = db.query(User).filter(User.user_id == sid).first()
        if user and user.email:
            email_service.send_email(
                user.email,
                subject=title,
                plain_body=(
                    f"Hello,\n\n{teacher_label} assigned a new study set to your class {class_name}.\n\n"
                    f"Set: {study_set_title}"
                    f"{due_part}"
                    f"{limit_part}\n\n"
                    f"Practice here: {practice_url}\n"
                ),
            )

        ws_items.append(
            (
                sid,
                {
                    "type": "notification",
                    "notification": {
                        "id": n.notification_id,
                        "title": n.title,
                        "body": n.body,
                        "category": n.category,
                        "created_at": n.created_at.isoformat() if n.created_at else None,
                        "read_at": None,
                    },
                },
            )
        )

    db.commit()

    try:
        asyncio.run(_push_ws_batch(ws_items))
    except Exception:
        pass
