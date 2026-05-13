from datetime import datetime
from typing import Any, TypeVar

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models import DailyReport, MaterialRequest

ModelT = TypeVar("ModelT")


def list_query(
    db: Session,
    model: type[ModelT],
    *,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    search_fields: list[Any] | None = None,
    filters: dict[str, Any] | None = None,
) -> list[ModelT]:
    stmt: Select = select(model)
    if search and search_fields:
        pattern = f"%{search}%"
        stmt = stmt.where(or_(*[field.ilike(pattern) for field in search_fields]))
    for key, value in (filters or {}).items():
        if value not in (None, ""):
            stmt = stmt.where(getattr(model, key) == value)
    stmt = stmt.order_by(model.id.desc()).offset(skip).limit(min(limit, 100))
    return list(db.scalars(stmt).all())


def get_or_404(db: Session, model: type[ModelT], item_id: int) -> ModelT:
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{model.__name__} not found")
    return item


def create_item(db: Session, model: type[ModelT], data: dict[str, Any]) -> ModelT:
    item = model(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item: Any, data: dict[str, Any]) -> Any:
    for key, value in data.items():
        if value is not None:
            setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item: Any) -> None:
    db.delete(item)
    db.commit()


def next_report_number(db: Session) -> str:
    count = db.scalar(select(func.count(DailyReport.id))) or 0
    return f"DR-{datetime.now().year}-{count + 1:04d}"


def next_request_number(db: Session) -> str:
    count = db.scalar(select(func.count(MaterialRequest.id))) or 0
    return f"MR-{datetime.now().year}-{count + 1:04d}"

