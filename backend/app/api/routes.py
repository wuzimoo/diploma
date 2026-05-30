from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    ReportPhotoCreate,
    ReportPhotoOut,
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
    return list_query(db, Employee, skip=skip, limit=limit, search=search, search_fields=[Employee.first_name, Employee.last_name, Employee.position], filters={"status": status_filter})


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED, tags=["employees"])
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Employee:
    return create_item(db, Employee, payload.model_dump())


@router.get("/employees/{item_id}", response_model=EmployeeOut, tags=["employees"])
def get_employee(item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Employee:
    return get_or_404(db, Employee, item_id)


@router.patch("/employees/{item_id}", response_model=EmployeeOut, tags=["employees"])
def update_employee(item_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> Employee:
    return update_item(db, get_or_404(db, Employee, item_id), payload.model_dump(exclude_unset=True))


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


def report_query(db: Session):
    return select(DailyReport).options(selectinload(DailyReport.employee), selectinload(DailyReport.construction_object), selectinload(DailyReport.work_plan_item), selectinload(DailyReport.photos))


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
    if {"start_time", "end_time", "break_minutes"} & data.keys():
        start = data.get("start_time", item.start_time)
        end = data.get("end_time", item.end_time)
        pause = data.get("break_minutes", item.break_minutes)
        data["worked_hours"] = calculate_worked_hours(start, end, pause)
    update_item(db, item, data)
    return db.scalar(report_query(db).where(DailyReport.id == item_id))


@router.patch("/daily-reports/{item_id}/status", response_model=DailyReportOut, tags=["daily reports"])
def change_report_status(item_id: int, payload: ReportStatusUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> DailyReport:
    item = get_or_404(db, DailyReport, item_id)
    update_item(db, item, payload.model_dump(exclude_unset=True))
    return db.scalar(report_query(db).where(DailyReport.id == item_id))


@router.delete("/daily-reports/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["daily reports"])
def delete_report(item_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "foreman"))) -> None:
    delete_item(db, get_or_404(db, DailyReport, item_id))


@router.post("/report-photos", response_model=ReportPhotoOut, status_code=status.HTTP_201_CREATED, tags=["report photos"])
def create_photo_metadata(payload: ReportPhotoCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> ReportPhoto:
    return create_item(db, ReportPhoto, payload.model_dump())


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
    report_statuses = dict(db.execute(select(DailyReport.status, func.count(DailyReport.id)).group_by(DailyReport.status)).all())
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
        "expense_hint": "Витрати рахуються як сума записів expenses по об'єктах; години - сума погоджених і поточних daily reports.",
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
        {"date": row[0].isoformat(), "status": row[1], "count": row[2], "hours": float(row[3] or 0)}
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
        day = by_date.setdefault(key, {"date": key, "count": 0, "hours": 0.0, "open_count": 0, "review_count": 0, "approved_count": 0, "rejected_count": 0, "severity": "ok", "reports": []})
        day["count"] += 1
        day["hours"] = round(day["hours"] + float(report.worked_hours or 0), 2)
        day[f"{report.status}_count"] = day.get(f"{report.status}_count", 0) + 1
        if report.status in {"open", "review"}:
            day["severity"] = "warning"
        if report.status == "rejected":
            day["severity"] = "danger"
        day["reports"].append(
            {
                "id": report.id,
                "report_number": report.report_number,
                "status": report.status,
                "employee": f"{report.employee.first_name} {report.employee.last_name}",
                "object": report.construction_object.name,
                "hours": float(report.worked_hours or 0),
                "description": report.work_description,
            }
        )
    return list(by_date.values())
