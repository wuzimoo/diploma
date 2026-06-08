export type RoleCode = "admin" | "foreman" | "worker";

export interface Role {
  id: number;
  code: RoleCode;
  name: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  role: Role;
}

export interface UserAccess extends User {}

export interface Employee {
  id: number;
  user_id?: number | null;
  first_name: string;
  last_name: string;
  position: string;
  phone?: string | null;
  hourly_rate: number;
  status: string;
  user?: UserAccess | null;
}

export interface ConstructionObject {
  id: number;
  name: string;
  code: string;
  city: string;
  address: string;
  client?: string | null;
  description?: string | null;
  work_scope?: string | null;
  site_manager?: string | null;
  priority: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  progress_percent: number;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
}

export interface Assignment {
  id: number;
  employee_id: number;
  construction_object_id: number;
  crew_id?: number | null;
  role_on_object: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
}

export interface CrewMember {
  id: number;
  crew_id: number;
  employee_id: number;
  role_in_crew: string;
  joined_at: string;
  is_active: boolean;
  employee?: Employee;
}

export interface Crew {
  id: number;
  name: string;
  specialization: string;
  foreman_employee_id?: number | null;
  current_object_id?: number | null;
  status: string;
  notes?: string | null;
  current_object?: ConstructionObject | null;
  foreman?: Employee | null;
  members: CrewMember[];
}

export interface WorkPlanItem {
  id: number;
  construction_object_id: number;
  crew_id?: number | null;
  title: string;
  description?: string | null;
  planned_volume: number;
  completed_volume: number;
  unit: string;
  status: string;
  planned_start?: string | null;
  planned_end?: string | null;
  priority: string;
}

export interface ReportPhoto {
  id: number;
  daily_report_id: number;
  file_name: string;
  file_url: string;
  caption?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
}

export interface DailyReport {
  id: number;
  report_number: string;
  employee_id: number;
  construction_object_id: number;
  work_plan_item_id?: number | null;
  report_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  worked_hours: number;
  status: string;
  work_description: string;
  completed_volume?: number | null;
  media_note?: string | null;
  rejection_reason?: string | null;
  foreman_reviewed_by_user_id?: number | null;
  foreman_reviewed_at?: string | null;
  admin_reviewed_by_user_id?: number | null;
  admin_reviewed_at?: string | null;
  employee: Employee;
  construction_object: ConstructionObject;
  work_plan_item?: WorkPlanItem | null;
  photos: ReportPhoto[];
  created_at: string;
}

export interface ReportComment {
  id: number;
  report_id: number;
  user_id: number;
  body: string;
  created_at: string;
  author: UserAccess;
}

export interface ReportActivityItem {
  id: string;
  kind: "comment" | "event";
  title: string;
  body?: string | null;
  tone: "neutral" | "success" | "warning" | "danger";
  created_at: string;
  author?: UserAccess | null;
}

export interface Material {
  id: number;
  sku: string;
  name: string;
  unit: string;
  default_price: number;
}

export interface Analytics {
  report_statuses: Record<string, number>;
  total_hours: number;
  active_objects: number;
  active_employees: number;
  expense_total: number;
  hours_by_object: { object: string; object_id: number; hours: number }[];
  object_progress: { object: string; object_id: number; progress_percent: number; status: string }[];
  expense_hint: string;
}

export interface ActiveAssignment {
  employee: Employee;
  assignment?: Assignment | null;
  crew?: Crew | null;
  construction_object?: ConstructionObject | null;
  work_plan_items: WorkPlanItem[];
}

export interface ObjectSummary {
  object: ConstructionObject;
  crews: Crew[];
  employees: Employee[];
  work_plan_items: WorkPlanItem[];
  reports: DailyReport[];
  report_statuses: Record<string, number>;
  total_hours: number;
  expense_total: number;
  progress_percent: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  hours: number;
  draft_count: number;
  submitted_count: number;
  foreman_approved_count: number;
  admin_approved_count: number;
  rejected_count: number;
  change_requested_count: number;
  severity: "neutral" | "ok" | "warning" | "danger";
  reports: {
    id: number;
    report_number: string;
    status: string;
    employee: string;
    object: string;
    hours: number;
    description: string;
  }[];
}

export interface PayrollReport {
  id: number;
  report_number: string;
  report_date: string;
  worked_hours: number;
  status: string;
  construction_object_name: string;
  description: string;
}

export interface PayrollEmployeeSummary {
  employee_id: number;
  name: string;
  position: string;
  hourly_rate: number;
  approved_hours: number;
  total_payment: number;
  reports_count: number;
  pending_count: number;
  rejected_count: number;
  reports: PayrollReport[];
}

export interface PayrollSummary {
  start_date: string;
  end_date: string;
  employees: PayrollEmployeeSummary[];
}

export interface SearchResultEmployee {
  id: number;
  label: string;
  subtitle: string;
}

export interface SearchResultObject {
  id: number;
  label: string;
  subtitle: string;
}

export interface SearchResultReport {
  id: number;
  label: string;
  subtitle: string;
  status: string;
}

export interface SearchResults {
  employees: SearchResultEmployee[];
  objects: SearchResultObject[];
  reports: SearchResultReport[];
}
