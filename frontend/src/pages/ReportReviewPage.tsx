import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ReportComments } from "../components/ReportComments";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

const STAGE_LABELS: Record<string, string> = {
  draft: "Чернетка",
  submitted: "Очікує бригадира",
  foreman_approved: "Очікує адміністратора",
  admin_approved: "Фінально погоджено",
  rejected: "Відхилено",
  change_requested: "Потрібні зміни",
};

export function ReportReviewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
  }

  useEffect(load, [id]);

  async function setStatus(status: string) {
    setSaving(true);
    try {
      await api.patch(`/daily-reports/${id}/status`, { status, rejection_reason: status === "rejected" || status === "change_requested" ? "Потрібно уточнити опис робіт або додати фото." : null });
      await api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
      pushToast({
        tone: "success",
        title: status === "foreman_approved" ? "Звіт погоджено бригадиром" : status === "admin_approved" ? "Звіт фінально погоджено" : "Статус оновлено",
        description: "Зміни до етапу погодження збережено."
      });
    } finally {
      setSaving(false);
    }
  }

  if (!report) {
    return <section className="table-card">Завантаження...</section>;
  }

  const roleCode = user?.role.code;
  const foremanActions = roleCode === "foreman";
  const adminActions = roleCode === "admin";

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
          <div className="detail-tile"><span>План робіт</span><strong>{report.work_plan_item?.title || "не прив'язано"}</strong></div>
          <div className="detail-tile"><span>Початок</span><strong>{report.start_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>Завершення</span><strong>{report.end_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>Робочий час</span><strong>{report.worked_hours.toFixed(2)} h</strong></div>
          <div className="detail-tile"><span>Обсяг</span><strong>{report.completed_volume ? `${report.completed_volume} ${report.work_plan_item?.unit || ""}` : "не вказано"}</strong></div>
        </div>
        <label className="field">Опис робіт<textarea value={report.work_description} readOnly /></label>
        {report.media_note && <div className="warning-note">{report.media_note}</div>}
        <div className="photo-grid">
          {report.photos.length ? report.photos.map((photo) => <div className="photo-card" key={photo.id}>{photo.caption || photo.file_name}</div>) : <div className="photo-card">Фото не додано</div>}
        </div>
        <div className="summary-grid-desktop report-stage-grid">
          <article className="summary-tile"><p>Етап</p><strong>{STAGE_LABELS[report.status] || report.status}</strong></article>
          <article className="summary-tile"><p>Бригадир</p><strong>{report.foreman_reviewed_at ? new Date(report.foreman_reviewed_at).toLocaleString("uk-UA") : "Очікується"}</strong></article>
          <article className="summary-tile"><p>Адміністратор</p><strong>{report.admin_reviewed_at ? new Date(report.admin_reviewed_at).toLocaleString("uk-UA") : "Очікується"}</strong></article>
        </div>
        <ReportComments reportId={report.id} />
      </section>
      <aside className="table-card stack sticky-actions">
        <div>
          <h2 className="section-title">Погодження</h2>
          <p className="section-subtitle">Статус, етап і доступні дії</p>
        </div>
        <div className="summary-card"><span className="text-muted">Поточний статус</span><StatusBadge status={report.status} /></div>
        {foremanActions ? <button className="btn btn-primary btn-block" disabled={saving} onClick={() => setStatus("foreman_approved")} type="button">Погодити як бригадир</button> : null}
        {adminActions ? <button className="btn btn-primary btn-block" disabled={saving || report.status !== "foreman_approved"} onClick={() => setStatus("admin_approved")} type="button">Фінально погодити</button> : null}
        <button className="btn btn-ghost btn-block" disabled={saving} onClick={() => setStatus("rejected")} type="button">Відхилити</button>
        <button className="btn btn-secondary btn-block" disabled={saving} onClick={() => setStatus("change_requested")} type="button">Потрібні зміни</button>
        <div className="warning-note">Worker подає звіт, foreman виконує первинну перевірку, admin завершує фінальне погодження для payroll.</div>
        <Link className="btn btn-link btn-block" to="/admin/reports">Повернутися до списку</Link>
      </aside>
    </div>
  );
}
