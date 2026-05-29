"""crews planner object details

Revision ID: 0002_crews_planner
Revises: 0001_initial_schema
Create Date: 2026-05-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.db.session import Base
from app.models import *  # noqa: F403

revision: str = "0002_crews_planner"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        Base.metadata.create_all(bind=bind)
        return

    op.add_column("construction_objects", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("construction_objects", sa.Column("work_scope", sa.Text(), nullable=True))
    op.add_column("construction_objects", sa.Column("site_manager", sa.String(length=160), nullable=True))
    op.add_column("construction_objects", sa.Column("priority", sa.String(length=30), nullable=False, server_default="normal"))
    op.add_column("construction_objects", sa.Column("planned_start_date", sa.Date(), nullable=True))
    op.add_column("construction_objects", sa.Column("planned_end_date", sa.Date(), nullable=True))
    op.add_column("construction_objects", sa.Column("actual_start_date", sa.Date(), nullable=True))
    op.add_column("construction_objects", sa.Column("actual_end_date", sa.Date(), nullable=True))
    op.add_column("construction_objects", sa.Column("progress_percent", sa.Float(), nullable=False, server_default="0"))

    op.create_table(
        "crews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("specialization", sa.String(length=160), nullable=False, server_default="Загальнобудівельні роботи"),
        sa.Column("foreman_employee_id", sa.Integer(), nullable=True),
        sa.Column("current_object_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["current_object_id"], ["construction_objects.id"]),
        sa.ForeignKeyConstraint(["foreman_employee_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_crews_name"), "crews", ["name"], unique=False)

    op.create_table(
        "crew_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("crew_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("role_in_crew", sa.String(length=120), nullable=False, server_default="Працівник"),
        sa.Column("joined_at", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["crew_id"], ["crews.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "work_plan_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("construction_object_id", sa.Integer(), nullable=False),
        sa.Column("crew_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("planned_volume", sa.Float(), nullable=False, server_default="0"),
        sa.Column("completed_volume", sa.Float(), nullable=False, server_default="0"),
        sa.Column("unit", sa.String(length=30), nullable=False, server_default="m2"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="planned"),
        sa.Column("planned_start", sa.Date(), nullable=True),
        sa.Column("planned_end", sa.Date(), nullable=True),
        sa.Column("priority", sa.String(length=30), nullable=False, server_default="normal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["construction_object_id"], ["construction_objects.id"]),
        sa.ForeignKeyConstraint(["crew_id"], ["crews.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_work_plan_items_title"), "work_plan_items", ["title"], unique=False)

    op.add_column("object_assignments", sa.Column("crew_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_object_assignments_crew_id_crews", "object_assignments", "crews", ["crew_id"], ["id"])
    op.add_column("daily_reports", sa.Column("work_plan_item_id", sa.Integer(), nullable=True))
    op.add_column("daily_reports", sa.Column("completed_volume", sa.Float(), nullable=True))
    op.add_column("daily_reports", sa.Column("media_note", sa.Text(), nullable=True))
    op.create_foreign_key("fk_daily_reports_work_plan_item_id", "daily_reports", "work_plan_items", ["work_plan_item_id"], ["id"])


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        return
    op.drop_constraint("fk_daily_reports_work_plan_item_id", "daily_reports", type_="foreignkey")
    op.drop_column("daily_reports", "media_note")
    op.drop_column("daily_reports", "completed_volume")
    op.drop_column("daily_reports", "work_plan_item_id")
    op.drop_constraint("fk_object_assignments_crew_id_crews", "object_assignments", type_="foreignkey")
    op.drop_column("object_assignments", "crew_id")
    op.drop_index(op.f("ix_work_plan_items_title"), table_name="work_plan_items")
    op.drop_table("work_plan_items")
    op.drop_table("crew_members")
    op.drop_index(op.f("ix_crews_name"), table_name="crews")
    op.drop_table("crews")
    for column in [
        "progress_percent",
        "actual_end_date",
        "actual_start_date",
        "planned_end_date",
        "planned_start_date",
        "priority",
        "site_manager",
        "work_scope",
        "description",
    ]:
        op.drop_column("construction_objects", column)
