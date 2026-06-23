import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatHours } from "../lib/format";
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
        <h2 className="section-title">Berichtsliste</h2>
        <p className="section-subtitle">Filter und Schnellaktionen fur Freigabe und Nacharbeit</p>
      </div>
      <div className="filters">
        <label className="field">Suche<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, Datum, Berichtsnummer, Projekt oder Beschreibung" /></label>
        <label className="field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Alle</option><option value="draft">Entwurf</option><option value="submitted">Beim Polier</option><option value="foreman_approved">Bei der Verwaltung</option><option value="admin_approved">Final freigegeben</option><option value="change_requested">Nacharbeit</option><option value="rejected">Abgelehnt</option></select></label>
        <label className="field">Mitarbeiter<select value={employee} onChange={(event) => setEmployee(event.target.value)}><option value="">Alle</option>{employees.map((employeeName) => <option key={employeeName} value={employeeName}>{employeeName}</option>)}</select></label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Datum</th><th>Mitarbeiter</th><th>Projekt</th><th>Arbeitspaket</th><th>Zeit</th><th>Stunden</th><th>Status</th><th>Aktion</th></tr></thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id}>
                <td>{formatDate(report.report_date)}</td>
                <td>{report.employee.first_name} {report.employee.last_name}</td>
                <td>{report.construction_object.name}</td>
                <td>{report.work_plan_item?.title || "Ohne Arbeitspaket"}</td>
                <td>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</td>
                <td>{formatHours(report.worked_hours)}</td>
                <td><StatusBadge status={report.status} /></td>
                <td><Link className="btn btn-sm btn-secondary" to={`/admin/reports/${report.id}`}>Offnen</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
