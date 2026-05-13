import { Page, Route } from "@playwright/test";

type RoleCode = "admin" | "foreman" | "worker";

const roles = {
  admin: { id: 1, code: "admin", name: "Керівник компанії" },
  foreman: { id: 2, code: "foreman", name: "Бригадир / керівник проєкту" },
  worker: { id: 3, code: "worker", name: "Працівник" }
} as const;

const users = {
  admin: { id: 1, email: "admin@romans-erp.demo", full_name: "Roman Schneider", is_active: true, role: roles.admin },
  foreman: { id: 2, email: "foreman@romans-erp.demo", full_name: "Oleh Kovalenko", is_active: true, role: roles.foreman },
  worker: { id: 3, email: "worker@romans-erp.demo", full_name: "Markus Meyer", is_active: true, role: roles.worker }
};

const employees = [
  { id: 1, user_id: 1, first_name: "Roman", last_name: "Schneider", position: "Керівник компанії", phone: "+49 30 1000001", hourly_rate: 0, status: "active" },
  { id: 2, user_id: 2, first_name: "Oleh", last_name: "Kovalenko", position: "Бригадир", phone: "+49 30 1000002", hourly_rate: 36, status: "active" },
  { id: 3, user_id: 3, first_name: "Markus", last_name: "Meyer", position: "Електромонтажник", phone: "+49 30 1000003", hourly_rate: 28, status: "active" },
  { id: 4, user_id: null, first_name: "Jonas", last_name: "Klein", position: "Монтажник", phone: "+49 331 1000004", hourly_rate: 27, status: "active" },
  { id: 5, user_id: null, first_name: "Leon", last_name: "Schulz", position: "Сантехнік", phone: "+49 30 1000005", hourly_rate: 29, status: "active" }
];

const objects = [
  { id: 1, name: "Berlin Mitte - Haus A", code: "BER-MIT-A", city: "Berlin", address: "Invalidenstrasse 42, 10115 Berlin", client: "Mitte Bau GmbH", status: "active", start_date: "2026-02-01", end_date: null, budget: 420000 },
  { id: 2, name: "Berlin Ost - Neubau C", code: "BER-OST-C", city: "Berlin", address: "Frankfurter Allee 211, 10365 Berlin", client: "Ost Projekt AG", status: "active", start_date: "2026-01-15", end_date: null, budget: 680000 },
  { id: 3, name: "Potsdam - Halle 2", code: "POT-HAL-2", city: "Potsdam", address: "Babelsberger Str. 18, 14473 Potsdam", client: "Potsdam Logistic SE", status: "active", start_date: "2026-03-01", end_date: null, budget: 310000 },
  { id: 4, name: "Brandenburg - Standort West", code: "BRB-WEST", city: "Brandenburg", address: "Magdeburger Landstr. 9, 14770 Brandenburg", client: "WestPark GmbH", status: "planning", start_date: "2026-04-10", end_date: null, budget: 250000 }
];

let reports = [
  {
    id: 31,
    report_number: "DR-2026-0031",
    employee_id: 3,
    construction_object_id: 1,
    report_date: "2026-03-21",
    start_time: "08:00:00",
    end_time: "15:45:00",
    break_minutes: 0,
    worked_hours: 7.75,
    status: "review",
    work_description: "Змонтовано кабельні траси на 1-му поверсі, перевірено постачання матеріалів.",
    rejection_reason: null,
    employee: employees[2],
    construction_object: objects[0],
    photos: [
      { id: 1, daily_report_id: 31, file_name: "trasa-1.jpg", file_url: "https://placehold.co/900x650", caption: "Траса, 1-й поверх" }
    ],
    created_at: "2026-03-21T18:10:00Z"
  },
  {
    id: 30,
    report_number: "DR-2026-0030",
    employee_id: 4,
    construction_object_id: 3,
    report_date: "2026-03-20",
    start_time: "07:20:00",
    end_time: "16:00:00",
    break_minutes: 30,
    worked_hours: 8.17,
    status: "open",
    work_description: "Підготовлено основу під монтаж металоконструкцій.",
    rejection_reason: null,
    employee: employees[3],
    construction_object: objects[2],
    photos: [],
    created_at: "2026-03-20T17:30:00Z"
  },
  {
    id: 29,
    report_number: "DR-2026-0029",
    employee_id: 5,
    construction_object_id: 2,
    report_date: "2026-03-19",
    start_time: "08:10:00",
    end_time: "17:00:00",
    break_minutes: 20,
    worked_hours: 8.5,
    status: "approved",
    work_description: "Прокладено водопровідні лінії у секції C.",
    rejection_reason: null,
    employee: employees[4],
    construction_object: objects[1],
    photos: [],
    created_at: "2026-03-19T17:20:00Z"
  }
];

