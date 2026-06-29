import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../hooks/useI18n";
import { formatDate, formatHours } from "../lib/format";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

export function ReportsListPage() {
  const { t, translateText } = useI18n();
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
        <h2 className="section-title">{t("Berichtsliste")}</h2>
        <p className="section-subtitle">{t("Filter und Schnellaktionen fur Freigabe und Nacharbeit")}</p>
      </div>
      <div className="filters">
        <label className="field">{t("Suche")}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Name, Datum, Berichtsnummer, Projekt oder Beschreibung")} /></label>
        <label className="field">{t("Status")}<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("Alle")}</option><option value="draft">{t("Entwurf")}</option><option value="submitted">{t("Beim Polier")}</option><option value="foreman_approved">{t("Bei der Verwaltung")}</option><option value="admin_approved">{t("Final freigegeben")}</option><option value="change_requested">{t("Nacharbeit")}</option><option value="rejected">{t("Abgelehnt")}</option></select></label>
        <label className="field">{t("Mitarbeiter")}<select value={employee} onChange={(event) => setEmployee(event.target.value)}><option value="">{t("Alle")}</option>{employees.map((employeeName) => <option key={employeeName} value={employeeName}>{employeeName}</option>)}</select></label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t("Datum")}</th><th>{t("Mitarbeiter")}</th><th>{t("Projekt")}</th><th>{t("Arbeitspaket")}</th><th>{t("Zeit")}</th><th>{t("Stunden")}</th><th>{t("Status")}</th><th>{t("Aktion")}</th></tr></thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id}>
                <td>{formatDate(report.report_date)}</td>
                <td>{report.employee.first_name} {report.employee.last_name}</td>
                <td>{translateText(report.construction_object.name)}</td>
                <td>{translateText(report.work_plan_item?.title) || t("Ohne Arbeitspaket")}</td>
                <td>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</td>
                <td>{formatHours(report.worked_hours)}</td>
                <td><StatusBadge status={report.status} /></td>
                <td><Link className="btn btn-sm btn-secondary" to={`/admin/reports/${report.id}`}>{t("Offnen")}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
