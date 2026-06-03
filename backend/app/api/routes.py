import csv
from datetime import UTC, date, datetime
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models import (
    ConstructionObject,
    Crew,
    CrewMember,
    DailyReport,
    Employee,
    Expense,
    Material,
    MaterialRequest,
    MaterialRequestItem,
    ObjectAssignment,
    ReportComment,
    ReportPhoto,
    Role,
    User,
    WorkPlanItem,
)
from app.schemas import (
    ActiveAssignmentOut,
    AssignmentCreate,
    AssignmentOut,
    AssignmentUpdate,
    ConstructionObjectCreate,
    ConstructionObjectOut,
    ConstructionObjectUpdate,
    CrewCreate,
    CrewMemberCreate,
    CrewMemberOut,
    CrewMemberUpdate,
    CrewOut,
    CrewUpdate,
    DailyReportCreate,
    DailyReportOut,
    DailyReportUpdate,
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
    ExpenseCreate,
    ExpenseOut,
    ExpenseUpdate,
    MaterialCreate,
    MaterialOut,
    MaterialRequestCreate,
    MaterialRequestItemCreate,
    MaterialRequestItemOut,
    MaterialRequestItemUpdate,
    MaterialRequestOut,
    MaterialRequestUpdate,
    MaterialUpdate,
    ObjectSummaryOut,
    PayrollSummaryOut,
    ReportPhotoCreate,
    ReportPhotoOut,
    ReportCommentCreate,
    ReportCommentOut,
    ReportStatusUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
    WorkPlanItemCreate,
    WorkPlanItemOut,
    WorkPlanItemUpdate,
)
from app.services.crud import create_item, delete_item, get_or_404, list_query, next_report_number, next_request_number, update_item
from app.utils.dates import calculate_worked_hours

router = APIRouter()

REPORT_EDITABLE_STATUSES = {"draft", "rejected", "change_requested"}
PAYROLL_FINAL_STATUSES = {"admin_approved", "approved"}


def employee_query():
    return select(Employee).options(selectinload(Employee.user).selectinload(User.role))


def report_query(db: Session):
    return select(DailyReport).options(
        selectinload(DailyReport.employee).selectinload(Employee.user).selectinload(User.role),
        selectinload(DailyReport.construction_object),
        selectinload(DailyReport.work_plan_item),
        selectinload(DailyReport.photos),
    )


def role_by_code(db: Session, code: str) -> Role:
    role = db.scalar(select(Role).where(Role.code == code))
    if not role:
        raise HTTPException(status_code=400, detail=f"Unknown role code: {code}")
    return role


def employee_full_name(first_name: str, last_name: str) -> str:
    return f"{first_name.strip()} {last_name.strip()}".strip()


def apply_employee_access(db: Session, employee: Employee, access_email: str | None, access_password: str | None, access_role_code: str | None, access_is_active: bool | None) -> None:
    if access_email is None and access_password is None and access_role_code is None and access_is_active is None:
        return

    if access_email and employee.user and employee.user.email != access_email:
        conflict = db.scalar(select(User).where(User.email == access_email, User.id != employee.user.id))
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Користувач з таким email уже існує")
    elif access_email and not employee.user:
        conflict = db.scalar(select(User).where(User.email == access_email))
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Користувач з таким email уже існує")

    if employee.user is None:
        if not access_email:
            return
        if not access_password:
            raise HTTPException(status_code=400, detail="Для створення доступу потрібен тимчасовий пароль")
        role = role_by_code(db, access_role_code or "worker")
        user = User(
            email=access_email,
            full_name=employee_full_name(employee.first_name, employee.last_name),
            hashed_password=get_password_hash(access_password),
            is_active=access_is_active if access_is_active is not None else True,
            role=role,
        )
        db.add(user)
        db.flush()
        employee.user = user
        employee.user_id = user.id
        return

    user = employee.user
    if access_email:
        user.email = access_email
    if access_password:
        user.hashed_password = get_password_hash(access_password)
    if access_role_code:
        user.role = role_by_code(db, access_role_code)
    if access_is_active is not None:
        user.is_active = access_is_active
    user.full_name = employee_full_name(employee.first_name, employee.last_name)


def normalize_report_status(value: str) -> str:
    mapping = {
        "open": "submitted",
        "review": "submitted",
        "approved": "admin_approved",
    }
    return mapping.get(value, value)


def calendar_severity_for_statuses(statuses: set[str]) -> str:
    normalized = {normalize_report_status(status) for status in statuses}
    if "rejected" in normalized or "change_requested" in normalized:
        return "danger"
    if "submitted" in normalized or "foreman_approved" in normalized or "draft" in normalized:
        return "warning"
    if "admin_approved" in normalized:
        return "ok"
    return "neutral"


