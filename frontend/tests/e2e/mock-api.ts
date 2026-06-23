import { Page, Route } from "@playwright/test";

type RoleCode = "admin" | "foreman" | "worker";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const roles = {
  admin: { id: 1, code: "admin", name: "Geschaftsfuhrung" },
  foreman: { id: 2, code: "foreman", name: "Polier / Bauleitung" },
  worker: { id: 3, code: "worker", name: "Mitarbeiter" },
} as const;

const usersByEmail = new Map<string, any>([
  ["admin@baupilot.demo", { id: 1, email: "admin@baupilot.demo", full_name: "Roman Schneider", is_active: true, role: roles.admin }],
  ["foreman@baupilot.demo", { id: 2, email: "foreman@baupilot.demo", full_name: "Oleh Kovalenko", is_active: true, role: roles.foreman }],
  ["worker@baupilot.demo", { id: 3, email: "worker@baupilot.demo", full_name: "Markus Meyer", is_active: true, role: roles.worker }],
]);

let nextUserId = 10;
let nextEmployeeId = 7;
let nextReportId = 120;
let nextCommentId = 20;
let nextCrewId = 4;
let nextCrewMemberId = 10;
let nextPhotoId = 50;

const employeesBase = [
  {
    id: 1,
    user_id: 1,
    first_name: "Roman",
    last_name: "Schneider",
    position: "Geschaftsfuhrung",
    phone: "+49 30 1000001",
    hourly_rate: 0,
    status: "active",
    user: usersByEmail.get("admin@baupilot.demo"),
  },
  {
    id: 2,
    user_id: 2,
    first_name: "Oleh",
    last_name: "Kovalenko",
    position: "Polier",
    phone: "+49 30 1000002",
    hourly_rate: 36,
    status: "active",
    user: usersByEmail.get("foreman@baupilot.demo"),
  },
  {
    id: 3,
    user_id: 3,
    first_name: "Markus",
    last_name: "Meyer",
    position: "Elektrofachkraft",
    phone: "+49 30 1000003",
    hourly_rate: 28,
    status: "active",
    user: usersByEmail.get("worker@baupilot.demo"),
  },
  {
    id: 4,
    user_id: null,
    first_name: "Jonas",
    last_name: "Klein",
    position: "Monteur",
    phone: "+49 331 1000004",
    hourly_rate: 27,
    status: "active",
    user: null,
  },
  {
    id: 5,
    user_id: null,
    first_name: "Leon",
    last_name: "Schulz",
    position: "Sanitarinstallateur",
    phone: "+49 30 1000005",
    hourly_rate: 29,
    status: "active",
    user: null,
  },
  {
    id: 6,
    user_id: null,
    first_name: "Sofia",
    last_name: "Weber",
    position: "Kalkulation",
    phone: "+49 30 1000006",
    hourly_rate: 32,
    status: "active",
    user: null,
  },
];

const objects = [
  { id: 1, name: "Berlin Mitte - Haus A", code: "BER-MIT-A", city: "Berlin", address: "Invalidenstrasse 42, 10115 Berlin", client: "Mitte Bau GmbH", description: "Sanierung eines Wohngebaudes mit modernisierten technischen Netzen.", work_scope: "Elektroinstallation, Schwachstrom und Vorbereitung technischer Raume.", site_manager: "Oleh Kovalenko", priority: "normal", planned_start_date: "2026-02-01", planned_end_date: "2026-07-30", actual_start_date: "2026-02-03", actual_end_date: null, progress_percent: 58, status: "active", start_date: "2026-02-01", end_date: null, budget: 420000 },
  { id: 2, name: "Berlin Ost - Neubau C", code: "BER-OST-C", city: "Berlin", address: "Frankfurter Allee 211, 10365 Berlin", client: "Ost Projekt AG", description: "Neuer Wohn- und Gewerbebau C mit aktivem Elektroteam.", work_scope: "Kabeltrassen, Verteilungen, Baustrom und Sanitaranschlusse.", site_manager: "Oleh Kovalenko", priority: "high", planned_start_date: "2026-01-15", planned_end_date: "2026-09-15", actual_start_date: "2026-01-15", actual_end_date: null, progress_percent: 47, status: "active", start_date: "2026-01-15", end_date: null, budget: 680000 },
  { id: 3, name: "Potsdam - Halle 2", code: "POT-HAL-2", city: "Potsdam", address: "Babelsberger Str. 18, 14473 Potsdam", client: "Potsdam Logistic SE", description: "Logistikhalle mit Stahlmontage und vorbereitenden Fundamentarbeiten.", work_scope: "Untergrundvorbereitung, Stahlkonstruktion und technische Anschlusse.", site_manager: "Jonas Klein", priority: "normal", planned_start_date: "2026-03-01", planned_end_date: "2026-08-20", actual_start_date: "2026-03-04", actual_end_date: null, progress_percent: 35, status: "active", start_date: "2026-03-01", end_date: null, budget: 310000 },
  { id: 4, name: "Brandenburg - Standort West", code: "BRB-WEST", city: "Brandenburg", address: "Magdeburger Landstr. 9, 14770 Brandenburg", client: "WestPark GmbH", description: "Planung eines Industriestandorts vor Baubeginn.", work_scope: "Bestandsaufnahme, Kalkulation und Terminplanung.", site_manager: "Roman Schneider", priority: "low", planned_start_date: "2026-06-10", planned_end_date: "2026-11-30", actual_start_date: null, actual_end_date: null, progress_percent: 8, status: "planning", start_date: "2026-04-10", end_date: null, budget: 250000 },
];

