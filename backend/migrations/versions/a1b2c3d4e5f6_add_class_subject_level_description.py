"""add class subject level description

Revision ID: a1b2c3d4e5f6
Revises: dc8498781d11
Create Date: 2024-11-21 01:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "dc8498781d11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add subject column to class table
    op.add_column('class', sa.Column('subject', sa.String(length=100), nullable=True), schema='public')
    
    # Add level column to class table
    op.add_column('class', sa.Column('level', sa.String(length=50), nullable=True), schema='public')
    
    # Add description column to class table
    op.add_column('class', sa.Column('description', sa.Text(), nullable=True), schema='public')


def downgrade() -> None:
    # Remove description column
    op.drop_column('class', 'description', schema='public')
    
    # Remove level column
    op.drop_column('class', 'level', schema='public')
    
    # Remove subject column
    op.drop_column('class', 'subject', schema='public')

