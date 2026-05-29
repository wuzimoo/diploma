import { Page, Route } from "@playwright/test";

type RoleCode = "admin" | "foreman" | "worker";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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

let nextEmployeeId = 6;
let nextObjectId = 5;
let nextCrewId = 3;
let nextCrewMemberId = 5;
let nextPhotoId = 2;

const objects = [
  { id: 1, name: "Berlin Mitte - Haus A", code: "BER-MIT-A", city: "Berlin", address: "Invalidenstrasse 42, 10115 Berlin", client: "Mitte Bau GmbH", description: "Реконструкція житлового блоку з оновленням інженерних мереж.", work_scope: "Електрика, слабкострумні мережі, підготовка технічних приміщень.", site_manager: "Oleh Kovalenko", priority: "normal", planned_start_date: "2026-02-01", planned_end_date: "2026-07-30", actual_start_date: "2026-02-03", actual_end_date: null, progress_percent: 58, status: "active", start_date: "2026-02-01", end_date: null, budget: 420000 },
  { id: 2, name: "Berlin Ost - Neubau C", code: "BER-OST-C", city: "Berlin", address: "Frankfurter Allee 211, 10365 Berlin", client: "Ost Projekt AG", description: "Новий офісно-житловий корпус C з активною електромонтажною бригадою.", work_scope: "Кабельні траси, щитові, тимчасове живлення, сантехнічні підключення.", site_manager: "Oleh Kovalenko", priority: "high", planned_start_date: "2026-01-15", planned_end_date: "2026-09-15", actual_start_date: "2026-01-15", actual_end_date: null, progress_percent: 47, status: "active", start_date: "2026-01-15", end_date: null, budget: 680000 },
  { id: 3, name: "Potsdam - Halle 2", code: "POT-HAL-2", city: "Potsdam", address: "Babelsberger Str. 18, 14473 Potsdam", client: "Potsdam Logistic SE", description: "Логістична зала з монтажем металоконструкцій та основ.", work_scope: "Підготовка основи, металоконструкції, підключення інженерних ліній.", site_manager: "Jonas Klein", priority: "normal", planned_start_date: "2026-03-01", planned_end_date: "2026-08-20", actual_start_date: "2026-03-04", actual_end_date: null, progress_percent: 35, status: "active", start_date: "2026-03-01", end_date: null, budget: 310000 },
  { id: 4, name: "Brandenburg - Standort West", code: "BRB-WEST", city: "Brandenburg", address: "Magdeburger Landstr. 9, 14770 Brandenburg", client: "WestPark GmbH", description: "Планування промислової зони перед стартом робіт.", work_scope: "Обстеження, кошторис, підготовка графіка робіт.", site_manager: "Roman Schneider", priority: "low", planned_start_date: "2026-06-10", planned_end_date: "2026-11-30", actual_start_date: null, actual_end_date: null, progress_percent: 8, status: "planning", start_date: "2026-04-10", end_date: null, budget: 250000 }
];

const workPlanItems = [
  { id: 1, construction_object_id: 2, crew_id: 1, title: "Монтаж кабельних трас секція C", description: "Прокласти 180 м кабельних трас на 1-2 поверхах.", planned_volume: 180, completed_volume: 86, unit: "m", status: "in_progress", planned_start: "2026-05-01", planned_end: "2026-05-31", priority: "high" },
  { id: 2, construction_object_id: 2, crew_id: 1, title: "Щитові та тимчасове живлення", description: "Підготувати тимчасові щити та перевірити навантаження.", planned_volume: 6, completed_volume: 2, unit: "pcs", status: "in_progress", planned_start: "2026-05-10", planned_end: "2026-06-05", priority: "normal" },
  { id: 3, construction_object_id: 3, crew_id: 2, title: "Основа під металоконструкції", description: "Підготовка та розмітка основи під монтаж.", planned_volume: 420, completed_volume: 135, unit: "m2", status: "in_progress", planned_start: "2026-05-05", planned_end: "2026-06-12", priority: "normal" }
];

