"""Align legacy notification table (message/sent_at) with ORM (title/body/...).

Revision ID: f1a2b3c4d5e6
Revises: d4e5f6a7b8c0

The initial schema used `message` and `sent_at`. Later code expects `title`, `body`,
`category`, `read_at`, `created_at`, `related_assignment_id`. Migration d4e5f6a7b8c0
only creates the new shape when the table is missing, so existing DBs kept the old
columns and inserts fail with "column title does not exist".
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "d4e5f6a7b8c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "notification" not in insp.get_table_names(schema="public"):
        return

    col_names = {c["name"] for c in insp.get_columns("notification", schema="public")}
    if "title" in col_names:
        return

    if "message" not in col_names:
        # Unexpected shape; avoid destructive changes
        return

    op.add_column("notification", sa.Column("title", sa.String(length=500), nullable=True), schema="public")
    op.add_column("notification", sa.Column("body", sa.Text(), nullable=True), schema="public")
    op.add_column("notification", sa.Column("category", sa.String(length=50), nullable=True), schema="public")
    op.add_column("notification", sa.Column("read_at", sa.DateTime(), nullable=True), schema="public")
    op.add_column("notification", sa.Column("created_at", sa.DateTime(), nullable=True), schema="public")
    op.add_column(
        "notification",
        sa.Column("related_assignment_id", sa.Integer(), nullable=True),
        schema="public",
    )

    op.execute(
        text("""
        UPDATE public.notification
        SET
          body = message,
          title = CASE
            WHEN LENGTH(BTRIM(message)) = 0 THEN 'Notification'
            ELSE LEFT(BTRIM(message), 500)
          END,
          created_at = COALESCE(sent_at, CURRENT_TIMESTAMP)
        """)
    )

    op.alter_column(
        "notification",
        "title",
        existing_type=sa.String(length=500),
        nullable=False,
        schema="public",
    )
    op.alter_column(
        "notification",
        "body",
        existing_type=sa.Text(),
        nullable=False,
        schema="public",
    )
    op.alter_column(
        "notification",
        "created_at",
        existing_type=sa.DateTime(),
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
        schema="public",
    )

    op.create_foreign_key(
        "notification_related_assignment_id_fkey",
        "notification",
        "study_set_assignment",
        ["related_assignment_id"],
        ["assignment_id"],
        source_schema="public",
        referent_schema="public",
        ondelete="SET NULL",
    )

    op.execute(text("ALTER TABLE public.notification DROP CONSTRAINT IF EXISTS notification_message_check"))

    op.drop_column("notification", "message", schema="public")
    op.drop_column("notification", "sent_at", schema="public")

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
    if "notification" not in insp.get_table_names(schema="public"):
        return
    col_names = {c["name"] for c in insp.get_columns("notification", schema="public")}
    if "message" in col_names or "title" not in col_names:
        return

    if "ix_notification_user_id" in {i["name"] for i in insp.get_indexes("notification", schema="public")}:
        op.drop_index("ix_notification_user_id", table_name="notification", schema="public")

    op.drop_constraint("notification_related_assignment_id_fkey", "notification", schema="public", type_="foreignkey")

    op.add_column(
        "notification",
        sa.Column("message", sa.Text(), nullable=True),
        schema="public",
    )
    op.add_column(
        "notification",
        sa.Column("sent_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        schema="public",
    )

    op.execute(
        text("""
        UPDATE public.notification
        SET message = body, sent_at = created_at
        """)
    )

    op.alter_column("notification", "message", existing_type=sa.Text(), nullable=False, schema="public")

    op.drop_column("notification", "related_assignment_id", schema="public")
    op.drop_column("notification", "created_at", schema="public")
    op.drop_column("notification", "read_at", schema="public")
    op.drop_column("notification", "category", schema="public")
    op.drop_column("notification", "body", schema="public")
    op.drop_column("notification", "title", schema="public")

    op.create_check_constraint(
        "notification_message_check",
        "notification",
        "char_length(message) > 0",
        schema="public",
    )
