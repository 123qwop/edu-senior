"""add_study_sets_tables

Revision ID: dc8498781d11
Revises: 8ee63a38875c
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dc8498781d11"
down_revision: Union[str, None] = "8ee63a38875c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add study sets enhancements."""
    # Add new columns to studyset table
    op.add_column("studyset", sa.Column("type", sa.String(length=50), nullable=False, server_default="Quiz"))
    op.add_column("studyset", sa.Column("level", sa.String(length=50), nullable=True))
    op.add_column("studyset", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("studyset", sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()))
    op.add_column("studyset", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()))
    op.add_column("studyset", sa.Column("is_shared", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("studyset", sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"))
    
    # Add check constraint for type
    op.create_check_constraint(
        "studyset_type_check",
        "studyset",
        "type IN ('Flashcards', 'Quiz', 'Problem set')"
    )

    # Create studyset_tags table
    op.create_table(
        "studyset_tags",
        sa.Column("set_id", sa.Integer(), nullable=False),
        sa.Column("tag", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("set_id", "tag"),
        schema="public",
    )
    op.create_foreign_key(
        "studyset_tags_set_id_fkey",
        "studyset_tags",
        "studyset",
        ["set_id"],
        ["set_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_studyset_tags_set", "studyset_tags", ["set_id"], schema="public")
    op.create_index("index_studyset_tags_tag", "studyset_tags", ["tag"], schema="public")

    # Create question_options table
    op.create_table(
        "question_options",
        sa.Column("option_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("option_text", sa.Text(), nullable=False),
        sa.Column("option_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("option_id"),
        sa.CheckConstraint("option_order BETWEEN 1 AND 4", name="question_options_order_check"),
        schema="public",
    )
    op.create_foreign_key(
        "question_options_question_id_fkey",
        "question_options",
        "question",
        ["question_id"],
        ["question_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_question_options_question", "question_options", ["question_id"], schema="public")

    # Create flashcard table
    op.create_table(
        "flashcard",
        sa.Column("flashcard_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("term", sa.Text(), nullable=False),
        sa.Column("definition", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("flashcard_id"),
        sa.UniqueConstraint("question_id"),
        schema="public",
    )
    op.create_foreign_key(
        "flashcard_question_id_fkey",
        "flashcard",
        "question",
        ["question_id"],
        ["question_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_flashcard_question", "flashcard", ["question_id"], schema="public")

    # Create study_set_assignment table
    op.create_table(
        "study_set_assignment",
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("set_id", sa.Integer(), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=True),
        sa.Column("assigned_by", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("assignment_id"),
        sa.UniqueConstraint("set_id", "class_id", name="study_set_assignment_set_class_unique"),
        schema="public",
    )
    op.create_foreign_key(
        "study_set_assignment_set_id_fkey",
        "study_set_assignment",
        "studyset",
        ["set_id"],
        ["set_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "study_set_assignment_class_id_fkey",
        "study_set_assignment",
        "class",
        ["class_id"],
        ["class_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "study_set_assignment_assigned_by_fkey",
        "study_set_assignment",
        "User",
        ["assigned_by"],
        ["user_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_assignment_set", "study_set_assignment", ["set_id"], schema="public")
    op.create_index("index_assignment_class", "study_set_assignment", ["class_id"], schema="public")

    # Create study_set_student_assignment table
    op.create_table(
        "study_set_student_assignment",
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("assignment_id", "user_id"),
        schema="public",
    )
    op.create_foreign_key(
        "study_set_student_assignment_assignment_id_fkey",
        "study_set_student_assignment",
        "study_set_assignment",
        ["assignment_id"],
        ["assignment_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "study_set_student_assignment_user_id_fkey",
        "study_set_student_assignment",
        "User",
        ["user_id"],
        ["user_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_student_assignment_user", "study_set_student_assignment", ["user_id"], schema="public")

    # Create study_set_progress table
    op.create_table(
        "study_set_progress",
        sa.Column("progress_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("set_id", sa.Integer(), nullable=False),
        sa.Column("mastery_percentage", sa.DECIMAL(5, 2), nullable=False, server_default="0.00"),
        sa.Column("last_activity", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("items_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_items", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("progress_id"),
        sa.UniqueConstraint("user_id", "set_id", name="study_set_progress_user_set_unique"),
        sa.CheckConstraint("mastery_percentage BETWEEN 0 AND 100", name="study_set_progress_mastery_check"),
        schema="public",
    )
    op.create_foreign_key(
        "study_set_progress_user_id_fkey",
        "study_set_progress",
        "User",
        ["user_id"],
        ["user_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "study_set_progress_set_id_fkey",
        "study_set_progress",
        "studyset",
        ["set_id"],
        ["set_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_progress_user_set", "study_set_progress", ["user_id", "set_id"], schema="public")

    # Create study_set_offline table
    op.create_table(
        "study_set_offline",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("set_id", sa.Integer(), nullable=False),
        sa.Column("downloaded_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.PrimaryKeyConstraint("user_id", "set_id"),
        schema="public",
    )
    op.create_foreign_key(
        "study_set_offline_user_id_fkey",
        "study_set_offline",
        "User",
        ["user_id"],
        ["user_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "study_set_offline_set_id_fkey",
        "study_set_offline",
        "studyset",
        ["set_id"],
        ["set_id"],
        ondelete="CASCADE",
    )
    op.create_index("index_offline_user", "study_set_offline", ["user_id"], schema="public")


def downgrade() -> None:
    """Downgrade schema - remove study sets enhancements."""
    # Drop tables in reverse order
    op.drop_table("study_set_offline", schema="public")
    op.drop_table("study_set_progress", schema="public")
    op.drop_table("study_set_student_assignment", schema="public")
    op.drop_table("study_set_assignment", schema="public")
    op.drop_table("flashcard", schema="public")
    op.drop_table("question_options", schema="public")
    op.drop_table("studyset_tags", schema="public")
    
    # Remove columns from studyset
    op.drop_constraint("studyset_type_check", "studyset", type_="check")
    op.drop_column("studyset", "is_public")
    op.drop_column("studyset", "is_shared")
    op.drop_column("studyset", "updated_at")
    op.drop_column("studyset", "created_at")
    op.drop_column("studyset", "description")
    op.drop_column("studyset", "level")
    op.drop_column("studyset", "type")