let crews: any[] = [
  { id: 1, name: "Бригада Elektro Ost", specialization: "Електромонтаж", foreman_employee_id: 2, current_object_id: 2, status: "active", notes: "Поточний об'єкт Berlin Ost", current_object: objects[1], foreman: employees[1], members: [
    { id: 1, crew_id: 1, employee_id: 2, role_in_crew: "Бригадир", joined_at: "2026-05-01", is_active: true, employee: employees[1] },
    { id: 2, crew_id: 1, employee_id: 3, role_in_crew: "Електромонтажник", joined_at: "2026-05-01", is_active: true, employee: employees[2] },
    { id: 3, crew_id: 1, employee_id: 5, role_in_crew: "Сантехнік", joined_at: "2026-05-03", is_active: true, employee: employees[4] }
  ] },
  { id: 2, name: "Бригада Montage Potsdam", specialization: "Монтажні роботи", foreman_employee_id: 4, current_object_id: 3, status: "active", notes: "Поточний об'єкт Potsdam Halle 2", current_object: objects[2], foreman: employees[3], members: [
    { id: 4, crew_id: 2, employee_id: 4, role_in_crew: "Бригадир", joined_at: "2026-05-04", is_active: true, employee: employees[3] }
  ] }
];

const baseReports: any[] = [
  {
    id: 31,
    report_number: "DR-2026-0031",
    employee_id: 3,
    construction_object_id: 1,
    work_plan_item_id: null,
    report_date: "2026-03-21",
    start_time: "08:00:00",
    end_time: "15:45:00",
    break_minutes: 0,
    worked_hours: 7.75,
    status: "review",
    work_description: "Змонтовано кабельні траси на 1-му поверсі, перевірено постачання матеріалів.",
    completed_volume: null,
    media_note: "1 файл(и): trasa-1.jpg",
    rejection_reason: null,
    employee: employees[2],
    construction_object: objects[0],
    work_plan_item: null,
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
    work_plan_item_id: 3,
    report_date: "2026-03-20",
    start_time: "07:20:00",
    end_time: "16:00:00",
    break_minutes: 30,
    worked_hours: 8.17,
    status: "open",
    work_description: "Підготовлено основу під монтаж металоконструкцій.",
    completed_volume: 22,
    media_note: null,
    rejection_reason: null,
    employee: employees[3],
    construction_object: objects[2],
    work_plan_item: workPlanItems[2],
    photos: [],
    created_at: "2026-03-20T17:30:00Z"
  },
  {
    id: 29,
    report_number: "DR-2026-0029",
    employee_id: 5,
    construction_object_id: 2,
    work_plan_item_id: 1,
    report_date: "2026-03-19",
    start_time: "08:10:00",
    end_time: "17:00:00",
    break_minutes: 20,
    worked_hours: 8.5,
    status: "approved",
    work_description: "Прокладено водопровідні лінії у секції C.",
    completed_volume: 14,
    media_note: null,
    rejection_reason: null,
    employee: employees[4],
    construction_object: objects[1],
    work_plan_item: workPlanItems[0],
    photos: [],
    created_at: "2026-03-19T17:20:00Z"
  }
];
let reports: any[] = clone(baseReports);