def build_payroll_summary(db: Session, start_date: date, end_date: date) -> dict:
    employees = list(db.scalars(employee_query().where(Employee.status == "active").order_by(Employee.first_name, Employee.last_name)).all())
    reports = list(
        db.scalars(
            report_query(db)
            .where(
                DailyReport.report_date >= start_date,
                DailyReport.report_date <= end_date,
            )
            .order_by(DailyReport.report_date, DailyReport.id)
        ).all()
    )
    summary_rows = []
    for employee in employees:
        employee_reports = [report for report in reports if report.employee_id == employee.id]
        final_reports = [report for report in employee_reports if normalize_report_status(report.status) == "admin_approved"]
        pending_reports = [report for report in employee_reports if normalize_report_status(report.status) in {"submitted", "foreman_approved", "draft", "change_requested"}]
        rejected_reports = [report for report in employee_reports if normalize_report_status(report.status) == "rejected"]
        approved_hours = round(sum(float(report.worked_hours or 0) for report in final_reports), 2)
        summary_rows.append(
            {
                "employee_id": employee.id,
                "name": f"{employee.first_name} {employee.last_name}",
                "position": employee.position,
                "hourly_rate": float(employee.hourly_rate or 0),
                "approved_hours": approved_hours,
                "total_payment": round(approved_hours * float(employee.hourly_rate or 0), 2),
                "reports_count": len(final_reports),
                "pending_count": len(pending_reports),
                "rejected_count": len(rejected_reports),
                "reports": [
                    {
                        "id": report.id,
                        "report_number": report.report_number,
                        "report_date": report.report_date,
                        "worked_hours": float(report.worked_hours or 0),
                        "status": normalize_report_status(report.status),
                        "construction_object_name": report.construction_object.name,
                        "description": report.work_description,
                    }
                    for report in final_reports
                ],
            }
        )
    return {"start_date": start_date, "end_date": end_date, "employees": summary_rows}


