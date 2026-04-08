"""insert admin role into public.role

Revision ID: f7e8d9c0b1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-03-21

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7e8d9c0b1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO public.role (role_name)
        SELECT 'admin'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.role WHERE LOWER(role_name) = 'admin'
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM public.role WHERE LOWER(role_name) = 'admin';
        """
    )