const analytics = {
  report_statuses: { open: 1, review: 1, approved: 1, rejected: 0 },
  total_hours: 24.42,
  active_objects: 3,
  active_employees: 5,
  expense_total: 1046.5,
  hours_by_object: [
    { object: "Berlin Mitte - Haus A", object_id: 1, hours: 7.75 },
    { object: "Berlin Ost - Neubau C", object_id: 2, hours: 8.5 },
    { object: "Potsdam - Halle 2", object_id: 3, hours: 8.17 }
  ],
  object_progress: [
    { object: "Berlin Mitte - Haus A", object_id: 1, progress_percent: 58, status: "active" },
    { object: "Berlin Ost - Neubau C", object_id: 2, progress_percent: 47, status: "active" },
    { object: "Potsdam - Halle 2", object_id: 3, progress_percent: 35, status: "active" }
  ],
  expense_hint: "Витрати рахуються як сума записів expenses по об'єктах; години - сума погоджених і поточних daily reports."
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
  reports = clone(baseReports);
  nextPhotoId = 2;

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
    if (path === "/me/active-assignment") {
      return json(route, {
        employee: employees[2],
        assignment: { id: 1, employee_id: 3, construction_object_id: 2, crew_id: 1, role_on_object: "Електромонтажник", start_date: "2026-05-01", end_date: null, is_active: true },
        crew: crews[0],
        construction_object: objects[1],
        work_plan_items: workPlanItems.filter((item) => item.construction_object_id === 2)
      });
    }
    if (path === "/employees" && request.method() === "GET") return json(route, employees);
    if (path === "/employees" && request.method() === "POST") {
      const data = request.postDataJSON();
      const created = { id: nextEmployeeId++, user_id: null, ...data };
      employees.push(created);
      return json(route, created, 201);
    }
    if (path === "/objects" && request.method() === "GET") return json(route, objects);
    if (path === "/objects" && request.method() === "POST") {
      const data = request.postDataJSON();
      const created = { id: nextObjectId++, actual_start_date: null, actual_end_date: null, site_manager: null, ...data };
      objects.push(created);
      return json(route, created, 201);
    }
    if (path === "/crews" && request.method() === "GET") return json(route, crews);
    if (path === "/crews" && request.method() === "POST") {
      const data = request.postDataJSON();
      const created = {
        id: nextCrewId++,
        ...data,
        notes: data.notes || null,
        current_object: objects.find((object) => object.id === data.current_object_id) || null,
        foreman: employees.find((employee) => employee.id === data.foreman_employee_id) || null,
        members: []
      };
      crews = [created, ...crews];
      return json(route, created, 201);
    }
    if (path === "/crew-members" && request.method() === "POST") {
      const data = request.postDataJSON();
      const created = { id: nextCrewMemberId++, ...data, employee: employees.find((employee) => employee.id === data.employee_id) || null };
      crews = crews.map((crew) => crew.id === data.crew_id ? { ...crew, members: [...crew.members, created] } : crew);
      return json(route, created, 201);
    }
    if (path === "/work-plan-items") return json(route, workPlanItems);
    if (path === "/calendar/report-summary") {
      return json(route, [
        { date: "2026-03-19", status: "approved", count: 1, hours: 8.5 },
        { date: "2026-03-20", status: "open", count: 1, hours: 8.17 },
        { date: "2026-03-21", status: "review", count: 1, hours: 7.75 }
      ]);
    }
    if (path === "/calendar/detailed") {
      return json(route, [
        { date: "2026-05-28", count: 1, hours: 8.17, open_count: 1, review_count: 0, approved_count: 0, rejected_count: 0, severity: "warning", reports: [{ id: 30, report_number: "DR-2026-0030", status: "open", employee: "Jonas Klein", object: "Potsdam - Halle 2", hours: 8.17, description: "Підготовлено основу під монтаж металоконструкцій." }] },
        { date: "2026-05-29", count: 1, hours: 7.75, open_count: 0, review_count: 1, approved_count: 0, rejected_count: 0, severity: "warning", reports: [{ id: 31, report_number: "DR-2026-0031", status: "review", employee: "Markus Meyer", object: "Berlin Ost - Neubau C", hours: 7.75, description: "Змонтовано кабельні траси на 1-му поверсі." }] }
      ]);
    }

    const objectSummaryMatch = path.match(/^\/objects\/(\d+)\/summary$/);
    if (objectSummaryMatch) {
      const objectId = Number(objectSummaryMatch[1]);
      const object = objects.find((item) => item.id === objectId) || objects[1];
      const objectReports = reports.filter((report) => report.construction_object_id === objectId);
      const objectCrews = crews.filter((crew) => crew.current_object_id === objectId);
      const objectEmployees = objectCrews.flatMap((crew) => crew.members.map((member) => member.employee)).filter(Boolean);
      return json(route, {
        object,
        crews: objectCrews,
        employees: objectEmployees,
        work_plan_items: workPlanItems.filter((item) => item.construction_object_id === objectId),
        reports: objectReports.length ? objectReports : reports.slice(0, 2),
        report_statuses: { open: 1, review: 1, approved: 1, rejected: 0 },
        total_hours: objectReports.reduce((total, report) => total + report.worked_hours, 0),
        expense_total: objectId === 2 ? 620.5 : 426,
        progress_percent: object.progress_percent
      });
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
        work_plan_item_id: data.work_plan_item_id,
        report_date: data.report_date,
        start_time: `${data.start_time}:00`,
        end_time: `${data.end_time}:00`,
        break_minutes: data.break_minutes,
        worked_hours: data.worked_hours,
        status: data.status,
        work_description: data.work_description,
        completed_volume: data.completed_volume,
        media_note: data.media_note,
        rejection_reason: null,
        employee: employees.find((employee) => employee.id === data.employee_id) || employees[2],
        construction_object: objects.find((object) => object.id === data.construction_object_id) || objects[0],
        work_plan_item: workPlanItems.find((item) => item.id === data.work_plan_item_id) || null,
        photos: [],
        created_at: "2026-05-13T13:00:00Z"
      };
      reports = [created, ...reports];
      return json(route, created, 201);
    }

    if (path === "/report-photos" && request.method() === "POST") {
      const data = request.postDataJSON();
      const created = { id: nextPhotoId++, ...data };
      reports = reports.map((report) => report.id === data.daily_report_id ? { ...report, photos: [...report.photos, created] } : report);
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