const workPlanItems = [
  { id: 1, construction_object_id: 2, crew_id: 1, title: "Kabeltrassen Montage Abschnitt C", description: "180 m Kabeltrassen im 1. und 2. Obergeschoss verlegen.", planned_volume: 180, completed_volume: 86, unit: "m", status: "in_progress", planned_start: "2026-05-01", planned_end: "2026-05-31", priority: "high" },
  { id: 2, construction_object_id: 2, crew_id: 1, title: "Verteilungen und Baustrom", description: "Baustromverteiler vorbereiten und Lasten prufen.", planned_volume: 6, completed_volume: 2, unit: "pcs", status: "in_progress", planned_start: "2026-05-10", planned_end: "2026-06-05", priority: "normal" },
  { id: 3, construction_object_id: 3, crew_id: 2, title: "Grundlage fur Stahlkonstruktion", description: "Untergrund vorbereiten und Montageachsen einmessen.", planned_volume: 420, completed_volume: 135, unit: "m2", status: "in_progress", planned_start: "2026-05-05", planned_end: "2026-06-12", priority: "normal" },
];

let crewsBase: any[] = [
  {
    id: 1,
    name: "Team Elektro Ost",
    specialization: "Elektroinstallation",
    foreman_employee_id: 2,
    current_object_id: 2,
    status: "active",
    notes: "Aktuelles Projekt Berlin Ost",
    current_object: objects[1],
    foreman: employeesBase[1],
    members: [
      { id: 1, crew_id: 1, employee_id: 2, role_in_crew: "Polier", joined_at: "2026-05-01", is_active: true, employee: employeesBase[1] },
      { id: 2, crew_id: 1, employee_id: 3, role_in_crew: "Elektrofachkraft", joined_at: "2026-05-01", is_active: true, employee: employeesBase[2] },
      { id: 3, crew_id: 1, employee_id: 5, role_in_crew: "Sanitarinstallateur", joined_at: "2026-05-03", is_active: true, employee: employeesBase[4] },
    ],
  },
  {
    id: 2,
    name: "Team Montage Potsdam",
    specialization: "Montagearbeiten",
    foreman_employee_id: 2,
    current_object_id: 3,
    status: "active",
    notes: "Aktuelles Projekt Potsdam Halle 2",
    current_object: objects[2],
    foreman: employeesBase[1],
    members: [
      { id: 4, crew_id: 2, employee_id: 4, role_in_crew: "Monteur", joined_at: "2026-05-04", is_active: true, employee: employeesBase[3] },
    ],
  },
];

