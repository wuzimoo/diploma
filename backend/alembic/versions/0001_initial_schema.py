"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-13
"""
from typing import Sequence, Union

from alembic import op

from app.db.session import Base
from app.models import *  # noqa: F403

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())

