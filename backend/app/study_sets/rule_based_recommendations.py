"""
Rule-based study set recommendations for students (no ML, no Gemini).

Uses StudySetProgress.mastery_percentage and subjects/levels only.
Added as a separate module so existing recommendation_service / dashboard routes stay unchanged.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional, Set

from sqlalchemy import and_, or_, text
from sqlalchemy.orm import Session, joinedload

from app.study_sets import models

# Ordered difficulty for comparisons (aligned with recommendation_service.py)
LEVEL_RANK = {
    "Beginner": 1,
    "Easy": 2,
    "Medium": 3,
    "Hard": 4,
    "Advanced": 5,
}


def _level_rank(level: Optional[str]) -> int:
    if not level or not str(level).strip():
        return LEVEL_RANK["Medium"]
    return LEVEL_RANK.get(level.strip(), LEVEL_RANK["Medium"])


def _student_accessible_set_ids(db: Session, user_id: int) -> Set[int]:
    """
    IDs of study sets a student may open — mirrors visibility in get_study_sets for students.
    """
    directly_assigned = (
        db.query(models.StudySetAssignment.set_id)
        .join(models.StudySetStudentAssignment)
        .filter(models.StudySetStudentAssignment.user_id == user_id)
    )
    enrollment_query = text("SELECT class_id FROM public.enrollment WHERE user_id = :user_id")
    enrolled_class_ids_result = db.execute(enrollment_query, {"user_id": user_id})
    enrolled_class_ids = [row[0] for row in enrolled_class_ids_result] if enrolled_class_ids_result else []

    conditions = [
        models.StudySet.creator_id == user_id,
        models.StudySet.is_public == True,  # noqa: E712
    ]
    conditions.append(
        models.StudySet.set_id.in_(
            db.query(models.StudySetAssignment.set_id)
            .join(models.StudySetStudentAssignment)
            .filter(models.StudySetStudentAssignment.user_id == user_id)
        )
    )
    if enrolled_class_ids:
        conditions.append(
            models.StudySet.set_id.in_(
                db.query(models.StudySetAssignment.set_id).filter(
                    models.StudySetAssignment.class_id.in_(enrolled_class_ids)
                )
            )
        )

    rows = db.query(models.StudySet.set_id).filter(or_(*conditions)).all()
    return {r[0] for r in rows if r[0] is not None}


def _recently_mastered_set_ids(db: Session, user_id: int, days: int = 7, min_mastery: Decimal = Decimal("85")) -> Set[int]:
    """Sets the student recently completed with high mastery — skip as 'next' picks."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(models.StudySetProgress.set_id)
        .filter(
            and_(
                models.StudySetProgress.user_id == user_id,
                models.StudySetProgress.mastery_percentage >= min_mastery,
                models.StudySetProgress.last_activity >= cutoff,
            )
        )
        .all()
    )
    return {r[0] for r in rows if r[0] is not None}


