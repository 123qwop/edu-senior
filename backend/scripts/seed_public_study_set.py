"""
Insert a public Quiz study set from JSON (Quadratic Equations by default).

Supports item types: multiple_choice (4 options), short_answer, flashcard (term + definition),
true_false (answer must be the string \"true\" or \"false\" for DB grading).

Usage (from repo `edu-senior/backend`, with DATABASE_URL set in .env or env):

  python -m scripts.seed_public_study_set
  python -m scripts.seed_public_study_set --json scripts/data/limits_calculus1_public.json

Optional:

  CREATOR_ID=14 python -m scripts.seed_public_study_set
  python -m scripts.seed_public_study_set --json path/to/custom.json
  python -m scripts.seed_public_study_set --dry-run

Notes:
- Sets creator_id (default 14) and is_public=True, is_shared=False.
- For multiple_choice, correct_answer must match the winning option text exactly
  (same as the API); progress grading compares option text to correct_answer.
- Explanations in JSON are not stored (no DB column); only question stem in content.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Run as: python -m scripts.seed_public_study_set from backend/
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.orm import Session  # noqa: E402

from app.auth import models as auth_models  # noqa: E402
from app.database.database import SessionLocal  # noqa: E402
from app.study_sets import models  # noqa: E402

DEFAULT_JSON = Path(__file__).resolve().parent / "data" / "quadratic_equations_public.json"
DEFAULT_CREATOR_ID = int(os.environ.get("CREATOR_ID", "14"))


def load_payload(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def seed(db: Session, payload: dict, creator_id: int, dry_run: bool) -> int:
    title = payload["title"]
    existing = (
        db.query(models.StudySet)
        .filter(
            models.StudySet.creator_id == creator_id,
            models.StudySet.title == title,
        )
        .first()
    )
    if existing:
        raise SystemExit(
            f"Abort: study set with title {title!r} already exists for creator_id={creator_id} (set_id={existing.set_id})."
        )

    study_set = models.StudySet(
        title=title[:200],
        subject=payload.get("subject"),
        type="Quiz",
        level=payload.get("level"),
        description=payload.get("description"),
        creator_id=creator_id,
        is_public=True,
        is_shared=False,
    )
    db.add(study_set)
    db.flush()

    for item in payload["items"]:
        raw_type = (item.get("type") or "").strip().lower()
        if raw_type in ("multiple_choice", "mcq"):
            qtype = "multiple_choice"
        elif raw_type in ("short_answer", "short answer"):
            qtype = "short_answer"
        elif raw_type in ("flashcard", "flash_card"):
            qtype = "flashcard"
        elif raw_type in ("true_false", "true/false", "tf"):
            qtype = "true_false"
        else:
            raise ValueError(f"Unsupported question type: {raw_type!r}")

        if qtype == "flashcard":
            term = str(item.get("term", "")).strip()
            definition = str(item.get("definition", "")).strip()
            if not term or not definition:
                raise ValueError("flashcard items require non-empty term and definition")
            question = models.Question(
                set_id=study_set.set_id,
                type="flashcard",
                content=term,
                correct_answer=definition,
            )
            db.add(question)
            db.flush()
            db.add(
                models.Flashcard(
                    question_id=question.question_id,
                    term=term,
                    definition=definition,
                )
            )
            continue

        if qtype == "true_false":
            ans_raw = str(item.get("answer", "")).strip().lower()
            if ans_raw in ("верно", "истина", "да", "т"):
                ans_raw = "true"
            if ans_raw in ("неверно", "ложь", "нет", "ф"):
                ans_raw = "false"
            if ans_raw not in ("true", "false"):
                raise ValueError(
                    f"true_false items need answer 'true' or 'false' (got {item.get('answer')!r})"
                )
            question = models.Question(
                set_id=study_set.set_id,
                type="true_false",
                content=str(item["question"]).strip(),
                correct_answer=ans_raw,
            )
            db.add(question)
            db.flush()
            db.add(
                models.QuestionOption(
                    question_id=question.question_id,
                    option_text="true",
                    option_order=1,
                )
            )
            db.add(
                models.QuestionOption(
                    question_id=question.question_id,
                    option_text="false",
                    option_order=2,
                )
            )
            continue

        if qtype == "multiple_choice":
            options = item.get("options") or []
            if len(options) != 4:
                raise ValueError("multiple_choice items must have exactly 4 options")
            answer = item["answer"].strip()
            if answer not in [o.strip() for o in options]:
                raise ValueError(f"Answer must match one option exactly: {item.get('question', '')[:60]}...")
            correct_answer = answer
        else:
            correct_answer = str(item["answer"]).strip()

        question = models.Question(
            set_id=study_set.set_id,
            type=qtype,
            content=str(item["question"]).strip(),
            correct_answer=correct_answer,
        )
        db.add(question)
        db.flush()

        if qtype == "multiple_choice":
            for idx, option_text in enumerate(item["options"], start=1):
                db.add(
                    models.QuestionOption(
                        question_id=question.question_id,
                        option_text=option_text,
                        option_order=idx,
                    )
                )

    if dry_run:
        db.rollback()
        print(f"[dry-run] Would create set {title!r} with {len(payload['items'])} questions for creator_id={creator_id}")
        return -1

    db.commit()
    db.refresh(study_set)
    return study_set.set_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed a public study set from JSON.")
    parser.add_argument(
        "--json",
        dest="json_path",
        type=Path,
        default=DEFAULT_JSON,
        help=f"Path to JSON (default: {DEFAULT_JSON})",
    )
    parser.add_argument("--creator-id", type=int, default=DEFAULT_CREATOR_ID, help=f"User.user_id (default: {DEFAULT_CREATOR_ID})")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.json_path.is_file():
        raise SystemExit(f"JSON file not found: {args.json_path}")

    payload = load_payload(args.json_path)
    db = SessionLocal()
    try:
        uid = args.creator_id
        user = db.query(auth_models.User).filter(auth_models.User.user_id == uid).first()
        if user is None:
            print(f"Warning: no User with user_id={uid} found. Foreign key insert may fail.", file=sys.stderr)

        set_id = seed(db, payload, creator_id=uid, dry_run=args.dry_run)
        if set_id > 0:
            print(f"Created public study set set_id={set_id} (creator_id={uid}, is_public=True).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
