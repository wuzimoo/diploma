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

    construction_object_columns = [
        ("description", sa.Column("description", sa.Text(), nullable=True)),
        ("work_scope", sa.Column("work_scope", sa.Text(), nullable=True)),
        ("site_manager", sa.Column("site_manager", sa.String(length=160), nullable=True)),
        ("priority", sa.Column("priority", sa.String(length=30), nullable=False, server_default="normal")),
        ("planned_start_date", sa.Column("planned_start_date", sa.Date(), nullable=True)),
        ("planned_end_date", sa.Column("planned_end_date", sa.Date(), nullable=True)),
        ("actual_start_date", sa.Column("actual_start_date", sa.Date(), nullable=True)),
        ("actual_end_date", sa.Column("actual_end_date", sa.Date(), nullable=True)),
        ("progress_percent", sa.Column("progress_percent", sa.Float(), nullable=False, server_default="0")),
    ]
    for column_name, column in construction_object_columns:
        if not _has_column(inspector, "construction_objects", column_name):
            op.add_column("construction_objects", column)
            inspector = sa.inspect(bind)

    if not _has_table(inspector, "crews"):
        op.create_table(
            "crews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("specialization", sa.String(length=160), nullable=False, server_default="Allgemeine Bauarbeiten"),
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
        inspector = sa.inspect(bind)
    if _has_table(inspector, "crews") and not _has_index(inspector, "crews", op.f("ix_crews_name")):
        op.create_index(op.f("ix_crews_name"), "crews", ["name"], unique=False)
        inspector = sa.inspect(bind)

    if not _has_table(inspector, "crew_members"):
        op.create_table(
            "crew_members",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("crew_id", sa.Integer(), nullable=False),
            sa.Column("employee_id", sa.Integer(), nullable=False),
            sa.Column("role_in_crew", sa.String(length=120), nullable=False, server_default="Mitarbeiter"),
            sa.Column("joined_at", sa.Date(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["crew_id"], ["crews.id"]),
            sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)

    if not _has_table(inspector, "work_plan_items"):
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
        inspector = sa.inspect(bind)
    if _has_table(inspector, "work_plan_items") and not _has_index(inspector, "work_plan_items", op.f("ix_work_plan_items_title")):
        op.create_index(op.f("ix_work_plan_items_title"), "work_plan_items", ["title"], unique=False)
        inspector = sa.inspect(bind)

    if not _has_column(inspector, "object_assignments", "crew_id"):
        op.add_column("object_assignments", sa.Column("crew_id", sa.Integer(), nullable=True))
        inspector = sa.inspect(bind)
    if not _has_foreign_key(inspector, "object_assignments", "fk_object_assignments_crew_id_crews"):
        op.create_foreign_key("fk_object_assignments_crew_id_crews", "object_assignments", "crews", ["crew_id"], ["id"])
        inspector = sa.inspect(bind)

    daily_report_columns = [
        ("work_plan_item_id", sa.Column("work_plan_item_id", sa.Integer(), nullable=True)),
        ("completed_volume", sa.Column("completed_volume", sa.Float(), nullable=True)),
        ("media_note", sa.Column("media_note", sa.Text(), nullable=True)),
    ]
    for column_name, column in daily_report_columns:
        if not _has_column(inspector, "daily_reports", column_name):
            op.add_column("daily_reports", column)
            inspector = sa.inspect(bind)
    if not _has_foreign_key(inspector, "daily_reports", "fk_daily_reports_work_plan_item_id"):
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
