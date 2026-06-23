import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency, formatHours } from "../lib/format";
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

  const hoursByObjectId = useMemo(
    () => new Map((analytics?.hours_by_object || []).map((row) => [row.object_id, row.hours])),
    [analytics],
  );

  return (
    <>
      <section className="summary-grid-desktop">
        <Link className="summary-tile" to="/admin/reports?status=submitted"><p>Beim Polier</p><strong>{analytics?.report_statuses.submitted || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/reports?status=foreman_approved"><p>Bei der Verwaltung</p><strong>{analytics?.report_statuses.foreman_approved || 0}</strong></Link>
        <Link className="summary-tile" to="/admin/reports?status=admin_approved"><p>Final freigegeben</p><strong>{analytics?.report_statuses.admin_approved || 0}</strong></Link>
        {isAdmin ? <Link className="summary-tile" to="/admin/employees"><p>Aktive Mitarbeiter</p><strong>{analytics?.active_employees || 0}</strong></Link> : <article className="summary-tile"><p>Aktive Mitarbeiter</p><strong>{analytics?.active_employees || 0}</strong></article>}
      </section>
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Suche im System</h2>
          <p className="section-subtitle">Sucht nach Namen, E-Mails, Berichtsdaten, Projekten, Codes und Berichtsnummern.</p>
        </div>
        <label className="field">
          Suchanfrage
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="z. B. Markus, 2026-06-04, Berlin Ost, DR-2026-0042" />
        </label>
        {query.trim().length >= 2 ? (
          hasResults ? (
            <div className="search-results-grid">
              {isAdmin && results?.employees.length ? (
                <section className="search-group">
                  <h3>Mitarbeiter</h3>
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
                  <h3>Projekte</h3>
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
                  <h3>Berichte</h3>
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
              <strong>Keine Treffer</strong>
              <span>Versuchen Sie einen anderen Namen, ein anderes Datum, eine Berichtsnummer oder einen Projektnamen.</span>
            </div>
          )
        ) : (
          <div className="empty-state compact-empty">
            <strong>Suche starten</strong>
            <span>Geben Sie mindestens 2 Zeichen ein, um Mitarbeiter, Berichte und Projekte zu finden.</span>
          </div>
        )}
      </section>
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Projektanalytik</h2>
          <p className="section-subtitle">Stunden, Kosten und Fortschritt fur das Kunden-Demo-Cockpit</p>
        </div>
        <div className="analytics-bars">
          {analytics?.hours_by_object.map((row) => (
            <Link className="bar-row clickable-row" key={row.object} to={`/admin/objects/${row.object_id}`}>
              <span>{row.object}</span>
              <div><i style={{ width: `${Math.min(row.hours * 4, 100)}%` }} /></div>
              <strong>{formatHours(row.hours)}</strong>
            </Link>
          ))}
        </div>
        <div className="expense-panel">
          <strong>Gesamtkosten: {formatCurrency(analytics?.expense_total || 0, 2)}</strong>
          <span>{analytics?.expense_hint}</span>
        </div>
        <div className="cards-grid">
          {analytics?.object_progress.map((item) => (
            <Link className="entity-card object-progress-card" key={item.object_id} to={`/admin/objects/${item.object_id}`}>
              <div className="object-progress-head">
                <div className="stack compact-stack">
                  <span className="eyebrow">Projekt</span>
                  <strong>{item.object}</strong>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="object-progress-copy">Aktueller Fortschritt und gebuchte Stunden pro Projekt.</p>
              <div className="mini-progress"><i style={{ width: `${item.progress_percent}%` }} /><span>{item.progress_percent}%</span></div>
              <div className="object-progress-foot">
                <span>Gebuchte Stunden</span>
                <strong>{formatHours(hoursByObjectId.get(item.object_id) || 0)}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
