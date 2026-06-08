"""report events and media storage

Revision ID: 0004_report_events_media
Revises: 0003_report_flow
Create Date: 2026-06-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.db.session import Base
from app.models import *  # noqa: F403

revision: str = "0004_report_events_media"
down_revision: Union[str, None] = "0003_report_flow"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        Base.metadata.create_all(bind=bind)
        return

    op.add_column("report_photos", sa.Column("content_type", sa.String(length=120), nullable=True))
    op.add_column("report_photos", sa.Column("size_bytes", sa.Integer(), nullable=True))
    op.add_column("report_photos", sa.Column("file_blob", sa.LargeBinary(), nullable=True))

    op.create_table(
        "report_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("tone", sa.String(length=20), nullable=False, server_default="neutral"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["report_id"], ["daily_reports.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_events_event_type", "report_events", ["event_type"])


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        return

    op.drop_index("ix_report_events_event_type", table_name="report_events")
    op.drop_table("report_events")
    op.drop_column("report_photos", "file_blob")
    op.drop_column("report_photos", "size_bytes")
    op.drop_column("report_photos", "content_type")
