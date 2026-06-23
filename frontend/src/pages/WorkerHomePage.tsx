import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatHours } from "../lib/format";
import { api } from "../services/api";
import { ActiveAssignment, Analytics, DailyReport } from "../types/api";

export function WorkerHomePage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<ActiveAssignment | null>(null);
  const today = formatDate(new Date());

  useEffect(() => {
    Promise.all([
      api.get<DailyReport[]>("/daily-reports", { params: { limit: 5 } }),
      api.get<Analytics>("/dashboard/analytics"),
      api.get<ActiveAssignment>("/me/active-assignment")
    ]).then(([reportsResponse, analyticsResponse, assignmentResponse]) => {
      setReports(reportsResponse.data);
      setAnalytics(analyticsResponse.data);
      setActiveAssignment(assignmentResponse.data);
    });
  }, []);

  return (
    <>
      <header className="mobile-header">
        <h1>Guten Tag, {user?.full_name.split(" ")[0]}</h1>
        <p>Heute: {today}</p>
      </header>
      <main className="mobile-content">
        <Link className="btn btn-primary btn-block" to="/worker/reports/new">Tagesbericht erfassen</Link>
        <section className="locked-assignment">
          <span>Aktuelle Zuordnung</span>
          <strong>{activeAssignment?.construction_object?.name || "Kein Projekt zugewiesen"}</strong>
          <p>{activeAssignment?.crew?.name || "ohne Team"} · {activeAssignment?.work_plan_items.length || 0} Arbeitspakete im Plan</p>
        </section>
        <section className="summary-card">
          <span className="text-muted">Gebuchte Stunden im System</span>
          <strong className="summary-number">{formatHours(analytics?.total_hours || 0)}</strong>
          <span className="helper">{analytics?.report_statuses.admin_approved || analytics?.report_statuses.approved || 0} final freigegeben, {(analytics?.report_statuses.submitted || 0) + (analytics?.report_statuses.foreman_approved || 0)} in Prufung</span>
        </section>
        <section className="stack">
          <div>
            <h2 className="section-title">Letzte Berichte</h2>
            <p className="section-subtitle">Schneller Überblick über die letzten Einreichungen</p>
          </div>
          {reports.length === 0 ? <EmptyState title="Noch keine Berichte" text="Neu erfasste Berichte erscheinen hier automatisch." /> : (
            <div className="report-list">
              {reports.map((report) => (
                <Link className="report-item" key={report.id} to={`/worker/reports/${report.id}`}>
                  <div className="report-item-top">
                    <h3>{formatDate(report.report_date)}</h3>
                    <StatusBadge status={report.status} />
                  </div>
                  <p>{report.construction_object.name}</p>
                  <div className="report-meta">
                    <span>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</span>
                    <strong>{formatHours(report.worked_hours)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
