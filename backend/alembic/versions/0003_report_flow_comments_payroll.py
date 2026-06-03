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


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        Base.metadata.create_all(bind=bind)
        return

    op.add_column("daily_reports", sa.Column("foreman_reviewed_by_user_id", sa.Integer(), nullable=True))
    op.add_column("daily_reports", sa.Column("foreman_reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("daily_reports", sa.Column("admin_reviewed_by_user_id", sa.Integer(), nullable=True))
    op.add_column("daily_reports", sa.Column("admin_reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_daily_reports_foreman_reviewed_by_user_id", "daily_reports", "users", ["foreman_reviewed_by_user_id"], ["id"])
    op.create_foreign_key("fk_daily_reports_admin_reviewed_by_user_id", "daily_reports", "users", ["admin_reviewed_by_user_id"], ["id"])

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
