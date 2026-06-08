import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { Analytics, SearchResults } from "../types/api";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role.code === "admin";
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    api.get<Analytics>("/dashboard/analytics").then((response) => setAnalytics(response.data));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      api.get<SearchResults>("/search", { params: { q: trimmed } }).then((response) => setResults(response.data));
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const hasResults = useMemo(
    () => Boolean(results && (results.employees.length || results.objects.length || results.reports.length)),
    [results],
  );

  return (
    <>
      <section className="summary-grid-desktop">
        <Link className="summary-tile" to="/admin/reports?status=submitted"><p>У бригадира</p><strong>{analytics?.report_statuses.submitted || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/reports?status=foreman_approved"><p>У адміна</p><strong>{analytics?.report_statuses.foreman_approved || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/reports?status=admin_approved"><p>Фінально погоджено</p><strong>{analytics?.report_statuses.admin_approved || 0}</strong></Link>
        {isAdmin ? <Link className="summary-tile" to="/admin/employees"><p>Активні працівники</p><strong>{analytics?.active_employees || 0}</strong></Link> : <article className="summary-tile"><p>Активні працівники</p><strong>{analytics?.active_employees || 0}</strong></article>}
      </section>
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Пошук по системі</h2>
          <p className="section-subtitle">Шукає по ПІБ, email, датах звітів, назвах об'єктів, кодах і номерах звітів.</p>
        </div>
        <label className="field">
          Пошуковий запит
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Напр.: Markus, 2026-06-04, Berlin Ost, DR-2026-0042" />
        </label>
        {query.trim().length >= 2 ? (
          hasResults ? (
            <div className="search-results-grid">
              {isAdmin && results?.employees.length ? (
                <section className="search-group">
                  <h3>Працівники</h3>
                  {results.employees.map((item) => (
                    <Link className="search-result-item" key={`employee-${item.id}`} to="/admin/employees">
                      <strong>{item.label}</strong>
                      <span>{item.subtitle}</span>
                    </Link>
                  ))}
                </section>
              ) : null}
              {results?.objects.length ? (
                <section className="search-group">
                  <h3>Об'єкти</h3>
                  {results.objects.map((item) => (
                    <Link className="search-result-item" key={`object-${item.id}`} to={`/admin/objects/${item.id}`}>
                      <strong>{item.label}</strong>
                      <span>{item.subtitle}</span>
                    </Link>
                  ))}
                </section>
              ) : null}
              {results?.reports.length ? (
                <section className="search-group">
                  <h3>Звіти</h3>
                  {results.reports.map((item) => (
                    <Link className="search-result-item" key={`report-${item.id}`} to={`/admin/reports/${item.id}`}>
                      <div className="report-item-top">
                        <strong>{item.label}</strong>
                        <StatusBadge status={item.status} />
                      </div>
                      <span>{item.subtitle}</span>
                    </Link>
                  ))}
                </section>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Нічого не знайдено</strong>
              <span>Спробуйте інше ПІБ, дату, номер звіту або назву об'єкта.</span>
            </div>
          )
        ) : (
          <div className="empty-state compact-empty">
            <strong>Почніть пошук</strong>
            <span>Введіть щонайменше 2 символи, щоб знайти працівників, звіти та об'єкти.</span>
          </div>
        )}
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
            <Link className="entity-card object-progress-card" key={item.object_id} to={`/admin/objects/${item.object_id}`}>
              <div className="report-item-top">
                <strong>{item.object}</strong>
                <StatusBadge status={item.status} />
              </div>
              <div className="mini-progress"><i style={{ width: `${item.progress_percent}%` }} /><span>{item.progress_percent}%</span></div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
