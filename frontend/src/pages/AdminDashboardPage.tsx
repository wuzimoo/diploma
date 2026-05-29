import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        <Link className="summary-tile" to="/admin/reports?status=open"><p>Відкриті звіти</p><strong>{analytics?.report_statuses.open || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/reports?status=review"><p>На перевірці</p><strong>{analytics?.report_statuses.review || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/reports?status=approved"><p>Погоджено</p><strong>{analytics?.report_statuses.approved || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/employees"><p>Активні працівники</p><strong>{analytics?.active_employees || 0}</strong></Link>
      </section>
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Аналітика по об'єктах</h2>
          <p className="section-subtitle">Години, витрати та статуси для демонстрації управлінського контуру</p>
        </div>
        <div className="analytics-bars">
          {analytics?.hours_by_object.map((row) => (
            <Link className="bar-row clickable-row" key={row.object} to={`/admin/objects/${row.object_id}`}>
              <span>{row.object}</span>
              <div><i style={{ width: `${Math.min(row.hours * 4, 100)}%` }} /></div>
              <strong>{row.hours.toFixed(2)} h</strong>
            </Link>
          ))}
        </div>
        <div className="expense-panel">
          <strong>Загальні витрати: EUR {analytics?.expense_total.toFixed(2) || "0.00"}</strong>
          <span>{analytics?.expense_hint}</span>
        </div>
        <div className="cards-grid">
          {analytics?.object_progress.map((item) => (
            <Link className="entity-card" key={item.object_id} to={`/admin/objects/${item.object_id}`}>
              <strong>{item.object}</strong>
              <span>{item.status}</span>
              <div className="mini-progress"><i style={{ width: `${item.progress_percent}%` }} /><span>{item.progress_percent}%</span></div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
