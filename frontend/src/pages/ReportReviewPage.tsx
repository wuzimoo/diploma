import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ReportComments } from "../components/ReportComments";
import { ReportMediaGallery } from "../components/ReportMediaGallery";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatDate, formatDateTime, formatHours } from "../lib/format";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

const STAGE_LABELS: Record<string, string> = {
  draft: "Entwurf",
  submitted: "Wartet auf den Polier",
  foreman_approved: "Wartet auf die Verwaltung",
  admin_approved: "Final freigegeben",
  rejected: "Abgelehnt",
  change_requested: "Nacharbeit angefordert",
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
      await api.patch(`/daily-reports/${id}/status`, { status, rejection_reason: status === "rejected" || status === "change_requested" ? "Bitte Arbeitsbeschreibung erganzen oder Fotos nachreichen." : null });
      await api.get<DailyReport>(`/daily-reports/${id}`).then((response) => setReport(response.data));
      pushToast({
        tone: "success",
        title: status === "foreman_approved" ? "Vom Polier freigegeben" : status === "admin_approved" ? "Final freigegeben" : "Status aktualisiert",
        description: "Der Freigabestatus wurde gespeichert."
      });
    } finally {
      setSaving(false);
    }
  }

  if (!report) {
    return <section className="table-card">Wird geladen...</section>;
  }

  const roleCode = user?.role.code;
  const foremanActions = roleCode === "foreman";
  const adminActions = roleCode === "admin";

  return (
    <div className="review-layout">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Tagesbericht {report.report_number}</h2>
          <p className="section-subtitle">Eingegangen: {formatDateTime(report.created_at)}</p>
        </div>
        <div className="detail-grid-desktop">
          <div className="detail-tile"><span>Mitarbeiter</span><strong>{report.employee.first_name} {report.employee.last_name}</strong></div>
          <div className="detail-tile"><span>Datum</span><strong>{formatDate(report.report_date)}</strong></div>
          <div className="detail-tile"><span>Projekt</span><strong>{report.construction_object.name}</strong></div>
          <div className="detail-tile"><span>Arbeitspaket</span><strong>{report.work_plan_item?.title || "nicht zugeordnet"}</strong></div>
          <div className="detail-tile"><span>Start</span><strong>{report.start_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>Ende</span><strong>{report.end_time.slice(0, 5)}</strong></div>
          <div className="detail-tile"><span>Arbeitszeit</span><strong>{formatHours(report.worked_hours)}</strong></div>
          <div className="detail-tile"><span>Menge</span><strong>{report.completed_volume ? `${report.completed_volume} ${report.work_plan_item?.unit || ""}` : "nicht angegeben"}</strong></div>
        </div>
        <label className="field">Arbeitsbeschreibung<textarea value={report.work_description} readOnly /></label>
        {report.media_note && <div className="warning-note">{report.media_note}</div>}
        <ReportMediaGallery photos={report.photos} />
        <div className="summary-grid-desktop report-stage-grid">
          <article className="summary-tile"><p>Phase</p><strong>{STAGE_LABELS[report.status] || report.status}</strong></article>
          <article className="summary-tile"><p>Polier</p><strong>{report.foreman_reviewed_at ? formatDateTime(report.foreman_reviewed_at) : "Ausstehend"}</strong></article>
          <article className="summary-tile"><p>Verwaltung</p><strong>{report.admin_reviewed_at ? formatDateTime(report.admin_reviewed_at) : "Ausstehend"}</strong></article>
        </div>
        <ReportComments reportId={report.id} />
      </section>
      <aside className="table-card stack sticky-actions">
        <div>
          <h2 className="section-title">Freigabe</h2>
          <p className="section-subtitle">Status, Phase und verfugbare Aktionen</p>
        </div>
        <div className="summary-card"><span className="text-muted">Aktueller Status</span><StatusBadge status={report.status} /></div>
        {foremanActions ? <button className="btn btn-primary btn-block" disabled={saving} onClick={() => setStatus("foreman_approved")} type="button">Als Polier freigeben</button> : null}
        {adminActions ? <button className="btn btn-primary btn-block" disabled={saving || report.status !== "foreman_approved"} onClick={() => setStatus("admin_approved")} type="button">Final freigeben</button> : null}
        <button className="btn btn-ghost btn-block" disabled={saving} onClick={() => setStatus("rejected")} type="button">Ablehnen</button>
        <button className="btn btn-secondary btn-block" disabled={saving} onClick={() => setStatus("change_requested")} type="button">Nacharbeit anfordern</button>
        <div className="warning-note">Mitarbeiter reichen Berichte ein, Poliere prufen vor und die Verwaltung gibt fur die Lohnabrechnung final frei.</div>
        <Link className="btn btn-link btn-block" to="/admin/reports">Zur Liste</Link>
      </aside>
    </div>
  );
}
