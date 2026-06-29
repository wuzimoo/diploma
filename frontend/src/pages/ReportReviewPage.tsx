import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ReportComments } from "../components/ReportComments";
import { ReportMediaGallery } from "../components/ReportMediaGallery";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../hooks/useI18n";
import { useToast } from "../hooks/useToast";
import { formatDate, formatDateTime, formatHours } from "../lib/format";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

export function ReportReviewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, translateText } = useI18n();
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
      await api.patch(`/daily-reports/${id}/status`, { status, rejection_reason: status === "rejected" || status === "change_requested" ? "Bitte Arbeitsbeschreibung ergänzen oder Fotos nachreichen." : null });
      await api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
      pushToast({
        tone: "success",
        title: status === "foreman_approved" ? t("Vom Polier freigegeben") : status === "admin_approved" ? t("Final freigegeben") : t("Status aktualisiert"),
        description: t("Der Freigabestatus wurde gespeichert.")
      });
    } finally {
      setSaving(false);
    }
  }

  if (!report) {
    return <section className="table-card">{t("Wird geladen...")}</section>;
  }

  const roleCode = user?.role.code;
  const foremanActions = roleCode === "foreman";
  const adminActions = roleCode === "admin";

  return (
    <div className="review-layout">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">{t("Tagesbericht {report}", { report: report.report_number })}</h2>
          <p className="section-subtitle">{t("Eingegangen: {date}", { date: formatDateTime(report.created_at) })}</p>
        </div>
        <div className="detail-grid-desktop">
          <div className="detail-tile"><span>{t("Mitarbeiter")}</span><strong>{report.employee.first_name} {report.employee.last_name}</strong></div>
          <div className="detail-tile"><span>{t("Datum")}</span><strong>{formatDate(report.report_date)}</strong></div>
          <div className="detail-tile"><span>{t("Projekt")}</span><strong>{translateText(report.construction_object.name)}</strong></div>
          <div className="detail-tile"><span>{t("Arbeitspaket")}</span><strong>{translateText(report.work_plan_item?.title) || t("nicht zugeordnet")}</strong></div>
          <div className="detail-tile"><span>{t("Start")}</span><strong>{report.start_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>{t("Ende")}</span><strong>{report.end_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>{t("Arbeitszeit")}</span><strong>{formatHours(report.worked_hours)}</strong></div>
          <div className="detail-tile"><span>{t("Menge")}</span><strong>{report.completed_volume ? `${report.completed_volume} ${report.work_plan_item?.unit || ""}` : t("nicht angegeben")}</strong></div>
        </div>
        <label className="field">{t("Arbeitsbeschreibung")}<textarea value={translateText(report.work_description)} readOnly /></label>
        {report.media_note && <div className="warning-note">{translateText(report.media_note)}</div>}
        <ReportMediaGallery photos={report.photos} />
        <div className="summary-grid-desktop report-stage-grid">
          <article className="summary-tile"><p>{t("Phase")}</p><strong><StatusBadge status={report.status} /></strong></article>
          <article className="summary-tile"><p>{t("Polier")}</p><strong>{report.foreman_reviewed_at ? formatDateTime(report.foreman_reviewed_at) : t("Ausstehend")}</strong></article>
          <article className="summary-tile"><p>{t("Verwaltung")}</p><strong>{report.admin_reviewed_at ? formatDateTime(report.admin_reviewed_at) : t("Ausstehend")}</strong></article>
        </div>
        <ReportComments reportId={report.id} />
      </section>
      <aside className="table-card stack sticky-actions">
        <div>
          <h2 className="section-title">{t("Freigabe")}</h2>
          <p className="section-subtitle">{t("Status, Phase und verfügbare Aktionen")}</p>
        </div>
        <div className="summary-card review-status-card"><span className="text-muted">{t("Aktueller Status")}</span><StatusBadge status={report.status} /></div>
        {foremanActions ? <button className="btn btn-primary btn-block" disabled={saving} onClick={() => setStatus("foreman_approved")} type="button">{t("Als Polier freigeben")}</button> : null}
        {adminActions ? <button className="btn btn-primary btn-block" disabled={saving || report.status !== "foreman_approved"} onClick={() => setStatus("admin_approved")} type="button">{t("Final freigeben")}</button> : null}
        <button className="btn btn-ghost btn-block" disabled={saving} onClick={() => setStatus("rejected")} type="button">{t("Ablehnen")}</button>
        <button className="btn btn-secondary btn-block" disabled={saving} onClick={() => setStatus("change_requested")} type="button">{t("Nacharbeit anfordern")}</button>
        <div className="warning-note review-note">{t("Mitarbeiter reichen Berichte ein, Poliere prüfen vor und die Verwaltung gibt für die Lohnabrechnung final frei.")}</div>
        <Link className="btn btn-link btn-block" to="/admin/reports">{t("Zur Liste")}</Link>
      </aside>
    </div>
  );
}
