import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { Analytics, DailyReport } from "../types/api";

export function WorkerHomePage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<DailyReport[]>("/daily-reports", { params: { limit: 5 } }),
      api.get<Analytics>("/dashboard/analytics")
    ]).then(([reportsResponse, analyticsResponse]) => {
      setReports(reportsResponse.data);
      setAnalytics(analyticsResponse.data);
    });
  }, []);

  return (
    <>
      <header className="mobile-header">
        <h1>Доброго дня, {user?.full_name.split(" ")[0]}</h1>
        <p>Сьогодні: 13.05.2026</p>
      </header>
      <main className="mobile-content">
        <Link className="btn btn-primary btn-block" to="/worker/reports/new">Створити щоденний звіт</Link>
        <section className="summary-card">
          <span className="text-muted">Робочі години в системі</span>
          <strong className="summary-number">{analytics?.total_hours.toFixed(2) || "0.00"} h</strong>
          <span className="helper">{analytics?.report_statuses.approved || 0} погоджено, {analytics?.report_statuses.review || 0} на перевірці</span>
        </section>
        <section className="stack">
          <div>
            <h2 className="section-title">Останні звіти</h2>
            <p className="section-subtitle">Швидкий огляд щоденного звітування</p>
          </div>
          {reports.length === 0 ? <EmptyState title="Звітів ще немає" text="Після створення вони з'являться тут." /> : (
            <div className="report-list">
              {reports.map((report) => (
                <Link className="report-item" key={report.id} to={`/worker/reports/${report.id}`}>
                  <div className="report-item-top">
                    <h3>{report.report_date}</h3>
                    <StatusBadge status={report.status} />
                  </div>
                  <p>{report.construction_object.name}</p>
                  <div className="report-meta">
                    <span>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</span>
                    <strong>{report.worked_hours.toFixed(2)} h</strong>
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