const baseReports = [
  {
    id: 31,
    report_number: "DR-2026-0031",
    employee_id: 3,
    construction_object_id: 2,
    work_plan_item_id: 1,
    report_date: "2026-05-29",
    start_time: "08:00:00",
    end_time: "16:15:00",
    break_minutes: 30,
    worked_hours: 7.75,
    status: "submitted",
    work_description: "Kabeltrassen im 1. Obergeschoss montiert und Materiallieferung gepruft.",
    completed_volume: 12,
    media_note: "1 Datei(en): trasa-1.jpg",
    rejection_reason: null,
    foreman_reviewed_by_user_id: null,
    foreman_reviewed_at: null,
    admin_reviewed_by_user_id: null,
    admin_reviewed_at: null,
    photos: [{ id: 1, daily_report_id: 31, file_name: "trasa-1.jpg", file_url: "https://placehold.co/900x650", caption: "Trasse, 1. Obergeschoss" }],
    created_at: "2026-05-29T16:15:00Z",
  },
  {
    id: 30,
    report_number: "DR-2026-0030",
    employee_id: 4,
    construction_object_id: 3,
    work_plan_item_id: 3,
    report_date: "2026-05-28",
    start_time: "07:20:00",
    end_time: "16:00:00",
    break_minutes: 30,
    worked_hours: 8.17,
    status: "foreman_approved",
    work_description: "Grundlage fur die Stahlmontage vorbereitet.",
    completed_volume: 22,
    media_note: null,
    rejection_reason: null,
    foreman_reviewed_by_user_id: 2,
    foreman_reviewed_at: "2026-05-28T17:30:00Z",
    admin_reviewed_by_user_id: null,
    admin_reviewed_at: null,
    photos: [],
    created_at: "2026-05-28T17:00:00Z",
  },
  {
    id: 29,
    report_number: "DR-2026-0029",
    employee_id: 5,
    construction_object_id: 2,
    work_plan_item_id: 2,
    report_date: "2026-05-20",
    start_time: "08:10:00",
    end_time: "17:00:00",
    break_minutes: 20,
    worked_hours: 8.5,
    status: "admin_approved",
    work_description: "Wasserleitungen in Abschnitt C verlegt.",
    completed_volume: 14,
    media_note: null,
    rejection_reason: null,
    foreman_reviewed_by_user_id: 2,
    foreman_reviewed_at: "2026-05-20T16:50:00Z",
    admin_reviewed_by_user_id: 1,
    admin_reviewed_at: "2026-05-21T09:15:00Z",
    photos: [],
    created_at: "2026-05-20T17:20:00Z",
  },
  {
    id: 28,
    report_number: "DR-2026-0028",
    employee_id: 3,
    construction_object_id: 2,
    work_plan_item_id: 1,
    report_date: "2026-06-02",
    start_time: "07:30:00",
    end_time: "16:00:00",
    break_minutes: 30,
    worked_hours: 8.0,
    status: "change_requested",
    work_description: "Baustrombeleuchtung angeschlossen und Kabelgruppen markiert.",
    completed_volume: 8,
    media_note: null,
    rejection_reason: "Bitte Fotos und Mengenangabe konkretisieren.",
    foreman_reviewed_by_user_id: 2,
    foreman_reviewed_at: "2026-06-02T17:10:00Z",
    admin_reviewed_by_user_id: null,
    admin_reviewed_at: null,
    photos: [],
    created_at: "2026-06-02T16:55:00Z",
  },
];

const commentsBase: Record<number, any[]> = {
  31: [
    { id: 11, report_id: 31, user_id: 3, body: "Fotos nachgereicht und Kabelgruppen aktualisiert.", created_at: "2026-05-29T16:20:00Z", author: usersByEmail.get("worker@baupilot.demo") },
  ],
  30: [
    { id: 12, report_id: 30, user_id: 2, body: "Vor Ort gepruft und an die Verwaltung uebergeben.", created_at: "2026-05-28T17:35:00Z", author: usersByEmail.get("foreman@baupilot.demo") },
  ],
  29: [
    { id: 13, report_id: 29, user_id: 1, body: "Final fur die Lohnabrechnung freigegeben.", created_at: "2026-05-21T09:20:00Z", author: usersByEmail.get("admin@baupilot.demo") },
  ],
};

function normalizeReport(report: any, employees: any[]) {
  return {
    ...report,
    employee: employees.find((employee) => employee.id === report.employee_id),
    construction_object: objects.find((object) => object.id === report.construction_object_id),
    work_plan_item: workPlanItems.find((item) => item.id === report.work_plan_item_id) || null,
    photos: report.photos || [],
  };
}

function buildCalendarRows(reports: any[], dateFrom: string, dateTo: string, employees: any[]) {
  return reports
    .filter((report) => report.report_date >= dateFrom && report.report_date <= dateTo)
    .reduce((acc, report) => {
      const existing = acc.get(report.report_date) || {
        date: report.report_date,
        count: 0,
        hours: 0,
        draft_count: 0,
        submitted_count: 0,
        foreman_approved_count: 0,
        admin_approved_count: 0,
        rejected_count: 0,
        change_requested_count: 0,
        severity: "neutral",
        reports: [],
      };
      existing.count += 1;
      existing.hours = Number((existing.hours + report.worked_hours).toFixed(2));
      existing[`${report.status}_count`] += 1;
      if (report.status === "rejected" || report.status === "change_requested") existing.severity = "danger";
      else if (report.status === "submitted" || report.status === "foreman_approved" || report.status === "draft") existing.severity = "warning";
      else if (existing.severity === "neutral") existing.severity = "ok";
      existing.reports.push({
        id: report.id,
        report_number: report.report_number,
        status: report.status,
        employee: `${employees.find((employee) => employee.id === report.employee_id)?.first_name || ""} ${employees.find((employee) => employee.id === report.employee_id)?.last_name || ""}`.trim(),
        object: objects.find((object) => object.id === report.construction_object_id)?.name,
        hours: report.worked_hours,
        description: report.work_description,
      });
      acc.set(report.report_date, existing);
      return acc;
    }, new Map<string, any>())
    .values();
}

