"""report flow comments payroll

Revision ID: 0003_report_flow
Revises: 0002_crews_planner
Create Date: 2026-06-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.db.session import Base
from app.models import *  # noqa: F403

revision: str = "0003_report_flow"
down_revision: Union[str, None] = "0002_crews_planner"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    if not _has_table(inspector, table_name):
        return False
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_foreign_key(inspector: sa.Inspector, table_name: str, fk_name: str) -> bool:
    if not _has_table(inspector, table_name):
        return False
    return any(foreign_key.get("name") == fk_name for foreign_key in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        Base.metadata.create_all(bind=bind)
        return

    inspector = sa.inspect(bind)

    daily_report_columns = [
        ("foreman_reviewed_by_user_id", sa.Column("foreman_reviewed_by_user_id", sa.Integer(), nullable=True)),
        ("foreman_reviewed_at", sa.Column("foreman_reviewed_at", sa.DateTime(timezone=True), nullable=True)),
        ("admin_reviewed_by_user_id", sa.Column("admin_reviewed_by_user_id", sa.Integer(), nullable=True)),
        ("admin_reviewed_at", sa.Column("admin_reviewed_at", sa.DateTime(timezone=True), nullable=True)),
    ]
    for column_name, column in daily_report_columns:
        if not _has_column(inspector, "daily_reports", column_name):
            op.add_column("daily_reports", column)
            inspector = sa.inspect(bind)

    if not _has_foreign_key(inspector, "daily_reports", "fk_daily_reports_foreman_reviewed_by_user_id"):
        op.create_foreign_key("fk_daily_reports_foreman_reviewed_by_user_id", "daily_reports", "users", ["foreman_reviewed_by_user_id"], ["id"])
        inspector = sa.inspect(bind)
    if not _has_foreign_key(inspector, "daily_reports", "fk_daily_reports_admin_reviewed_by_user_id"):
        op.create_foreign_key("fk_daily_reports_admin_reviewed_by_user_id", "daily_reports", "users", ["admin_reviewed_by_user_id"], ["id"])
        inspector = sa.inspect(bind)

    if not _has_table(inspector, "report_comments"):
        op.create_table(
            "report_comments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("report_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["report_id"], ["daily_reports.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    op.execute("UPDATE daily_reports SET status = 'submitted' WHERE status IN ('open', 'review')")
    op.execute("UPDATE daily_reports SET status = 'admin_approved' WHERE status = 'approved'")


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        return
    op.drop_table("report_comments")
    op.drop_constraint("fk_daily_reports_admin_reviewed_by_user_id", "daily_reports", type_="foreignkey")
    op.drop_constraint("fk_daily_reports_foreman_reviewed_by_user_id", "daily_reports", type_="foreignkey")
    op.drop_column("daily_reports", "admin_reviewed_at")
    op.drop_column("daily_reports", "admin_reviewed_by_user_id")
    op.drop_column("daily_reports", "foreman_reviewed_at")
    op.drop_column("daily_reports", "foreman_reviewed_by_user_id")
