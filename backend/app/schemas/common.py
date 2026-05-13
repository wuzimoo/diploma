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


class ConstructionObjectBase(BaseModel):
    name: str
    code: str
    city: str
    address: str
    client: str | None = None
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
    status: str
    start_date: date | None
    end_date: date | None
    budget: float | None


class AssignmentBase(BaseModel):
    employee_id: int
    construction_object_id: int
    role_on_object: str = "Працівник"
    start_date: date
    end_date: date | None = None
    is_active: bool = True


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    employee_id: int | None = None
    construction_object_id: int | None = None
    role_on_object: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class AssignmentOut(ORMModel):
    id: int
    employee_id: int
    construction_object_id: int
    role_on_object: str
    start_date: date
    end_date: date | None
    is_active: bool


class DailyReportBase(BaseModel):
    employee_id: int
    construction_object_id: int
    report_date: date
    start_time: time
    end_time: time
    break_minutes: int = Field(default=30, ge=0, le=240)
    worked_hours: float | None = None
    status: str = "open"
    work_description: str = Field(min_length=5)
    rejection_reason: str | None = None


class DailyReportCreate(DailyReportBase):
    report_number: str | None = None


class DailyReportUpdate(BaseModel):
    employee_id: int | None = None
    construction_object_id: int | None = None
    report_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    break_minutes: int | None = None
    worked_hours: float | None = None
    status: str | None = None
    work_description: str | None = None
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
    report_date: date
    start_time: time
    end_time: time
    break_minutes: int
    worked_hours: float
    status: str
    work_description: str
    rejection_reason: str | None
    employee: EmployeeOut
    construction_object: ConstructionObjectOut
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
