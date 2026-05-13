from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    role: Mapped[Role] = relationship(back_populates="users")
    employee: Mapped["Employee | None"] = relationship(back_populates="user", uselist=False)


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    position: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    hourly_rate: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="active")
    user: Mapped[User | None] = relationship(back_populates="employee")
    assignments: Mapped[list["ObjectAssignment"]] = relationship(back_populates="employee")
    daily_reports: Mapped[list["DailyReport"]] = relationship(back_populates="employee")


class ConstructionObject(Base, TimestampMixin):
    __tablename__ = "construction_objects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    city: Mapped[str] = mapped_column(String(100), index=True)
    address: Mapped[str] = mapped_column(String(255))
    client: Mapped[str | None] = mapped_column(String(180))
    status: Mapped[str] = mapped_column(String(30), default="active")
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    budget: Mapped[float | None] = mapped_column(Numeric(12, 2))
    assignments: Mapped[list["ObjectAssignment"]] = relationship(back_populates="construction_object")
    daily_reports: Mapped[list["DailyReport"]] = relationship(back_populates="construction_object")
    material_requests: Mapped[list["MaterialRequest"]] = relationship(back_populates="construction_object")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="construction_object")


class ObjectAssignment(Base, TimestampMixin):
    __tablename__ = "object_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    construction_object_id: Mapped[int] = mapped_column(ForeignKey("construction_objects.id"))
    role_on_object: Mapped[str] = mapped_column(String(120), default="Працівник")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    employee: Mapped[Employee] = relationship(back_populates="assignments")
    construction_object: Mapped[ConstructionObject] = relationship(back_populates="assignments")


class DailyReport(Base, TimestampMixin):
    __tablename__ = "daily_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_number: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    construction_object_id: Mapped[int] = mapped_column(ForeignKey("construction_objects.id"))
    report_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    break_minutes: Mapped[int] = mapped_column(Integer, default=30)
    worked_hours: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    work_description: Mapped[str] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    employee: Mapped[Employee] = relationship(back_populates="daily_reports")
    construction_object: Mapped[ConstructionObject] = relationship(back_populates="daily_reports")
    photos: Mapped[list["ReportPhoto"]] = relationship(back_populates="daily_report", cascade="all, delete-orphan")


class ReportPhoto(Base, TimestampMixin):
    __tablename__ = "report_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    daily_report_id: Mapped[int] = mapped_column(ForeignKey("daily_reports.id"))
    file_name: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(String(255))
    daily_report: Mapped[DailyReport] = relationship(back_populates="photos")


class Material(Base, TimestampMixin):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    unit: Mapped[str] = mapped_column(String(30), default="pcs")
    default_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    items: Mapped[list["MaterialRequestItem"]] = relationship(back_populates="material")


class MaterialRequest(Base, TimestampMixin):
    __tablename__ = "material_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_number: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    construction_object_id: Mapped[int] = mapped_column(ForeignKey("construction_objects.id"))
    requested_by_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    needed_by: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    comment: Mapped[str | None] = mapped_column(Text)
    construction_object: Mapped[ConstructionObject] = relationship(back_populates="material_requests")
    requested_by: Mapped[Employee] = relationship()
    items: Mapped[list["MaterialRequestItem"]] = relationship(back_populates="material_request", cascade="all, delete-orphan")


class MaterialRequestItem(Base, TimestampMixin):
    __tablename__ = "material_request_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    material_request_id: Mapped[int] = mapped_column(ForeignKey("material_requests.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("materials.id"))
    quantity: Mapped[float] = mapped_column(Float)
    estimated_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    material_request: Mapped[MaterialRequest] = relationship(back_populates="items")
    material: Mapped[Material] = relationship(back_populates="items")


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    construction_object_id: Mapped[int] = mapped_column(ForeignKey("construction_objects.id"))
    expense_date: Mapped[date] = mapped_column(Date)
    category: Mapped[str] = mapped_column(String(80), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(Text)
    construction_object: Mapped[ConstructionObject] = relationship(back_populates="expenses")