@router.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/users", response_model=list[UserOut], tags=["users"])
def list_users(
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[User]:
    return list_query(db, User, skip=skip, limit=limit, search=search, search_fields=[User.email, User.full_name])


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> User:
    data = payload.model_dump()
    password = data.pop("password")
    data["hashed_password"] = get_password_hash(password)
    return create_item(db, User, data)


@router.get("/users/{item_id}", response_model=UserOut, tags=["users"])
def get_user(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> User:
    return get_or_404(db, User, item_id)


@router.patch("/users/{item_id}", response_model=UserOut, tags=["users"])
def update_user(item_id: int, payload: UserUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> User:
    item = get_or_404(db, User, item_id)
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        data["hashed_password"] = get_password_hash(data.pop("password"))
    return update_item(db, item, data)


@router.delete("/users/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["users"])
def delete_user(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    delete_item(db, get_or_404(db, User, item_id))


@router.get("/employees", response_model=list[EmployeeOut], tags=["employees"])
def list_employees(skip: int = 0, limit: int = 50, search: str | None = None, status_filter: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Employee]:
    stmt = employee_query()
    if status_filter:
        stmt = stmt.where(Employee.status == status_filter)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Employee.first_name.ilike(pattern)
            | Employee.last_name.ilike(pattern)
            | Employee.position.ilike(pattern)
            | User.email.ilike(pattern)
        )
        stmt = stmt.join(User, isouter=True)
    stmt = stmt.order_by(Employee.first_name, Employee.last_name).offset(skip).limit(min(limit, 100))
    return list(db.scalars(stmt).unique().all())


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED, tags=["employees"])
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Employee:
    data = payload.model_dump()
    access_email = data.pop("access_email", None)
    access_password = data.pop("access_password", None)
    access_role_code = data.pop("access_role_code", None)
    access_is_active = data.pop("access_is_active", True)
    employee = Employee(**data)
    db.add(employee)
    db.flush()
    apply_employee_access(db, employee, access_email, access_password, access_role_code, access_is_active)
    db.commit()
    return db.scalar(employee_query().where(Employee.id == employee.id))


@router.get("/employees/{item_id}", response_model=EmployeeOut, tags=["employees"])
def get_employee(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Employee:
    item = db.scalar(employee_query().where(Employee.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Employee not found")
    return item


@router.patch("/employees/{item_id}", response_model=EmployeeOut, tags=["employees"])
def update_employee(item_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Employee:
    data = payload.model_dump(exclude_unset=True)
    access_email = data.pop("access_email", None) if "access_email" in data else None
    access_password = data.pop("access_password", None) if "access_password" in data else None
    access_role_code = data.pop("access_role_code", None) if "access_role_code" in data else None
    access_is_active = data.pop("access_is_active", None) if "access_is_active" in data else None
    employee = get_or_404(db, Employee, item_id)
    update_item(db, employee, data)
    apply_employee_access(db, employee, access_email, access_password, access_role_code, access_is_active)
    db.commit()
    return db.scalar(employee_query().where(Employee.id == item_id))


@router.delete("/employees/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["employees"])
def delete_employee(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    delete_item(db, get_or_404(db, Employee, item_id))


@router.get("/objects", response_model=list[ConstructionObjectOut], tags=["objects"])
def list_objects(skip: int = 0, limit: int = 50, search: str | None = None, city: str | None = None, status_filter: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ConstructionObject]:
    return list_query(db, ConstructionObject, skip=skip, limit=limit, search=search, search_fields=[ConstructionObject.name, ConstructionObject.code, ConstructionObject.city, ConstructionObject.address], filters={"city": city, "status": status_filter})


@router.post("/objects", response_model=ConstructionObjectOut, status_code=status.HTTP_201_CREATED, tags=["objects"])
def create_object(payload: ConstructionObjectCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> ConstructionObject:
    return create_item(db, ConstructionObject, payload.model_dump())


@router.get("/objects/{item_id}", response_model=ConstructionObjectOut, tags=["objects"])
def get_object(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> ConstructionObject:
    return get_or_404(db, ConstructionObject, item_id)


@router.patch("/objects/{item_id}", response_model=ConstructionObjectOut, tags=["objects"])
def update_object(item_id: int, payload: ConstructionObjectUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> ConstructionObject:
    return update_item(db, get_or_404(db, ConstructionObject, item_id), payload.model_dump(exclude_unset=True))


@router.delete("/objects/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["objects"])
def delete_object(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    delete_item(db, get_or_404(db, ConstructionObject, item_id))


@router.get("/objects/{item_id}/summary", response_model=ObjectSummaryOut, tags=["objects"])
def object_summary(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    construction_object = get_or_404(db, ConstructionObject, item_id)
    crews = list(
        db.scalars(
            select(Crew)
            .options(selectinload(Crew.current_object), selectinload(Crew.foreman), selectinload(Crew.members).selectinload(CrewMember.employee))
            .where(Crew.current_object_id == item_id)
        ).all()
    )
    employees = list(
        db.scalars(
            select(Employee)
            .join(ObjectAssignment, ObjectAssignment.employee_id == Employee.id)
            .where(ObjectAssignment.construction_object_id == item_id, ObjectAssignment.is_active.is_(True))
        ).unique().all()
    )
    work_plan_items = list(db.scalars(select(WorkPlanItem).where(WorkPlanItem.construction_object_id == item_id).order_by(WorkPlanItem.planned_start, WorkPlanItem.id)).all())
    reports = list(db.scalars(report_query(db).where(DailyReport.construction_object_id == item_id).order_by(DailyReport.report_date.desc()).limit(20)).all())
    report_statuses = dict(db.execute(select(DailyReport.status, func.count(DailyReport.id)).where(DailyReport.construction_object_id == item_id).group_by(DailyReport.status)).all())
    total_hours = float(db.scalar(select(func.coalesce(func.sum(DailyReport.worked_hours), 0)).where(DailyReport.construction_object_id == item_id)) or 0)
    expense_total = float(db.scalar(select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.construction_object_id == item_id)) or 0)
    planned = sum(item.planned_volume or 0 for item in work_plan_items)
    completed = sum(item.completed_volume or 0 for item in work_plan_items)
    progress_percent = round((completed / planned) * 100, 1) if planned else construction_object.progress_percent
    return {
        "object": construction_object,
        "crews": crews,
        "employees": employees,
        "work_plan_items": work_plan_items,
        "reports": reports,
        "report_statuses": report_statuses,
        "total_hours": round(total_hours, 2),
        "expense_total": round(expense_total, 2),
        "progress_percent": progress_percent,
    }


@router.get("/assignments", response_model=list[AssignmentOut], tags=["assignments"])
def list_assignments(skip: int = 0, limit: int = 50, employee_id: int | None = None, construction_object_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ObjectAssignment]:
    return list_query(db, ObjectAssignment, skip=skip, limit=limit, filters={"employee_id": employee_id, "construction_object_id": construction_object_id})


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED, tags=["assignments"])
def create_assignment(payload: AssignmentCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> ObjectAssignment:
    return create_item(db, ObjectAssignment, payload.model_dump())


@router.patch("/assignments/{item_id}", response_model=AssignmentOut, tags=["assignments"])
def update_assignment(item_id: int, payload: AssignmentUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> ObjectAssignment:
    return update_item(db, get_or_404(db, ObjectAssignment, item_id), payload.model_dump(exclude_unset=True))


@router.delete("/assignments/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["assignments"])
def delete_assignment(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> None:
    delete_item(db, get_or_404(db, ObjectAssignment, item_id))


@router.get("/me/active-assignment", response_model=ActiveAssignmentOut, tags=["assignments"])
def my_active_assignment(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    employee = db.scalar(select(Employee).where(Employee.user_id == current_user.id))
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    assignment = db.scalar(
        select(ObjectAssignment)
        .options(selectinload(ObjectAssignment.construction_object), selectinload(ObjectAssignment.crew))
        .where(ObjectAssignment.employee_id == employee.id, ObjectAssignment.is_active.is_(True))
        .order_by(ObjectAssignment.start_date.desc(), ObjectAssignment.id.desc())
    )
    crew = assignment.crew if assignment else db.scalar(select(Crew).join(CrewMember).where(CrewMember.employee_id == employee.id, CrewMember.is_active.is_(True)).limit(1))
    construction_object = assignment.construction_object if assignment else (crew.current_object if crew else None)
    work_plan_items = []
    if construction_object:
        stmt = select(WorkPlanItem).where(WorkPlanItem.construction_object_id == construction_object.id)
        if crew:
            stmt = stmt.where((WorkPlanItem.crew_id == crew.id) | (WorkPlanItem.crew_id.is_(None)))
        work_plan_items = list(db.scalars(stmt.order_by(WorkPlanItem.planned_start, WorkPlanItem.id)).all())
    return {"employee": employee, "assignment": assignment, "crew": crew, "construction_object": construction_object, "work_plan_items": work_plan_items}


def crew_query():
    return select(Crew).options(selectinload(Crew.current_object), selectinload(Crew.foreman), selectinload(Crew.members).selectinload(CrewMember.employee))


@router.get("/crews", response_model=list[CrewOut], tags=["crews"])
def list_crews(skip: int = 0, limit: int = 50, current_object_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Crew]:
    stmt = crew_query()
    if current_object_id:
        stmt = stmt.where(Crew.current_object_id == current_object_id)
    return list(db.scalars(stmt.order_by(Crew.name).offset(skip).limit(min(limit, 100))).all())


@router.post("/crews", response_model=CrewOut, status_code=status.HTTP_201_CREATED, tags=["crews"])
def create_crew(payload: CrewCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Crew:
    crew = create_item(db, Crew, payload.model_dump())
    return db.scalar(crew_query().where(Crew.id == crew.id))


@router.patch("/crews/{item_id}", response_model=CrewOut, tags=["crews"])
def update_crew(item_id: int, payload: CrewUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Crew:
    update_item(db, get_or_404(db, Crew, item_id), payload.model_dump(exclude_unset=True))
    return db.scalar(crew_query().where(Crew.id == item_id))


@router.post("/crew-members", response_model=CrewMemberOut, status_code=status.HTTP_201_CREATED, tags=["crews"])
def create_crew_member(payload: CrewMemberCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> CrewMember:
    existing_member = db.scalar(
        select(CrewMember)
        .options(selectinload(CrewMember.crew))
        .where(
            CrewMember.employee_id == payload.employee_id,
            CrewMember.is_active.is_(True),
            CrewMember.crew_id != payload.crew_id,
        )
        .limit(1)
    )
    if existing_member:
        crew_name = existing_member.crew.name if existing_member.crew else "іншій бригаді"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Працівник уже закріплений в активній бригаді: {crew_name}")
    item = create_item(db, CrewMember, payload.model_dump())
    return db.scalar(select(CrewMember).options(selectinload(CrewMember.employee)).where(CrewMember.id == item.id))


@router.patch("/crew-members/{item_id}", response_model=CrewMemberOut, tags=["crews"])
def update_crew_member(item_id: int, payload: CrewMemberUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> CrewMember:
    update_item(db, get_or_404(db, CrewMember, item_id), payload.model_dump(exclude_unset=True))
    return db.scalar(select(CrewMember).options(selectinload(CrewMember.employee)).where(CrewMember.id == item_id))


@router.get("/work-plan-items", response_model=list[WorkPlanItemOut], tags=["work plan"])
def list_work_plan_items(construction_object_id: int | None = None, crew_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[WorkPlanItem]:
    stmt = select(WorkPlanItem)
    if construction_object_id:
        stmt = stmt.where(WorkPlanItem.construction_object_id == construction_object_id)
    if crew_id:
        stmt = stmt.where(WorkPlanItem.crew_id == crew_id)
    return list(db.scalars(stmt.order_by(WorkPlanItem.planned_start, WorkPlanItem.id)).all())


@router.post("/work-plan-items", response_model=WorkPlanItemOut, status_code=status.HTTP_201_CREATED, tags=["work plan"])
def create_work_plan_item(payload: WorkPlanItemCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> WorkPlanItem:
    return create_item(db, WorkPlanItem, payload.model_dump())


@router.patch("/work-plan-items/{item_id}", response_model=WorkPlanItemOut, tags=["work plan"])
def update_work_plan_item(item_id: int, payload: WorkPlanItemUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> WorkPlanItem:
    return update_item(db, get_or_404(db, WorkPlanItem, item_id), payload.model_dump(exclude_unset=True))

@router.get("/daily-reports", response_model=list[DailyReportOut], tags=["daily reports"])
def list_reports(
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
    employee_id: int | None = None,
    construction_object_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DailyReport]:
    stmt = report_query(db)
    if status_filter:
        stmt = stmt.where(DailyReport.status == status_filter)
    if employee_id:
        stmt = stmt.where(DailyReport.employee_id == employee_id)
    if construction_object_id:
        stmt = stmt.where(DailyReport.construction_object_id == construction_object_id)
    if date_from:
        stmt = stmt.where(DailyReport.report_date >= date_from)
    if date_to:
        stmt = stmt.where(DailyReport.report_date <= date_to)
    if search:
        stmt = stmt.where(DailyReport.work_description.ilike(f"%{search}%"))
    stmt = stmt.order_by(DailyReport.report_date.desc(), DailyReport.id.desc()).offset(skip).limit(min(limit, 100))
    return list(db.scalars(stmt).all())


@router.post("/daily-reports", response_model=DailyReportOut, status_code=status.HTTP_201_CREATED, tags=["daily reports"])
def create_report(payload: DailyReportCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> DailyReport:
    data = payload.model_dump()
    data["report_number"] = data["report_number"] or next_report_number(db)
    data["worked_hours"] = data["worked_hours"] or calculate_worked_hours(data["start_time"], data["end_time"], data["break_minutes"])
    data["status"] = normalize_report_status(data.get("status") or "submitted")
    item = create_item(db, DailyReport, data)
    if item.work_plan_item_id and item.completed_volume:
        plan = get_or_404(db, WorkPlanItem, item.work_plan_item_id)
        plan.completed_volume = min((plan.completed_volume or 0) + item.completed_volume, plan.planned_volume or ((plan.completed_volume or 0) + item.completed_volume))
        if plan.planned_volume and plan.completed_volume >= plan.planned_volume:
            plan.status = "done"
        elif plan.completed_volume:
            plan.status = "in_progress"
        db.commit()
    return db.scalar(report_query(db).where(DailyReport.id == item.id))


@router.get("/daily-reports/{item_id}", response_model=DailyReportOut, tags=["daily reports"])
def get_report(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> DailyReport:
    item = db.scalar(report_query(db).where(DailyReport.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="DailyReport not found")
    return item


@router.patch("/daily-reports/{item_id}", response_model=DailyReportOut, tags=["daily reports"])
def update_report(item_id: int, payload: DailyReportUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> DailyReport:
    data = payload.model_dump(exclude_unset=True)
    item = get_or_404(db, DailyReport, item_id)
    item.status = normalize_report_status(item.status)
    if item.status not in REPORT_EDITABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Звіт уже погоджено і заблоковано для редагування")
    if {"start_time", "end_time", "break_minutes"} & data.keys():
        start = data.get("start_time", item.start_time)
        end = data.get("end_time", item.end_time)
        pause = data.get("break_minutes", item.break_minutes)
        data["worked_hours"] = calculate_worked_hours(start, end, pause)
    if "status" in data and data["status"] is not None:
        data["status"] = normalize_report_status(data["status"])
    update_item(db, item, data)
    return db.scalar(report_query(db).where(DailyReport.id == item_id))


@router.patch("/daily-reports/{item_id}/status", response_model=DailyReportOut, tags=["daily reports"])
def change_report_status(item_id: int, payload: ReportStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin", "foreman"))) -> DailyReport:
    item = get_or_404(db, DailyReport, item_id)
    current_status = normalize_report_status(item.status)
    next_status = normalize_report_status(payload.status)

    if current_user.role.code == "foreman":
        if next_status not in {"foreman_approved", "rejected", "change_requested", "submitted"}:
            raise HTTPException(status_code=403, detail="Бригадир не може виконати цю дію")
        if current_status not in {"submitted", "change_requested", "rejected"} and next_status != "submitted":
            raise HTTPException(status_code=409, detail="Поточний статус не можна змінити на цьому етапі")
        item.foreman_reviewed_by_user_id = current_user.id
        item.foreman_reviewed_at = datetime.now(UTC)

    if current_user.role.code == "admin":
        if next_status not in {"admin_approved", "rejected", "change_requested", "foreman_approved"}:
            raise HTTPException(status_code=403, detail="Адміністратор не може виконати цю дію")
        if next_status == "admin_approved" and current_status != "foreman_approved":
            raise HTTPException(status_code=409, detail="Фінальне погодження доступне лише після бригадира")
        item.admin_reviewed_by_user_id = current_user.id
        item.admin_reviewed_at = datetime.now(UTC)

    item.status = next_status
    item.rejection_reason = payload.rejection_reason
    db.commit()
    db.refresh(item)
    return db.scalar(report_query(db).where(DailyReport.id == item_id))


@router.delete("/daily-reports/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["daily reports"])
def delete_report(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> None:
    delete_item(db, get_or_404(db, DailyReport, item_id))


@router.post("/report-photos", response_model=ReportPhotoOut, status_code=status.HTTP_201_CREATED, tags=["report photos"])
def create_photo_metadata(payload: ReportPhotoCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> ReportPhoto:
    return create_item(db, ReportPhoto, payload.model_dump())


@router.get("/reports/{item_id}/comments", response_model=list[ReportCommentOut], tags=["daily reports"])
def list_report_comments(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[ReportComment]:
    return list(
        db.scalars(
            select(ReportComment)
            .options(selectinload(ReportComment.author).selectinload(User.role))
            .where(ReportComment.report_id == item_id)
            .order_by(ReportComment.created_at.asc(), ReportComment.id.asc())
        ).all()
    )


@router.post("/reports/{item_id}/comments", response_model=ReportCommentOut, status_code=status.HTTP_201_CREATED, tags=["daily reports"])
def create_report_comment(item_id: int, payload: ReportCommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ReportComment:
    get_or_404(db, DailyReport, item_id)
    comment = create_item(db, ReportComment, {"report_id": item_id, "user_id": current_user.id, "body": payload.body.strip()})
    return db.scalar(
        select(ReportComment)
        .options(selectinload(ReportComment.author).selectinload(User.role))
        .where(ReportComment.id == comment.id)
    )


@router.get("/materials", response_model=list[MaterialOut], tags=["materials"])
def list_materials(skip: int = 0, limit: int = 50, search: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Material]:
    return list_query(db, Material, skip=skip, limit=limit, search=search, search_fields=[Material.sku, Material.name])


@router.post("/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED, tags=["materials"])
def create_material(payload: MaterialCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Material:
    return create_item(db, Material, payload.model_dump())


@router.patch("/materials/{item_id}", response_model=MaterialOut, tags=["materials"])
def update_material(item_id: int, payload: MaterialUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Material:
    return update_item(db, get_or_404(db, Material, item_id), payload.model_dump(exclude_unset=True))


@router.get("/materials/{item_id}", response_model=MaterialOut, tags=["materials"])
def get_material(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Material:
    return get_or_404(db, Material, item_id)


@router.delete("/materials/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["materials"])
def delete_material(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    delete_item(db, get_or_404(db, Material, item_id))


@router.get("/material-requests", response_model=list[MaterialRequestOut], tags=["material requests"])
def list_material_requests(skip: int = 0, limit: int = 50, status_filter: str | None = None, construction_object_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[MaterialRequest]:
    stmt = select(MaterialRequest).options(selectinload(MaterialRequest.construction_object), selectinload(MaterialRequest.requested_by), selectinload(MaterialRequest.items).selectinload(MaterialRequestItem.material))
    if status_filter:
        stmt = stmt.where(MaterialRequest.status == status_filter)
    if construction_object_id:
        stmt = stmt.where(MaterialRequest.construction_object_id == construction_object_id)
    stmt = stmt.order_by(MaterialRequest.id.desc()).offset(skip).limit(min(limit, 100))
    return list(db.scalars(stmt).all())


@router.post("/material-requests", response_model=MaterialRequestOut, status_code=status.HTTP_201_CREATED, tags=["material requests"])
def create_material_request(payload: MaterialRequestCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> MaterialRequest:
    data = payload.model_dump()
    items = data.pop("items", [])
    data["request_number"] = data["request_number"] or next_request_number(db)
    request = MaterialRequest(**data)
    db.add(request)
    db.flush()
    for item in items:
        db.add(MaterialRequestItem(material_request_id=request.id, **item))
    db.commit()
    return db.scalar(select(MaterialRequest).options(selectinload(MaterialRequest.construction_object), selectinload(MaterialRequest.requested_by), selectinload(MaterialRequest.items).selectinload(MaterialRequestItem.material)).where(MaterialRequest.id == request.id))


@router.patch("/material-requests/{item_id}", response_model=MaterialRequestOut, tags=["material requests"])
def update_material_request(item_id: int, payload: MaterialRequestUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> MaterialRequest:
    update_item(db, get_or_404(db, MaterialRequest, item_id), payload.model_dump(exclude_unset=True))
    return db.scalar(select(MaterialRequest).options(selectinload(MaterialRequest.construction_object), selectinload(MaterialRequest.requested_by), selectinload(MaterialRequest.items).selectinload(MaterialRequestItem.material)).where(MaterialRequest.id == item_id))


@router.get("/material-requests/{item_id}", response_model=MaterialRequestOut, tags=["material requests"])
def get_material_request(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> MaterialRequest:
    item = db.scalar(select(MaterialRequest).options(selectinload(MaterialRequest.construction_object), selectinload(MaterialRequest.requested_by), selectinload(MaterialRequest.items).selectinload(MaterialRequestItem.material)).where(MaterialRequest.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="MaterialRequest not found")
    return item


@router.delete("/material-requests/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["material requests"])
def delete_material_request(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> None:
    delete_item(db, get_or_404(db, MaterialRequest, item_id))


@router.get("/material-request-items", response_model=list[MaterialRequestItemOut], tags=["material requests"])
def list_material_request_items(material_request_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[MaterialRequestItem]:
    stmt = select(MaterialRequestItem).options(selectinload(MaterialRequestItem.material))
    if material_request_id:
        stmt = stmt.where(MaterialRequestItem.material_request_id == material_request_id)
    return list(db.scalars(stmt.order_by(MaterialRequestItem.id.desc())).all())


@router.post("/material-request-items", response_model=MaterialRequestItemOut, status_code=status.HTTP_201_CREATED, tags=["material requests"])
def create_material_request_item(payload: MaterialRequestItemCreate, material_request_id: int = Query(...), db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> MaterialRequestItem:
    data = payload.model_dump()
    data["material_request_id"] = data["material_request_id"] or material_request_id
    item = create_item(db, MaterialRequestItem, data)
    return db.scalar(select(MaterialRequestItem).options(selectinload(MaterialRequestItem.material)).where(MaterialRequestItem.id == item.id))


@router.patch("/material-request-items/{item_id}", response_model=MaterialRequestItemOut, tags=["material requests"])
def update_material_request_item(item_id: int, payload: MaterialRequestItemUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> MaterialRequestItem:
    update_item(db, get_or_404(db, MaterialRequestItem, item_id), payload.model_dump(exclude_unset=True))
    return db.scalar(select(MaterialRequestItem).options(selectinload(MaterialRequestItem.material)).where(MaterialRequestItem.id == item_id))


@router.delete("/material-request-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["material requests"])
def delete_material_request_item(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> None:
    delete_item(db, get_or_404(db, MaterialRequestItem, item_id))


@router.get("/expenses", response_model=list[ExpenseOut], tags=["expenses"])
def list_expenses(skip: int = 0, limit: int = 50, construction_object_id: int | None = None, category: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Expense]:
    stmt = select(Expense).options(selectinload(Expense.construction_object))
    if construction_object_id:
        stmt = stmt.where(Expense.construction_object_id == construction_object_id)
    if category:
        stmt = stmt.where(Expense.category == category)
    stmt = stmt.order_by(Expense.expense_date.desc()).offset(skip).limit(min(limit, 100))
    return list(db.scalars(stmt).all())


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED, tags=["expenses"])
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Expense:
    item = create_item(db, Expense, payload.model_dump())
    return db.scalar(select(Expense).options(selectinload(Expense.construction_object)).where(Expense.id == item.id))


@router.patch("/expenses/{item_id}", response_model=ExpenseOut, tags=["expenses"])
def update_expense(item_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Expense:
    update_item(db, get_or_404(db, Expense, item_id), payload.model_dump(exclude_unset=True))
    return db.scalar(select(Expense).options(selectinload(Expense.construction_object)).where(Expense.id == item_id))


@router.get("/expenses/{item_id}", response_model=ExpenseOut, tags=["expenses"])
def get_expense(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Expense:
    item = db.scalar(select(Expense).options(selectinload(Expense.construction_object)).where(Expense.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Expense not found")
    return item


@router.delete("/expenses/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["expenses"])
def delete_expense(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    delete_item(db, get_or_404(db, Expense, item_id))


@router.get("/dashboard/analytics", tags=["analytics"])
def dashboard_analytics(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    report_statuses = {"submitted": 0, "foreman_approved": 0, "admin_approved": 0, "rejected": 0, "change_requested": 0, "draft": 0}
    for raw_status, count in db.execute(select(DailyReport.status, func.count(DailyReport.id)).group_by(DailyReport.status)).all():
        report_statuses[normalize_report_status(raw_status)] = report_statuses.get(normalize_report_status(raw_status), 0) + count
    total_hours = float(db.scalar(select(func.coalesce(func.sum(DailyReport.worked_hours), 0))) or 0)
    active_objects = db.scalar(select(func.count(ConstructionObject.id)).where(ConstructionObject.status == "active")) or 0
    active_employees = db.scalar(select(func.count(Employee.id)).where(Employee.status == "active")) or 0
    expense_total = float(db.scalar(select(func.coalesce(func.sum(Expense.amount), 0))) or 0)
    hours_by_object = [
        {"object": name, "object_id": object_id, "hours": float(hours or 0)}
        for object_id, name, hours in db.execute(
            select(ConstructionObject.id, ConstructionObject.name, func.sum(DailyReport.worked_hours))
            .join(DailyReport, DailyReport.construction_object_id == ConstructionObject.id)
            .group_by(ConstructionObject.id, ConstructionObject.name)
            .order_by(func.sum(DailyReport.worked_hours).desc())
        ).all()
    ]
    object_progress = [
        {"object_id": object_id, "object": name, "progress_percent": float(progress or 0), "status": object_status}
        for object_id, name, progress, object_status in db.execute(
            select(ConstructionObject.id, ConstructionObject.name, ConstructionObject.progress_percent, ConstructionObject.status).order_by(ConstructionObject.name)
        ).all()
    ]
    return {
        "report_statuses": report_statuses,
        "total_hours": round(total_hours, 2),
        "active_objects": active_objects,
        "active_employees": active_employees,
        "expense_total": round(expense_total, 2),
        "hours_by_object": hours_by_object,
        "object_progress": object_progress,
        "expense_hint": "Витрати рахуються як сума записів expenses по об'єктах; години - сума звітів, а для payroll враховуються лише фінально погоджені звіти.",
    }


@router.get("/calendar/report-summary", tags=["calendar"])
def calendar_summary(date_from: date | None = None, date_to: date | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    stmt = select(DailyReport.report_date, DailyReport.status, func.count(DailyReport.id), func.sum(DailyReport.worked_hours)).group_by(DailyReport.report_date, DailyReport.status)
    if date_from:
        stmt = stmt.where(DailyReport.report_date >= date_from)
    if date_to:
        stmt = stmt.where(DailyReport.report_date <= date_to)
    stmt = stmt.order_by(DailyReport.report_date)
    return [
        {"date": row[0].isoformat(), "status": normalize_report_status(row[1]), "count": row[2], "hours": float(row[3] or 0)}
        for row in db.execute(stmt).all()
    ]


@router.get("/calendar/detailed", tags=["calendar"])
def calendar_detailed(date_from: date | None = None, date_to: date | None = None, construction_object_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    stmt = report_query(db)
    if date_from:
        stmt = stmt.where(DailyReport.report_date >= date_from)
    if date_to:
        stmt = stmt.where(DailyReport.report_date <= date_to)
    if construction_object_id:
        stmt = stmt.where(DailyReport.construction_object_id == construction_object_id)
    reports = list(db.scalars(stmt.order_by(DailyReport.report_date, DailyReport.id)).all())
    by_date: dict[str, dict] = {}
    for report in reports:
        key = report.report_date.isoformat()
        day = by_date.setdefault(
            key,
            {
                "date": key,
                "count": 0,
                "hours": 0.0,
                "draft_count": 0,
                "submitted_count": 0,
                "foreman_approved_count": 0,
                "admin_approved_count": 0,
                "rejected_count": 0,
                "change_requested_count": 0,
                "severity": "neutral",
                "reports": [],
            },
        )
        normalized_status = normalize_report_status(report.status)
        day["count"] += 1
        day["hours"] = round(day["hours"] + float(report.worked_hours or 0), 2)
        day[f"{normalized_status}_count"] = day.get(f"{normalized_status}_count", 0) + 1
        day["reports"].append(
            {
                "id": report.id,
                "report_number": report.report_number,
                "status": normalized_status,
                "employee": f"{report.employee.first_name} {report.employee.last_name}",
                "object": report.construction_object.name,
                "hours": float(report.worked_hours or 0),
                "description": report.work_description,
            }
        )
        day["severity"] = calendar_severity_for_statuses({entry["status"] for entry in day["reports"]})
    return list(by_date.values())


@router.get("/payroll/summary", response_model=PayrollSummaryOut, tags=["payroll"])
def payroll_summary(start_date: date, end_date: date, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    return build_payroll_summary(db, start_date, end_date)


@router.get("/payroll/export.csv", tags=["payroll"])
def payroll_export_csv(start_date: date, end_date: date, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> Response:
    summary = build_payroll_summary(db, start_date, end_date)
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["employee_id", "name", "position", "hourly_rate", "approved_hours", "total_payment", "reports_count", "pending_count", "rejected_count"])
    for row in summary["employees"]:
        writer.writerow([row["employee_id"], row["name"], row["position"], row["hourly_rate"], row["approved_hours"], row["total_payment"], row["reports_count"], row["pending_count"], row["rejected_count"]])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="builder-erp-payroll-{start_date.isoformat()}-{end_date.isoformat()}.csv"'},
    )