function buildAnalytics(reports: any[], employees: any[]) {
  const statuses = { draft: 0, submitted: 0, foreman_approved: 0, admin_approved: 0, rejected: 0, change_requested: 0 };
  reports.forEach((report) => {
    statuses[report.status as keyof typeof statuses] = (statuses[report.status as keyof typeof statuses] || 0) + 1;
  });
  return {
    report_statuses: statuses,
    total_hours: Number(reports.reduce((sum, report) => sum + report.worked_hours, 0).toFixed(2)),
    active_objects: objects.filter((object) => object.status === "active").length,
    active_employees: employees.filter((employee) => employee.status === "active").length,
    expense_total: 1046.5,
    hours_by_object: objects
      .filter((object) => object.status === "active")
      .map((object) => ({
        object: object.name,
        object_id: object.id,
        hours: Number(reports.filter((report) => report.construction_object_id === object.id).reduce((sum, report) => sum + report.worked_hours, 0).toFixed(2)),
      })),
    object_progress: objects
      .filter((object) => object.status !== "archived")
      .map((object) => ({
        object: object.name,
        object_id: object.id,
        progress_percent: object.progress_percent,
        status: object.status,
      })),
    expense_hint: "Kosten ergeben sich aus den Projektaufwanden; Stunden aus allen Berichten, fur die Lohnabrechnung zahlen nur final freigegebene Berichte.",
  };
}

function buildPayrollSummary(startDate: string, endDate: string, reports: any[], employees: any[]) {
  return {
    start_date: startDate,
    end_date: endDate,
    employees: employees
      .filter((employee) => employee.status === "active")
      .map((employee) => {
        const employeeReports = reports.filter((report) => report.employee_id === employee.id && report.report_date >= startDate && report.report_date <= endDate);
        const finalReports = employeeReports.filter((report) => report.status === "admin_approved");
        const pendingReports = employeeReports.filter((report) => ["submitted", "foreman_approved", "draft", "change_requested"].includes(report.status));
        const rejectedReports = employeeReports.filter((report) => report.status === "rejected");
        const approvedHours = Number(finalReports.reduce((sum, report) => sum + report.worked_hours, 0).toFixed(2));
        return {
          employee_id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          position: employee.position,
          hourly_rate: employee.hourly_rate,
          approved_hours: approvedHours,
          total_payment: Number((approvedHours * employee.hourly_rate).toFixed(2)),
          reports_count: finalReports.length,
          pending_count: pendingReports.length,
          rejected_count: rejectedReports.length,
          reports: finalReports.map((report) => ({
            id: report.id,
            report_number: report.report_number,
            report_date: report.report_date,
            worked_hours: report.worked_hours,
            status: report.status,
            construction_object_name: objects.find((object) => object.id === report.construction_object_id)?.name,
            description: report.work_description,
          })),
        };
      }),
  };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Entwurf",
    submitted: "An den Polier gesendet",
    foreman_approved: "Vom Polier freigegeben",
    admin_approved: "Final freigegeben",
    rejected: "Abgelehnt",
    change_requested: "Nacharbeit erforderlich",
  };
  return labels[status] || status;
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "admin_approved") return "success";
  if (status === "rejected" || status === "change_requested") return "danger";
  if (status === "submitted" || status === "foreman_approved" || status === "draft") return "warning";
  return "neutral";
}

