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

export interface Employee {
  id: number;
  user_id?: number | null;
  first_name: string;
  last_name: string;
  position: string;
  phone?: string | null;
  hourly_rate: number;
  status: string;
}

export interface ConstructionObject {
  id: number;
  name: string;
  code: string;
  city: string;
  address: string;
  client?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
}

export interface ReportPhoto {
  id: number;
  daily_report_id: number;
  file_name: string;
  file_url: string;
  caption?: string | null;
}

export interface DailyReport {
  id: number;
  report_number: string;
  employee_id: number;
  construction_object_id: number;
  report_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  worked_hours: number;
  status: string;
  work_description: string;
  rejection_reason?: string | null;
  employee: Employee;
  construction_object: ConstructionObject;
  photos: ReportPhoto[];
  created_at: string;
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
  hours_by_object: { object: string; hours: number }[];
}

