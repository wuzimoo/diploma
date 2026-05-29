from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleOut(ORMModel):
    id: int
    code: str
    name: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role_id: int | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)


class UserOut(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    role: RoleOut


class EmployeeBase(BaseModel):
    user_id: int | None = None
    first_name: str
    last_name: str
    position: str
    phone: str | None = None
    hourly_rate: float = 0
    status: str = "active"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    user_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    position: str | None = None
    phone: str | None = None
    hourly_rate: float | None = None
    status: str | None = None


class EmployeeOut(ORMModel):
    id: int
    user_id: int | None
    first_name: str
    last_name: str
    position: str
    phone: str | None
    hourly_rate: float
    status: str


class CrewMemberEmployeeOut(EmployeeOut):
    pass


class ConstructionObjectBase(BaseModel):
    name: str
    code: str
    city: str
    address: str
    client: str | None = None
    description: str | None = None
    work_scope: str | None = None
    site_manager: str | None = None
    priority: str = "normal"
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    progress_percent: float = Field(default=0, ge=0, le=100)
    status: str = "active"
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = None


class ConstructionObjectCreate(ConstructionObjectBase):
    pass


class ConstructionObjectUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    city: str | None = None
    address: str | None = None
    client: str | None = None
    description: str | None = None
    work_scope: str | None = None
    site_manager: str | None = None
    priority: str | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    progress_percent: float | None = Field(default=None, ge=0, le=100)
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = None


class ConstructionObjectOut(ORMModel):
    id: int
    name: str
    code: str
    city: str
    address: str
    client: str | None
    description: str | None
    work_scope: str | None
    site_manager: str | None
    priority: str
    planned_start_date: date | None
    planned_end_date: date | None
    actual_start_date: date | None
    actual_end_date: date | None
    progress_percent: float
    status: str
    start_date: date | None
    end_date: date | None
    budget: float | None


class AssignmentBase(BaseModel):
    employee_id: int
    construction_object_id: int
    crew_id: int | None = None
    role_on_object: str = "Працівник"
    start_date: date
    end_date: date | None = None
    is_active: bool = True


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    employee_id: int | None = None
    construction_object_id: int | None = None
    crew_id: int | None = None
    role_on_object: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class AssignmentOut(ORMModel):
    id: int
    employee_id: int
    construction_object_id: int
    crew_id: int | None
    role_on_object: str
    start_date: date
    end_date: date | None
    is_active: bool


class CrewBase(BaseModel):
    name: str
    specialization: str = "Загальнобудівельні роботи"
    foreman_employee_id: int | None = None
    current_object_id: int | None = None
    status: str = "active"
    notes: str | None = None


class CrewCreate(CrewBase):
    pass


class CrewUpdate(BaseModel):
    name: str | None = None
    specialization: str | None = None
    foreman_employee_id: int | None = None
    current_object_id: int | None = None
    status: str | None = None
    notes: str | None = None


class CrewMemberBase(BaseModel):
    crew_id: int
    employee_id: int
    role_in_crew: str = "Працівник"
    joined_at: date
    is_active: bool = True


class CrewMemberCreate(CrewMemberBase):
    pass


class CrewMemberUpdate(BaseModel):
    crew_id: int | None = None
    employee_id: int | None = None
    role_in_crew: str | None = None
    joined_at: date | None = None
    is_active: bool | None = None


class CrewMemberOut(ORMModel):
    id: int
    crew_id: int
    employee_id: int
    role_in_crew: str
    joined_at: date
    is_active: bool
    employee: EmployeeOut | None = None


class CrewOut(ORMModel):
    id: int
    name: str
    specialization: str
    foreman_employee_id: int | None
    current_object_id: int | None
    status: str
    notes: str | None
    current_object: ConstructionObjectOut | None = None
    foreman: EmployeeOut | None = None
    members: list[CrewMemberOut] = []


class WorkPlanItemBase(BaseModel):
    construction_object_id: int
    crew_id: int | None = None
    title: str
    description: str | None = None
    planned_volume: float = Field(default=0, ge=0)
    completed_volume: float = Field(default=0, ge=0)
    unit: str = "m2"
    status: str = "planned"
    planned_start: date | None = None
    planned_end: date | None = None
    priority: str = "normal"


class WorkPlanItemCreate(WorkPlanItemBase):
    pass


class WorkPlanItemUpdate(BaseModel):
    construction_object_id: int | None = None
    crew_id: int | None = None
    title: str | None = None
    description: str | None = None
    planned_volume: float | None = None
    completed_volume: float | None = None
    unit: str | None = None
    status: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    priority: str | None = None


class WorkPlanItemOut(ORMModel):
    id: int
    construction_object_id: int
    crew_id: int | None
    title: str
    description: str | None
    planned_volume: float
    completed_volume: float
    unit: str
    status: str
    planned_start: date | None
    planned_end: date | None
    priority: str


class DailyReportBase(BaseModel):
    employee_id: int
    construction_object_id: int
    work_plan_item_id: int | None = None
    report_date: date
    start_time: time
    end_time: time
    break_minutes: int = Field(default=30, ge=0, le=240)
    worked_hours: float | None = None
    status: str = "open"
    work_description: str = Field(min_length=5)
    completed_volume: float | None = Field(default=None, ge=0)
    media_note: str | None = None
    rejection_reason: str | None = None


class DailyReportCreate(DailyReportBase):
    report_number: str | None = None


class DailyReportUpdate(BaseModel):
    employee_id: int | None = None
    construction_object_id: int | None = None
    work_plan_item_id: int | None = None
    report_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    break_minutes: int | None = None
    worked_hours: float | None = None
    status: str | None = None
    work_description: str | None = None
    completed_volume: float | None = None
    media_note: str | None = None
    rejection_reason: str | None = None


class ReportPhotoBase(BaseModel):
    daily_report_id: int
    file_name: str
    file_url: str
    caption: str | None = None


class ReportPhotoCreate(ReportPhotoBase):
    pass


class ReportPhotoOut(ORMModel):
    id: int
    daily_report_id: int
    file_name: str
    file_url: str
    caption: str | None


class DailyReportOut(ORMModel):
    id: int
    report_number: str
    employee_id: int
    construction_object_id: int
    work_plan_item_id: int | None
    report_date: date
    start_time: time
    end_time: time
    break_minutes: int
    worked_hours: float
    status: str
    work_description: str
    completed_volume: float | None
    media_note: str | None
    rejection_reason: str | None
    employee: EmployeeOut
    construction_object: ConstructionObjectOut
    work_plan_item: WorkPlanItemOut | None = None
    photos: list[ReportPhotoOut] = []
    created_at: datetime


class ReportStatusUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None


class MaterialBase(BaseModel):
    sku: str
    name: str
    unit: str = "pcs"
    default_price: float = 0


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    unit: str | None = None
    default_price: float | None = None


class MaterialOut(ORMModel):
    id: int
    sku: str
    name: str
    unit: str
    default_price: float


class MaterialRequestItemBase(BaseModel):
    material_id: int
    quantity: float = Field(gt=0)
    estimated_price: float | None = None


class MaterialRequestItemCreate(MaterialRequestItemBase):
    material_request_id: int | None = None


class MaterialRequestItemUpdate(BaseModel):
    material_id: int | None = None
    quantity: float | None = None
    estimated_price: float | None = None


class MaterialRequestItemOut(ORMModel):
    id: int
    material_request_id: int
    material_id: int
    quantity: float
    estimated_price: float | None
    material: MaterialOut


class MaterialRequestCreate(BaseModel):
    construction_object_id: int
    requested_by_employee_id: int
    needed_by: date | None = None
    status: str = "open"
    comment: str | None = None
    request_number: str | None = None
    items: list[MaterialRequestItemBase] = []


class MaterialRequestUpdate(BaseModel):
    construction_object_id: int | None = None
    requested_by_employee_id: int | None = None
    needed_by: date | None = None
    status: str | None = None
    comment: str | None = None


class MaterialRequestOut(ORMModel):
    id: int
    request_number: str
    construction_object_id: int
    requested_by_employee_id: int
    needed_by: date | None
    status: str
    comment: str | None
    construction_object: ConstructionObjectOut
    requested_by: EmployeeOut
    items: list[MaterialRequestItemOut] = []


class ExpenseBase(BaseModel):
    construction_object_id: int
    expense_date: date
    category: str
    amount: float = Field(gt=0)
    description: str


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    construction_object_id: int | None = None
    expense_date: date | None = None
    category: str | None = None
    amount: float | None = None
    description: str | None = None


class ExpenseOut(ORMModel):
    id: int
    construction_object_id: int
    expense_date: date
    category: str
    amount: float
    description: str
    construction_object: ConstructionObjectOut


class ActiveAssignmentOut(BaseModel):
    employee: EmployeeOut
    assignment: AssignmentOut | None = None
    crew: CrewOut | None = None
    construction_object: ConstructionObjectOut | None = None
    work_plan_items: list[WorkPlanItemOut] = []


class ObjectSummaryOut(BaseModel):
    object: ConstructionObjectOut
    crews: list[CrewOut]
    employees: list[EmployeeOut]
    work_plan_items: list[WorkPlanItemOut]
    reports: list[DailyReportOut]
    report_statuses: dict[str, int]
    total_hours: float
    expense_total: float
    progress_percent: float
