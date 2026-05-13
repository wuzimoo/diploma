import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

export function ReportReviewPage() {
  const { id } = useParams();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
  }

  useEffect(load, [id]);

  async function setStatus(status: string) {
    setSaving(true);
    await api.patch(`/daily-reports/${id}/status`, { status, rejection_reason: status === "rejected" ? "Потрібно уточнити опис робіт або додати фото." : null });
    await api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
    setSaving(false);
  }

  if (!report) {
    return <section className="table-card">Завантаження...</section>;
  }

  return (
    <div className="review-layout">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Щоденний звіт {report.report_number}</h2>
          <p className="section-subtitle">Отримано: {new Date(report.created_at).toLocaleString("uk-UA")}</p>
        </div>
        <div className="detail-grid-desktop">
          <div className="detail-tile"><span>Працівник</span><strong>{report.employee.first_name} {report.employee.last_name}</strong></div>
          <div className="detail-tile"><span>Дата</span><strong>{report.report_date}</strong></div>
          <div className="detail-tile"><span>Об'єкт</span><strong>{report.construction_object.name}</strong></div>
          <div className="detail-tile"><span>Початок</span><strong>{report.start_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>Завершення</span><strong>{report.end_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>Робочий час</span><strong>{report.worked_hours.toFixed(2)} h</strong></div>
        </div>
        <label className="field">Опис робіт<textarea value={report.work_description} readOnly /></label>
        <div className="photo-grid">
          {report.photos.length ? report.photos.map((photo) => <div className="photo-card" key={photo.id}>{photo.caption || photo.file_name}</div>) : <div className="photo-card">Фото не додано</div>}
        </div>
      </section>
      <aside className="table-card stack sticky-actions">
        <div>
          <h2 className="section-title">Погодження</h2>
          <p className="section-subtitle">Статус і дії</p>
        </div>
        <div className="summary-card"><span className="text-muted">Поточний статус</span><StatusBadge status={report.status} /></div>
        <button className="btn btn-primary btn-block" disabled={saving} onClick={() => setStatus("approved")} type="button">Погодити</button>
        <button className="btn btn-ghost btn-block" disabled={saving} onClick={() => setStatus("rejected")} type="button">Відхилити</button>
        <button className="btn btn-secondary btn-block" disabled={saving} onClick={() => setStatus("review")} type="button">Повернути на перевірку</button>
        <div className="warning-note">Погодження підтверджує години для зарплатного та об'єктного обліку.</div>
        <Link className="btn btn-link btn-block" to="/admin/reports">Повернутися до списку</Link>
      </aside>
    </div>
  );
}