function buildActivity(reportId: number, reports: any[], comments: Record<number, any[]>) {
  const report = reports.find((item) => item.id === reportId);
  if (!report) return [];
  const items: any[] = [
    {
      id: `event-created-${report.id}`,
      kind: "event",
      title: "Bericht erstellt",
      body: `Bericht ${report.report_number} wurde erstellt und in den Freigabeprozess ubergeben.`,
      tone: "neutral",
      created_at: report.created_at,
      author: report.employee_id === 3 ? usersByEmail.get("worker@baupilot.demo") : null,
    },
  ];
  if (report.foreman_reviewed_at) {
    items.push({
      id: `event-foreman-${report.id}`,
      kind: "event",
      title: "Vom Polier freigegeben",
      body: "Der Bericht hat die Vorprufung durch den Polier bestanden.",
      tone: "warning",
      created_at: report.foreman_reviewed_at,
      author: usersByEmail.get("foreman@baupilot.demo"),
    });
  }
  if (report.admin_reviewed_at) {
    items.push({
      id: `event-admin-${report.id}`,
      kind: "event",
      title: "Final freigegeben",
      body: "Der Bericht wurde fur die Lohnabrechnung final freigegeben.",
      tone: "success",
      created_at: report.admin_reviewed_at,
      author: usersByEmail.get("admin@baupilot.demo"),
    });
  }
  if (report.rejection_reason) {
    items.push({
      id: `event-status-${report.id}`,
      kind: "event",
      title: statusLabel(report.status),
      body: report.rejection_reason,
      tone: statusTone(report.status),
      created_at: report.admin_reviewed_at || report.foreman_reviewed_at || report.created_at,
      author: null,
    });
  }
  if (report.photos?.length) {
    report.photos.forEach((photo: any) => {
      items.push({
        id: `event-photo-${photo.id}`,
        kind: "event",
        title: "Mediadatei hinzugefugt",
        body: `Datei «${photo.file_name}» wurde dem Bericht hinzugefugt.`,
        tone: "success",
        created_at: report.created_at,
        author: null,
      });
    });
  }
  (comments[reportId] || []).forEach((comment) => {
    items.push({
      id: `comment-${comment.id}`,
      kind: "comment",
      title: "Kommentar gespeichert",
      body: comment.body,
      tone: "neutral",
      created_at: comment.created_at,
      author: comment.author,
    });
  });
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function installMockApi(page: Page) {
  let currentEmail = "worker@baupilot.demo";
  let employees = clone(employeesBase);
  let crews = clone(crewsBase);
  let reports = clone(baseReports);
  let comments = clone(commentsBase);

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const currentUser = usersByEmail.get(currentEmail) || usersByEmail.get("worker@baupilot.demo");
    const currentRole = currentUser.role.code as RoleCode;

    if (path === "/auth/login" && request.method() === "POST") {
      const body = request.postData() || "";
      const email = new URLSearchParams(body).get("username") || "worker@baupilot.demo";
      const user = usersByEmail.get(email);
      if (!user || user.is_active === false) {
        return json(route, { detail: "Incorrect email or password" }, 401);
      }
      currentEmail = email;
      return json(route, { access_token: `test-token-${user.role.code}`, token_type: "bearer" });
    }

    if (path === "/auth/me") return json(route, currentUser);

    if (path === "/employees" && request.method() === "GET") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const statusFilter = url.searchParams.get("status_filter");
      const result = employees.filter((employee) => {
        const matchesStatus = !statusFilter || employee.status === statusFilter;
        const searchable = `${employee.first_name} ${employee.last_name} ${employee.position} ${employee.user?.email || ""}`.toLowerCase();
        return matchesStatus && (!search || searchable.includes(search));
      });
      return json(route, result);
    }

    if (path === "/employees" && request.method() === "POST") {
      const data = request.postDataJSON() as any;
      let user = null;
      if (data.access_email) {
        user = {
          id: nextUserId++,
          email: data.access_email,
          full_name: `${data.first_name} ${data.last_name}`.trim(),
          is_active: data.access_is_active ?? true,
          role: roles[(data.access_role_code || "worker") as RoleCode],
        };
        usersByEmail.set(user.email, user);
      }
      const created = {
        id: nextEmployeeId++,
        user_id: user?.id || null,
        first_name: data.first_name,
        last_name: data.last_name,
        position: data.position,
        phone: data.phone,
        hourly_rate: Number(data.hourly_rate),
        status: data.status || "active",
        user,
      };
      employees = [created, ...employees];
      return json(route, created, 201);
    }

    const employeeMatch = path.match(/^\/employees\/(\d+)$/);
    if (employeeMatch && request.method() === "PATCH") {
      const employeeId = Number(employeeMatch[1]);
      const patch = request.postDataJSON() as any;
      employees = employees.map((employee) => {
        if (employee.id !== employeeId) return employee;
        let user = employee.user;
        if (patch.access_email && !user) {
          user = {
            id: nextUserId++,
            email: patch.access_email,
            full_name: `${patch.first_name || employee.first_name} ${patch.last_name || employee.last_name}`.trim(),
            is_active: patch.access_is_active ?? true,
            role: roles[(patch.access_role_code || "worker") as RoleCode],
          };
          usersByEmail.set(user.email, user);
        } else if (user) {
          const updatedUser = {
            ...user,
            email: patch.access_email ?? user.email,
            full_name: `${patch.first_name || employee.first_name} ${patch.last_name || employee.last_name}`.trim(),
            is_active: patch.access_is_active ?? user.is_active,
            role: patch.access_role_code ? roles[patch.access_role_code as RoleCode] : user.role,
          };
          if (updatedUser.email !== user.email) usersByEmail.delete(user.email);
          usersByEmail.set(updatedUser.email, updatedUser);
          if (currentEmail === user.email && updatedUser.email !== user.email) currentEmail = updatedUser.email;
          user = updatedUser;
        }
        return {
          ...employee,
          ...patch,
          hourly_rate: patch.hourly_rate !== undefined ? Number(patch.hourly_rate) : employee.hourly_rate,
          user,
          user_id: user?.id || null,
        };
      });
      return json(route, employees.find((employee) => employee.id === employeeId));
    }

    if (path === "/dashboard/analytics") return json(route, buildAnalytics(reports, employees));

    if (path === "/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const reportDateQuery = url.searchParams.get("q") || "";
      const employeeResults = employees
        .filter((employee) => `${employee.first_name} ${employee.last_name} ${employee.position} ${employee.user?.email || ""}`.toLowerCase().includes(q))
        .slice(0, 5)
        .map((employee) => ({ id: employee.id, label: `${employee.first_name} ${employee.last_name}`, subtitle: employee.position }));
      const objectResults = objects
        .filter((object) => `${object.name} ${object.code} ${object.city} ${object.address}`.toLowerCase().includes(q))
        .slice(0, 5)
        .map((object) => ({ id: object.id, label: object.name, subtitle: `${object.city} · ${object.code}` }));
      const reportResults = reports
        .filter((report) => {
          const employee = employees.find((item) => item.id === report.employee_id);
          const object = objects.find((item) => item.id === report.construction_object_id);
          const haystack = `${report.report_number} ${report.work_description} ${report.report_date} ${employee?.first_name || ""} ${employee?.last_name || ""} ${object?.name || ""} ${object?.code || ""}`.toLowerCase();
          return haystack.includes(q) || report.report_date === reportDateQuery;
        })
        .slice(0, 5)
        .map((report) => {
          const employee = employees.find((item) => item.id === report.employee_id);
          const object = objects.find((item) => item.id === report.construction_object_id);
          return {
            id: report.id,
            label: report.report_number,
            subtitle: `${report.report_date} · ${employee?.first_name || ""} ${employee?.last_name || ""} · ${object?.name || ""}`.trim(),
            status: report.status,
          };
        });
      return json(route, { employees: employeeResults, objects: objectResults, reports: reportResults });
    }

    if (path === "/objects" && request.method() === "GET") return json(route, objects);

    const objectSummaryMatch = path.match(/^\/objects\/(\d+)\/summary$/);
    if (objectSummaryMatch) {
      const objectId = Number(objectSummaryMatch[1]);
      const object = objects.find((item) => item.id === objectId) || objects[0];
      const objectCrews = crews.filter((crew) => crew.current_object_id === objectId);
      const objectReports = reports.filter((report) => report.construction_object_id === objectId).map((report) => normalizeReport(report, employees));
      const employeeMap = new Map<number, any>();
      objectCrews.forEach((crew) => crew.members.filter((member: any) => member.is_active).forEach((member: any) => employeeMap.set(member.employee.id, member.employee)));
      return json(route, {
        object,
        crews: objectCrews,
        employees: [...employeeMap.values()],
        work_plan_items: workPlanItems.filter((item) => item.construction_object_id === objectId),
        reports: objectReports,
        report_statuses: buildAnalytics(reports, employees).report_statuses,
        total_hours: Number(objectReports.reduce((sum, report) => sum + report.worked_hours, 0).toFixed(2)),
        expense_total: objectId === 2 ? 620.5 : 426.0,
        progress_percent: object.progress_percent,
      });
    }

    if (path === "/crews" && request.method() === "GET") return json(route, crews);

    if (path === "/crews" && request.method() === "POST") {
      const data = request.postDataJSON() as any;
      const created = {
        id: nextCrewId++,
        ...data,
        notes: data.notes || null,
        status: data.status || "active",
        current_object: objects.find((object) => object.id === data.current_object_id) || null,
        foreman: employees.find((employee) => employee.id === data.foreman_employee_id) || null,
        members: [],
      };
      crews = [created, ...crews];
      return json(route, created, 201);
    }

    if (path === "/crew-members" && request.method() === "POST") {
      const data = request.postDataJSON() as any;
      const created = {
        id: nextCrewMemberId++,
        ...data,
        employee: employees.find((employee) => employee.id === data.employee_id) || null,
      };
      crews = crews.map((crew) => (crew.id === data.crew_id ? { ...crew, members: [...crew.members, created] } : crew));
      return json(route, created, 201);
    }

    const crewMemberMatch = path.match(/^\/crew-members\/(\d+)$/);
    if (crewMemberMatch && request.method() === "PATCH") {
      const crewMemberId = Number(crewMemberMatch[1]);
      const patch = request.postDataJSON() as any;
      crews = crews.map((crew) => ({
        ...crew,
        members: crew.members.map((member: any) => (member.id === crewMemberId ? { ...member, ...patch } : member)),
      }));
      const updated = crews.flatMap((crew) => crew.members).find((member: any) => member.id === crewMemberId);
      return json(route, updated);
    }

    if (path === "/me/active-assignment") {
      const employee = employees.find((item) => item.user?.email === currentEmail) || employees[2];
      const crew = crews.find((item) => item.members.some((member: any) => member.employee_id === employee.id && member.is_active)) || crews[0];
      return json(route, {
        employee,
        assignment: { id: 1, employee_id: employee.id, construction_object_id: crew.current_object_id, crew_id: crew.id, role_on_object: employee.position, start_date: "2026-05-01", end_date: null, is_active: true },
        crew,
        construction_object: objects.find((object) => object.id === crew.current_object_id),
        work_plan_items: workPlanItems.filter((item) => item.construction_object_id === crew.current_object_id),
      });
    }

    if (path === "/daily-reports" && request.method() === "GET") {
      const status = url.searchParams.get("status_filter");
      const employeeId = url.searchParams.get("employee_id");
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const result = reports
        .filter((report) => !status || report.status === status)
        .filter((report) => !employeeId || report.employee_id === Number(employeeId))
        .filter((report) => {
          if (!search) return true;
          const employee = employees.find((item) => item.id === report.employee_id);
          const object = objects.find((item) => item.id === report.construction_object_id);
          const haystack = `${report.work_description} ${report.report_number} ${report.report_date} ${employee?.first_name || ""} ${employee?.last_name || ""} ${object?.name || ""} ${object?.code || ""}`.toLowerCase();
          return haystack.includes(search);
        })
        .sort((a, b) => (a.report_date < b.report_date ? 1 : -1))
        .map((report) => normalizeReport(report, employees));
      return json(route, result);
    }

    if (path === "/daily-reports" && request.method() === "POST") {
      const data = request.postDataJSON() as any;
      const created = {
        id: nextReportId++,
        report_number: `DR-2026-${String(nextReportId).padStart(4, "0")}`,
        employee_id: data.employee_id,
        construction_object_id: data.construction_object_id,
        work_plan_item_id: data.work_plan_item_id,
        report_date: data.report_date,
        start_time: `${data.start_time}:00`,
        end_time: `${data.end_time}:00`,
        break_minutes: data.break_minutes,
        worked_hours: data.worked_hours,
        status: data.status || "submitted",
        work_description: data.work_description,
        completed_volume: data.completed_volume,
        media_note: data.media_note || null,
        rejection_reason: null,
        foreman_reviewed_by_user_id: null,
        foreman_reviewed_at: null,
        admin_reviewed_by_user_id: null,
        admin_reviewed_at: null,
        photos: [],
        created_at: "2026-06-03T12:00:00Z",
      };
      reports = [created, ...reports];
      comments[created.id] = [];
      return json(route, normalizeReport(created, employees), 201);
    }

    const reportMatch = path.match(/^\/daily-reports\/(\d+)$/);
    if (reportMatch && request.method() === "GET") {
      return json(route, normalizeReport(reports.find((report) => report.id === Number(reportMatch[1])) || reports[0], employees));
    }

    if (reportMatch && request.method() === "PATCH") {
      const reportId = Number(reportMatch[1]);
      const patch = request.postDataJSON() as any;
      reports = reports.map((report) => (report.id === reportId ? { ...report, ...patch, completed_volume: patch.completed_volume !== undefined ? Number(patch.completed_volume) : report.completed_volume } : report));
      return json(route, normalizeReport(reports.find((report) => report.id === reportId), employees));
    }

    const statusMatch = path.match(/^\/daily-reports\/(\d+)\/status$/);
    if (statusMatch && request.method() === "PATCH") {
      const reportId = Number(statusMatch[1]);
      const patch = request.postDataJSON() as any;
      reports = reports.map((report) => {
        if (report.id !== reportId) return report;
        const updated = { ...report, status: patch.status, rejection_reason: patch.rejection_reason || null };
        if (patch.status === "foreman_approved") {
          updated.foreman_reviewed_by_user_id = currentUser.id;
          updated.foreman_reviewed_at = "2026-06-03T13:10:00Z";
        }
        if (patch.status === "admin_approved") {
          updated.admin_reviewed_by_user_id = currentUser.id;
          updated.admin_reviewed_at = "2026-06-03T13:20:00Z";
        }
        return updated;
      });
      return json(route, normalizeReport(reports.find((report) => report.id === reportId), employees));
    }

    const reportMediaMatch = path.match(/^\/(?:daily-reports|reports)\/(\d+)\/media$/);
    if (reportMediaMatch && request.method() === "POST") {
      const reportId = Number(reportMediaMatch[1]);
      const photo = {
        id: nextPhotoId++,
        daily_report_id: reportId,
        file_name: "uploaded-file.jpg",
        file_url: "https://placehold.co/900x650",
        caption: "Vom Mitarbeiter im Bericht hochgeladen",
        content_type: "image/jpeg",
        size_bytes: 245120,
      };
      reports = reports.map((report) => (report.id === reportId ? { ...report, photos: [...(report.photos || []), photo] } : report));
      return json(route, photo, 201);
    }

    const commentsMatch = path.match(/^\/reports\/(\d+)\/comments$/);
    if (commentsMatch && request.method() === "GET") {
      return json(route, comments[Number(commentsMatch[1])] || []);
    }

    if (commentsMatch && request.method() === "POST") {
      const reportId = Number(commentsMatch[1]);
      const data = request.postDataJSON() as any;
      const created = {
        id: nextCommentId++,
        report_id: reportId,
        user_id: currentUser.id,
        body: data.body,
        created_at: "2026-06-03T13:30:00Z",
        author: currentUser,
      };
      comments[reportId] = [...(comments[reportId] || []), created];
      return json(route, created, 201);
    }

    const commentsCompatMatch = path.match(/^\/daily-reports\/(\d+)\/comments$/);
    if (commentsCompatMatch && request.method() === "GET") {
      return json(route, comments[Number(commentsCompatMatch[1])] || []);
    }
    if (commentsCompatMatch && request.method() === "POST") {
      const reportId = Number(commentsCompatMatch[1]);
      const data = request.postDataJSON() as any;
      const created = {
        id: nextCommentId++,
        report_id: reportId,
        user_id: currentUser.id,
        body: data.body,
        created_at: "2026-06-03T13:30:00Z",
        author: currentUser,
      };
      comments[reportId] = [...(comments[reportId] || []), created];
      return json(route, created, 201);
    }

    const activityMatch = path.match(/^\/(?:reports|daily-reports)\/(\d+)\/activity$/);
    if (activityMatch && request.method() === "GET") {
      return json(route, buildActivity(Number(activityMatch[1]), reports, comments));
    }

    if (path === "/calendar/detailed") {
      const dateFrom = url.searchParams.get("date_from") || "2026-05-01";
      const dateTo = url.searchParams.get("date_to") || "2026-05-31";
      return json(route, [...buildCalendarRows(reports, dateFrom, dateTo, employees)]);
    }

    if (path === "/calendar/report-summary") {
      const dateFrom = url.searchParams.get("date_from") || "2026-05-01";
      const dateTo = url.searchParams.get("date_to") || "2026-05-31";
      const rows = [...buildCalendarRows(reports, dateFrom, dateTo, employees)];
      return json(
        route,
        rows.flatMap((row) =>
          row.reports.map((report: any) => ({
            date: row.date,
            status: report.status,
            count: 1,
            hours: report.hours,
          })),
        ),
      );
    }

    if (path === "/payroll/summary") {
      const startDate = url.searchParams.get("start_date") || "2026-04-21";
      const endDate = url.searchParams.get("end_date") || "2026-05-20";
      return json(route, buildPayrollSummary(startDate, endDate, reports, employees));
    }

    if (path === "/payroll/export.csv") {
      const startDate = url.searchParams.get("start_date") || "2026-04-21";
      const endDate = url.searchParams.get("end_date") || "2026-05-20";
      const summary = buildPayrollSummary(startDate, endDate, reports, employees);
      const header = "employee_id,name,position,hourly_rate,approved_hours,total_payment,reports_count,pending_count,rejected_count";
      const rows = summary.employees.map((employee: any) => [employee.employee_id, employee.name, employee.position, employee.hourly_rate, employee.approved_hours, employee.total_payment, employee.reports_count, employee.pending_count, employee.rejected_count].join(","));
      return route.fulfill({
        status: 200,
        contentType: "text/csv; charset=utf-8",
        headers: { "Content-Disposition": `attachment; filename="baupilot-lohn-${startDate}-${endDate}.csv"` },
        body: [header, ...rows].join("\n"),
      });
    }

    if (path === "/report-photos" && request.method() === "POST") {
      const data = request.postDataJSON() as any;
      reports = reports.map((report) => (report.id === data.daily_report_id ? { ...report, photos: [...(report.photos || []), { id: nextCommentId++, ...data }] } : report));
      return json(route, { id: nextCommentId, ...data }, 201);
    }

    return json(route, { detail: `Unhandled mock route ${request.method()} ${path}` }, 404);
  });
}