def build_rule_based_recommendations_list(user_id: int, db: Session, limit: int = 5) -> List[dict[str, Any]]:
    """
    Return a list of {id, title, subject, level, reason} for GET /study-sets/recommendations/me.
    Safe with empty DB / no progress — returns starter picks or empty list with caller handling.
    """
    accessible = _student_accessible_set_ids(db, user_id)
    if not accessible:
        return []

    excluded_recent = _recently_mastered_set_ids(db, user_id)

    progress_rows = (
        db.query(models.StudySetProgress)
        .options(joinedload(models.StudySetProgress.study_set))
        .filter(models.StudySetProgress.user_id == user_id)
        .order_by(models.StudySetProgress.last_activity.desc())
        .limit(25)
        .all()
    )

    # --- No practice history: starter sets (prefer lower difficulty) ---
    if not progress_rows:
        starters = db.query(models.StudySet).filter(models.StudySet.set_id.in_(accessible)).all()
        starters_sorted = sorted(starters, key=lambda s: (_level_rank(s.level), s.set_id))
        out: List[dict[str, Any]] = []
        for s in starters_sorted[:limit]:
            subj_label = (s.subject or "General").strip() or "General"
            out.append(
                {
                    "id": s.set_id,
                    "title": s.title or "Study set",
                    "subject": s.subject or "General",
                    "level": s.level or "Medium",
                    "reason": (
                        "Practice more sets to get personalized recommendations — "
                        f"start with this {subj_label} set to build your baseline."
                    ),
                }
            )
        return out

    # Anchor: most recent attempt
    anchor = progress_rows[0]
    anchor_set = anchor.study_set
    if not anchor_set:
        anchor_set = db.query(models.StudySet).filter(models.StudySet.set_id == anchor.set_id).first()
    if not anchor_set:
        return []

    acc = float(anchor.mastery_percentage or 0)
    subj = (anchor_set.subject or "").strip() or None
    cur_rank = _level_rank(anchor_set.level)

    # Weak subjects: other recent rows with low mastery (unique, stable order)
    weak_subjects: List[str] = []
    _seen_weak: Set[str] = set()
    for p in progress_rows[:10]:
        st = p.study_set
        if not st:
            continue
        if float(p.mastery_percentage or 0) < 60 and st.subject:
            w = st.subject.strip()
            if w and w not in _seen_weak:
                _seen_weak.add(w)
                weak_subjects.append(w)

    def pool_for_subject(subject_filter: Optional[str]) -> List[models.StudySet]:
        q = db.query(models.StudySet).filter(models.StudySet.set_id.in_(accessible))
        if subject_filter:
            q = q.filter(models.StudySet.subject == subject_filter)
        else:
            q = q.filter(or_(models.StudySet.subject.is_(None), models.StudySet.subject == ""))
        return [x for x in q.all() if x.set_id not in excluded_recent or x.set_id == anchor.set_id]

    candidates: List[models.StudySet] = []
    pool = pool_for_subject(subj) if subj else pool_for_subject(None)

    # Exclude anchor from "another set" unless pool is tiny
    other_pool = [s for s in pool if s.set_id != anchor.set_id]

    if acc < 60:
        # Same subject, same or easier level
        tier = [
            s
            for s in other_pool
            if _level_rank(s.level) <= cur_rank and s.set_id not in excluded_recent
        ]
        if not tier:
            tier = [s for s in other_pool if _level_rank(s.level) <= cur_rank]
        if not tier:
            tier = [s for s in pool if s.set_id != anchor.set_id]
        reason = (
            f"You scored about {acc:.0f}% on “{anchor_set.title}”. "
            f"Reinforce {subj or 'this topic'} with this set at the same or an easier level."
        )
    elif acc <= 80:
        # Same subject, similar level (±1 rank)
        lo, hi = max(1, cur_rank - 1), min(5, cur_rank + 1)
        tier = [
            s
            for s in other_pool
            if lo <= _level_rank(s.level) <= hi and s.set_id not in excluded_recent
        ]
        if not tier:
            tier = [s for s in other_pool if lo <= _level_rank(s.level) <= hi]
        if not tier:
            tier = [s for s in pool if s.set_id != anchor.set_id]
        reason = (
            f"You scored about {acc:.0f}% on “{anchor_set.title}”. "
            f"Solid progress — try another {subj or 'related'} set at a similar level."
        )
    else:
        # Above 80%: harder first in same subject
        tier = [
            s
            for s in other_pool
            if _level_rank(s.level) >= cur_rank + 1 and s.set_id not in excluded_recent
        ]
        if not tier:
            tier = [
                s
                for s in other_pool
                if _level_rank(s.level) >= cur_rank and s.set_id not in excluded_recent
            ]
        if not tier:
            tier = [s for s in other_pool]
        if not tier:
            tier = [s for s in pool if s.set_id != anchor.set_id]
        reason = (
            f"Strong result ({acc:.0f}% on “{anchor_set.title}”). "
            f"Level up with a more challenging {subj or 'subject'} set."
        )

    # Dedup by set_id, preserve order
    seen: Set[int] = set()
    for s in tier:
        if s.set_id in seen:
            continue
        if s.set_id not in accessible:
            continue
        seen.add(s.set_id)
        candidates.append(s)
        if len(candidates) >= limit:
            break

    # Add weak-subject picks if room
    for ws in weak_subjects:
        if len(candidates) >= limit:
            break
        if ws == subj:
            continue
        extra = (
            db.query(models.StudySet)
            .filter(
                and_(
                    models.StudySet.set_id.in_(accessible),
                    models.StudySet.subject == ws,
                    ~models.StudySet.set_id.in_(seen),
                )
            )
            .order_by(models.StudySet.created_at.asc())
            .limit(3)
            .all()
        )
        for s in extra:
            if s.set_id in excluded_recent:
                continue
            candidates.append(s)
            seen.add(s.set_id)
            if len(candidates) >= limit:
                break

    # Fallback: any accessible set in same subject not yet chosen
    if len(candidates) < limit and subj:
        more = (
            db.query(models.StudySet)
            .filter(
                and_(
                    models.StudySet.set_id.in_(accessible),
                    models.StudySet.subject == subj,
                    ~models.StudySet.set_id.in_(seen),
                )
            )
            .order_by(models.StudySet.updated_at.desc())
            .limit(limit)
            .all()
        )
        for s in more:
            if s.set_id in excluded_recent and len(more) > 1:
                continue
            candidates.append(s)
            seen.add(s.set_id)
            if len(candidates) >= limit:
                break

    # Fallback: general pool
    if not candidates:
        general = (
            db.query(models.StudySet)
            .filter(models.StudySet.set_id.in_(accessible))
            .order_by(models.StudySet.created_at.desc())
            .limit(limit)
            .all()
        )
        for s in general:
            if s.set_id in seen:
                continue
            candidates.append(s)
            seen.add(s.set_id)
            if len(candidates) >= limit:
                break

    # Build response with reasons (first item gets tier reason; others shorter)
    result: List[dict[str, Any]] = []
    for i, s in enumerate(candidates[:limit]):
        subj_label = s.subject or "General"
        lvl = s.level or "Medium"
        if i == 0:
            r = reason
        else:
            r = f"Another {subj_label} set to keep momentum — {lvl} level."
        result.append(
            {
                "id": s.set_id,
                "title": s.title or "Study set",
                "subject": subj_label,
                "level": lvl,
                "reason": r,
            }
        )

    return result
