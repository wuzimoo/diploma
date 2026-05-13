import { useEffect, useState } from "react";

import { api } from "../services/api";
import { Analytics } from "../types/api";

export function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  useEffect(() => {
    api.get<Analytics>("/dashboard/analytics").then((response) => setAnalytics(response.data));
  }, []);
  return (
    <>
      <section className="summary-grid-desktop">
        <article className="summary-tile"><p>Відкриті звіти</p><strong>{analytics?.report_statuses.open || 0}</strong></article>
        <article className="summary-tile"><p>На перевірці</p><strong>{analytics?.report_statuses.review || 0}</strong></article>
        <article className="summary-tile"><p>Погоджено</p><strong>{analytics?.report_statuses.approved || 0}</strong></article>
        <article className="summary-tile"><p>Активні працівники</p><strong>{analytics?.active_employees || 0}</strong></article>
      </section>
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Аналітика по об'єктах</h2>
          <p className="section-subtitle">Години, витрати та статуси для демонстрації управлінського контуру</p>
        </div>
        <div className="analytics-bars">
          {analytics?.hours_by_object.map((row) => (
            <div className="bar-row" key={row.object}>
              <span>{row.object}</span>
              <div><i style={{ width: `${Math.min(row.hours * 4, 100)}%` }} /></div>
              <strong>{row.hours.toFixed(2)} h</strong>
            </div>
          ))}
        </div>
        <div className="warning-note">Загальні витрати: EUR {analytics?.expense_total.toFixed(2) || "0.00"}</div>
      </section>
    </>
  );
}

