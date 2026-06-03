import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

export function ReportsListPage() {
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [employee, setEmployee] = useState("");

  useEffect(() => {
    setStatus(searchParams.get("status") || "");
  }, [searchParams]);

  useEffect(() => {
    api
      .get<DailyReport[]>("/daily-reports", { params: { limit: 100, status_filter: status || undefined, search: search || undefined } })
      .then((response) => setReports(response.data));
  }, [search, status]);

  const employees = useMemo(() => Array.from(new Set(reports.map((report) => `${report.employee.first_name} ${report.employee.last_name}`))), [reports]);
  const filteredReports = useMemo(() => {
    if (!employee) return reports;
    return reports.filter((report) => `${report.employee.first_name} ${report.employee.last_name}` === employee);
  }, [employee, reports]);

  return (
    <section className="table-card stack">
      <div>
        <h2 className="section-title">Список звітів</h2>
        <p className="section-subtitle">Фільтри та швидкі дії для щоденного погодження</p>
      </div>
      <div className="filters">
        <label className="field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Опис робіт" /></label>
        <label className="field">Статус<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Усі</option><option value="draft">Чернетка</option><option value="submitted">У бригадира</option><option value="foreman_approved">У адміна</option><option value="admin_approved">Фінально погоджено</option><option value="change_requested">Потрібні зміни</option><option value="rejected">Відхилено</option></select></label>
        <label className="field">Працівники<select value={employee} onChange={(event) => setEmployee(event.target.value)}><option value="">Усі</option>{employees.map((employeeName) => <option key={employeeName} value={employeeName}>{employeeName}</option>)}</select></label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Дата</th><th>Працівник</th><th>Об'єкт</th><th>План</th><th>Час</th><th>Години</th><th>Статус</th><th>Дії</th></tr></thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id}>
                <td>{report.report_date}</td>
                <td>{report.employee.first_name} {report.employee.last_name}</td>
                <td>{report.construction_object.name}</td>
                <td>{report.work_plan_item?.title || "Без плану"}</td>
                <td>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</td>
                <td>{report.worked_hours.toFixed(2)} h</td>
                <td><StatusBadge status={report.status} /></td>
                <td><Link className="btn btn-sm btn-secondary" to={`/admin/reports/${report.id}`}>Відкрити</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
