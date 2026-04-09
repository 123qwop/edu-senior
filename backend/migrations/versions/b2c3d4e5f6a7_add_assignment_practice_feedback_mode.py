"""add practice_feedback_mode to study_set_assignment

Revision ID: b2c3d4e5f6a7
Revises: f7e8d9c0b1a2
Create Date: 2026-03-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "f7e8d9c0b1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "study_set_assignment",
        sa.Column(
            "practice_feedback_mode",
            sa.String(length=20),
            nullable=False,
            server_default="end_only",
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("study_set_assignment", "practice_feedback_mode", schema="public")