const analytics = {
  report_statuses: { open: 1, review: 1, approved: 1, rejected: 0 },
  total_hours: 24.42,
  active_objects: 3,
  active_employees: 5,
  expense_total: 1046.5,
  hours_by_object: [
    { object: "Berlin Mitte - Haus A", hours: 7.75 },
    { object: "Berlin Ost - Neubau C", hours: 8.5 },
    { object: "Potsdam - Halle 2", hours: 8.17 }
  ]
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

function roleFromEmail(email: string): RoleCode {
  if (email.startsWith("admin")) return "admin";
  if (email.startsWith("foreman")) return "foreman";
  return "worker";
}

export async function installMockApi(page: Page) {
  let currentRole: RoleCode = "worker";
  reports = reports.map((report) => ({ ...report }));

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/login" && request.method() === "POST") {
      const body = request.postData() || "";
      const email = new URLSearchParams(body).get("username") || "worker@romans-erp.demo";
      currentRole = roleFromEmail(email);
      return json(route, { access_token: `test-token-${currentRole}`, token_type: "bearer" });
    }

    if (path === "/auth/me") return json(route, users[currentRole]);
    if (path === "/dashboard/analytics") return json(route, analytics);
    if (path === "/employees") return json(route, employees);
    if (path === "/objects") return json(route, objects);
    if (path === "/calendar/report-summary") {
      return json(route, [
        { date: "2026-03-19", status: "approved", count: 1, hours: 8.5 },
        { date: "2026-03-20", status: "open", count: 1, hours: 8.17 },
        { date: "2026-03-21", status: "review", count: 1, hours: 7.75 }
      ]);
    }

    if (path === "/daily-reports" && request.method() === "GET") {
      const status = url.searchParams.get("status_filter");
      const search = url.searchParams.get("search")?.toLowerCase();
      let result = reports;
      if (status) result = result.filter((report) => report.status === status);
      if (search) result = result.filter((report) => report.work_description.toLowerCase().includes(search));
      return json(route, result);
    }

    if (path === "/daily-reports" && request.method() === "POST") {
      const data = request.postDataJSON();
      const created = {
        id: 99,
        report_number: "DR-2026-0099",
        employee_id: data.employee_id,
        construction_object_id: data.construction_object_id,
        report_date: data.report_date,
        start_time: `${data.start_time}:00`,
        end_time: `${data.end_time}:00`,
        break_minutes: data.break_minutes,
        worked_hours: data.worked_hours,
        status: data.status,
        work_description: data.work_description,
        rejection_reason: null,
        employee: employees.find((employee) => employee.id === data.employee_id) || employees[2],
        construction_object: objects.find((object) => object.id === data.construction_object_id) || objects[0],
        photos: [],
        created_at: "2026-05-13T13:00:00Z"
      };
      reports = [created, ...reports];
      return json(route, created, 201);
    }

    const reportMatch = path.match(/^\/daily-reports\/(\d+)$/);
    if (reportMatch && request.method() === "GET") {
      return json(route, reports.find((report) => report.id === Number(reportMatch[1])) || reports[0]);
    }

    const statusMatch = path.match(/^\/daily-reports\/(\d+)\/status$/);
    if (statusMatch && request.method() === "PATCH") {
      const id = Number(statusMatch[1]);
      const patch = request.postDataJSON();
      reports = reports.map((report) => (report.id === id ? { ...report, ...patch } : report));
      return json(route, reports.find((report) => report.id === id));
    }

    return json(route, { detail: `Unhandled mock route ${request.method()} ${path}` }, 404);
  });
}

