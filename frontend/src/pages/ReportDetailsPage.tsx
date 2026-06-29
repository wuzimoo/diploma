import { FormEvent, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useParams } from "react-router-dom";

import { ReportComments } from "../components/ReportComments";
import { ReportMediaGallery } from "../components/ReportMediaGallery";
import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../hooks/useI18n";
import { useToast } from "../hooks/useToast";
import { formatDate, formatHours } from "../lib/format";
import { api } from "../services/api";
import { DailyReport } from "../types/api";

function canEdit(report: DailyReport) {
  return ["draft", "rejected", "change_requested"].includes(report.status);
}

export function ReportDetailsPage() {
  const { id } = useParams();
  const { t, translateText } = useI18n();
  const { pushToast } = useToast();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    start_time: "08:00",
    end_time: "16:30",
    break_minutes: 30,
    completed_volume: "",
    work_description: ""
  });

  function load() {
    api.get<DailyReport>(`/daily-reports/${id}`).then((response) => {
      setReport(response.data);
      setForm({
        start_time: response.data.start_time.slice(0, 5),
        end_time: response.data.end_time.slice(0, 5),
        break_minutes: response.data.break_minutes,
        completed_volume: response.data.completed_volume ? String(response.data.completed_volume) : "",
        work_description: response.data.work_description
      });
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!report) return;
    if (!form.work_description.trim() || form.work_description.trim().length < 5) {
      setError(t("Die Arbeitsbeschreibung muss mindestens 5 Zeichen lang sein."));
      return;
    }
    if (form.end_time <= form.start_time) {
      setError(t("Die Endzeit muss nach der Startzeit liegen."));
      return;
    }
    if (form.break_minutes < 0) {
      setError(t("Die Pause darf nicht negativ sein."));
      return;
    }
    setError("");
    await api.patch(`/daily-reports/${report.id}`, {
      start_time: `${form.start_time}:00`,
      end_time: `${form.end_time}:00`,
      break_minutes: form.break_minutes,
      completed_volume: form.completed_volume ? Number(form.completed_volume) : null,
      work_description: form.work_description.trim()
    });
    pushToast({ tone: "success", title: t("Bericht aktualisiert"), description: t("Die Änderungen wurden gespeichert.") });
    setEditing(false);
    load();
  }

  if (!report) {
    return <main className="mobile-content"><div className="summary-card">{t("Wird geladen...")}</div></main>;
  }

  return (
    <>
      <header className="mobile-header">
        <div className="section-head">
          <div>
            <h1>{report.report_number}</h1>
            <p>{translateText(report.construction_object.name)}</p>
          </div>
          {canEdit(report) ? <button className="icon-btn" type="button" aria-label={t("Bericht bearbeiten")} onClick={() => setEditing(true)}><Pencil size={18} /></button> : null}
        </div>
      </header>
      <main className="mobile-content">
        <section className="summary-card stack">
          <div className="report-item-top"><strong>{formatDate(report.report_date)}</strong><StatusBadge status={report.status} /></div>
          <div className="detail-grid">
            <span>{t("Mitarbeiter")}</span><strong>{report.employee.first_name} {report.employee.last_name}</strong>
            <span>{t("Projekt")}</span><strong>{translateText(report.construction_object.name)}</strong>
            <span>{t("Arbeitspaket")}</span><strong>{translateText(report.work_plan_item?.title) || t("Nicht zugeordnet")}</strong>
            <span>{t("Zeit")}</span><strong>{report.start_time.slice(0, 5)} - {report.end_time.slice(0, 5)}</strong>
            <span>{t("Stunden")}</span><strong>{formatHours(report.worked_hours)}</strong>
            <span>{t("Menge")}</span><strong>{report.completed_volume ? `${report.completed_volume} ${report.work_plan_item?.unit || ""}` : t("nicht angegeben")}</strong>
          </div>
          <p>{translateText(report.work_description)}</p>
          {report.media_note && <p className="helper">{translateText(report.media_note)}</p>}
          {report.rejection_reason && <p className="form-error">{translateText(report.rejection_reason)}</p>}
        </section>
        <ReportMediaGallery photos={report.photos} />
        <ReportComments reportId={report.id} />
      </main>
      {editing ? (
        <div className="modal-backdrop" onClick={() => setEditing(false)} role="presentation">
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <h3 className="section-title">{t("Bericht bearbeiten")}</h3>
                <p className="section-subtitle">{t("Bearbeitung ist nur vor der Freigabe durch Polier oder Verwaltung möglich.")}</p>
              </div>
              <button className="icon-btn" type="button" aria-label={t("Schliessen")} onClick={() => setEditing(false)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={save}>
              <div className="field-row">
                <label className="field">{t("Start")}<input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></label>
                <label className="field">{t("Ende")}<input type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></label>
              </div>
              <label className="field">{t("Pause, Min.")}<input type="number" min="0" value={form.break_minutes} onChange={(event) => setForm({ ...form, break_minutes: Number(event.target.value) })} /></label>
              <label className="field">{t("Ausgeführte Menge")}<input type="number" min="0" step="0.1" value={form.completed_volume} onChange={(event) => setForm({ ...form, completed_volume: event.target.value })} /></label>
              <label className="field">{t("Arbeitsbeschreibung")}<textarea value={form.work_description} onChange={(event) => setForm({ ...form, work_description: event.target.value })} /></label>
              {error ? <div className="form-error">{error}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>{t("Abbrechen")}</button>
                <button className="btn btn-primary" type="submit">{t("Speichern")}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
