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


def _has_table(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    if not _has_table(inspector, table_name):
        return False
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_index(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    if not _has_table(inspector, table_name):
        return False
    return any(index.get("name") == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        Base.metadata.create_all(bind=bind)
        return

    inspector = sa.inspect(bind)

    report_photo_columns = [
        ("content_type", sa.Column("content_type", sa.String(length=120), nullable=True)),
        ("size_bytes", sa.Column("size_bytes", sa.Integer(), nullable=True)),
        ("file_blob", sa.Column("file_blob", sa.LargeBinary(), nullable=True)),
    ]
    for column_name, column in report_photo_columns:
        if not _has_column(inspector, "report_photos", column_name):
            op.add_column("report_photos", column)
            inspector = sa.inspect(bind)

    if not _has_table(inspector, "report_events"):
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
        inspector = sa.inspect(bind)
    if _has_table(inspector, "report_events") and not _has_index(inspector, "report_events", "ix_report_events_event_type"):
        op.create_index("ix_report_events_event_type", "report_events", ["event_type"])


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        return

    op.drop_index("ix_report_events_event_type", table_name="report_events")
    op.drop_table("report_events")
    op.drop_column("report_photos", "file_blob")
    op.drop_column("report_photos", "size_bytes")
    op.drop_column("report_photos", "content_type")
