"""notifications table and optional time_limit_minutes on assignment

Revision ID: d4e5f6a7b8c0
Revises: c3d4e5f6a7b8
Create Date: 2026-03-29

Idempotent: safe if `notification` was already created by SQLAlchemy metadata, or if a
previous upgrade failed partway (adds missing column / table / index only).

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "d4e5f6a7b8c0"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # 1) Column may be missing if an earlier run failed after notification table existed
    cols = {c["name"] for c in insp.get_columns("study_set_assignment", schema="public")}
    if "time_limit_minutes" not in cols:
        op.add_column(
            "study_set_assignment",
            sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
            schema="public",
        )

    # 2) Table may already exist (e.g. from app startup create_all) — do not recreate
    tables = insp.get_table_names(schema="public")
    if "notification" not in tables:
        op.create_table(
            "notification",
            sa.Column("notification_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("public.User.user_id"), nullable=False),
            sa.Column("title", sa.String(length=500), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("category", sa.String(length=50), nullable=True),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column(
                "related_assignment_id",
                sa.Integer(),
                sa.ForeignKey("public.study_set_assignment.assignment_id", ondelete="SET NULL"),
                nullable=True,
            ),
            schema="public",
        )

    # 3) Index (may be missing if table was created outside Alembic)
    insp = inspect(bind)
    idx_names = {i["name"] for i in insp.get_indexes("notification", schema="public")}
    if "ix_notification_user_id" not in idx_names:
        op.create_index(
            "ix_notification_user_id",
            "notification",
            ["user_id"],
            schema="public",
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "ix_notification_user_id" in {i["name"] for i in insp.get_indexes("notification", schema="public")}:
        op.drop_index("ix_notification_user_id", table_name="notification", schema="public")
    if "notification" in insp.get_table_names(schema="public"):
        op.drop_table("notification", schema="public")
    cols = {c["name"] for c in insp.get_columns("study_set_assignment", schema="public")}
    if "time_limit_minutes" in cols:
        op.drop_column("study_set_assignment", "time_limit_minutes", schema="public")
