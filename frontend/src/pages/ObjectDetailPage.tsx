import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { ObjectSummary } from "../types/api";

export function ObjectDetailPage() {
  const { id } = useParams();
  const [summary, setSummary] = useState<ObjectSummary | null>(null);

  useEffect(() => {
    api.get<ObjectSummary>(`/objects/${id}/summary`).then((response) => setSummary(response.data));
  }, [id]);

  const planPercent = useMemo(() => {
    if (!summary) return 0;
    const planned = summary.work_plan_items.reduce((total, item) => total + item.planned_volume, 0);
    const done = summary.work_plan_items.reduce((total, item) => total + item.completed_volume, 0);
    return planned ? Math.round((done / planned) * 100) : summary.progress_percent;
  }, [summary]);

  if (!summary) return <section className="table-card">Завантаження об'єкта...</section>;

  return (
    <section className="stack">
      <div className="object-hero">
        <div className="stack">
          <Link className="back-link" to="/admin/objects">Назад до об'єктів</Link>
          <div className="report-item-top">
            <div>
              <h2>{summary.object.name}</h2>
              <p>{summary.object.city} · {summary.object.address}</p>
            </div>
            <StatusBadge status={summary.object.status} />
          </div>
          <p>{summary.object.description}</p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${planPercent}%` } as CSSProperties} aria-label={`Прогрес ${planPercent}%`}><strong>{planPercent}%</strong><span>виконано</span></div>
      </div>

      <div className="summary-grid-desktop">
        <article className="summary-tile"><p>Працівники</p><strong>{summary.employees.length}</strong></article>
        <article className="summary-tile"><p>Бригади</p><strong>{summary.crews.length}</strong></article>
        <article className="summary-tile"><p>Години</p><strong>{summary.total_hours.toFixed(1)}</strong></article>
        <article className="summary-tile"><p>Витрати EUR</p><strong>{summary.expense_total.toFixed(0)}</strong></article>
      </div>

      <section className="table-card stack">
        <div>
          <h3 className="section-title">Опис і строки</h3>
          <p className="section-subtitle">{summary.object.work_scope}</p>
        </div>
        <div className="detail-grid-desktop">
          <div className="detail-tile"><span>План старт</span><strong>{summary.object.planned_start_date || summary.object.start_date}</strong></div>
          <div className="detail-tile"><span>План фініш</span><strong>{summary.object.planned_end_date || "не задано"}</strong></div>
          <div className="detail-tile"><span>Відповідальний</span><strong>{summary.object.site_manager || "не задано"}</strong></div>
        </div>
      </section>

      <section className="table-card stack">
        <h3 className="section-title">План робіт</h3>
        <div className="planner-list">
          {summary.work_plan_items.map((item) => {
            const percent = item.planned_volume ? Math.min(100, Math.round((item.completed_volume / item.planned_volume) * 100)) : 0;
            return (
              <article className="planner-item" key={item.id}>
                <div className="report-item-top"><strong>{item.title}</strong><StatusBadge status={item.status} /></div>
                <p>{item.description}</p>
                <div className="bar-row compact"><span>{item.completed_volume}/{item.planned_volume} {item.unit}</span><div><i style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="table-card stack">
        <h3 className="section-title">Бригади і працівники</h3>
        <div className="cards-grid">
          {summary.crews.map((crew) => (
            <article className="entity-card" key={crew.id}>
              <strong>{crew.name}</strong>
              <span>{crew.specialization}</span>
              <p>{crew.members.map((member) => `${member.employee?.first_name} ${member.employee?.last_name}`).join(", ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="table-card stack">
        <h3 className="section-title">Останні звіти</h3>
        {summary.reports.map((report) => (
          <Link className="report-item" key={report.id} to={`/admin/reports/${report.id}`}>
            <div className="report-item-top"><strong>{report.report_number}</strong><StatusBadge status={report.status} /></div>
            <p>{report.employee.first_name} {report.employee.last_name} · {report.work_description}</p>
          </Link>
        ))}
      </section>
    </section>
  );
}
