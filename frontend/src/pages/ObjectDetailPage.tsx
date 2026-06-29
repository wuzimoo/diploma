import type { CSSProperties, FormEvent } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useI18n } from "../hooks/useI18n";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatDate, formatHours } from "../lib/format";
import { api } from "../services/api";
import { ObjectSummary, WorkPlanItem } from "../types/api";

const PLAN_STATUS_LABELS: Record<string, string> = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  done: "Abgeschlossen",
  blocked: "Blockiert",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  urgent: "Dringend",
};

export function ObjectDetailPage() {
  const { id } = useParams();
  const { t, translateText } = useI18n();
  const { pushToast } = useToast();
  const [summary, setSummary] = useState<ObjectSummary | null>(null);
  const [editingPlan, setEditingPlan] = useState<WorkPlanItem | null>(null);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    crew_id: "",
    planned_volume: "0",
    completed_volume: "0",
    unit: "m",
    status: "planned",
    planned_start: "",
    planned_end: "",
    priority: "normal",
  });

  function loadSummary() {
    api.get<ObjectSummary>(`/objects/${id}/summary`).then((response) => setSummary(response.data));
  }

  useEffect(() => {
    loadSummary();
  }, [id]);

  const planPercent = useMemo(() => {
    if (!summary) return 0;
    const planned = summary.work_plan_items.reduce((total, item) => total + item.planned_volume, 0);
    const done = summary.work_plan_items.reduce((total, item) => total + item.completed_volume, 0);
    return planned ? Math.round((done / planned) * 100) : summary.progress_percent;
  }, [summary]);

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanEditorOpen(true);
    setPlanError("");
    setPlanForm({
      title: "",
      description: "",
      crew_id: summary?.crews[0]?.id ? String(summary.crews[0].id) : "",
      planned_volume: "0",
      completed_volume: "0",
      unit: "m",
      status: "planned",
      planned_start: "",
      planned_end: "",
      priority: "normal",
    });
  }

  function openEditPlan(item: WorkPlanItem) {
    setEditingPlan(item);
    setPlanEditorOpen(true);
    setPlanError("");
    setPlanForm({
      title: item.title,
      description: item.description || "",
      crew_id: item.crew_id ? String(item.crew_id) : "",
      planned_volume: String(item.planned_volume),
      completed_volume: String(item.completed_volume),
      unit: item.unit,
      status: item.status,
      planned_start: item.planned_start || "",
      planned_end: item.planned_end || "",
      priority: item.priority,
    });
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!planForm.title.trim()) {
      setPlanError(t("Der Name des Arbeitspakets ist erforderlich."));
      return;
    }
    if (Number(planForm.planned_volume) <= 0) {
      setPlanError(t("Die geplante Menge muss größer als 0 sein."));
      return;
    }
    if (Number(planForm.completed_volume) < 0) {
      setPlanError(t("Die erledigte Menge darf nicht negativ sein."));
      return;
    }
    if (planForm.planned_start && planForm.planned_end && planForm.planned_end < planForm.planned_start) {
      setPlanError(t("Das Enddatum darf nicht vor dem Startdatum liegen."));
      return;
    }
    setPlanError("");
    const payload = {
      construction_object_id: Number(id),
      crew_id: planForm.crew_id ? Number(planForm.crew_id) : null,
      title: planForm.title,
      description: planForm.description || null,
      planned_volume: Number(planForm.planned_volume),
      completed_volume: Number(planForm.completed_volume),
      unit: planForm.unit,
      status: planForm.status,
      planned_start: planForm.planned_start || null,
      planned_end: planForm.planned_end || null,
      priority: planForm.priority,
    };
    if (editingPlan) {
      await api.patch(`/work-plan-items/${editingPlan.id}`, payload);
      pushToast({ tone: "success", title: t("Arbeitspaket aktualisiert"), description: t("Der Bauplan wurde synchronisiert.") });
    } else {
      await api.post("/work-plan-items", payload);
      pushToast({ tone: "success", title: t("Arbeitspaket angelegt"), description: t("Das neue Paket ist im Bauplan sichtbar.") });
    }
    setPlanEditorOpen(false);
    setEditingPlan(null);
    loadSummary();
  }

  if (!summary) return <section className="table-card">{t("Projekt wird geladen...")}</section>;

  return (
    <section className="stack">
      <div className="object-hero">
        <div className="stack">
          <Link className="back-link" to="/admin/objects">{t("Zurück zu den Projekten")}</Link>
          <div className="report-item-top">
            <div>
              <h2>{translateText(summary.object.name)}</h2>
              <p>{summary.object.city} · {summary.object.address}</p>
            </div>
            <StatusBadge status={summary.object.status} />
          </div>
          <p>{translateText(summary.object.description || summary.object.work_scope)}</p>
        </div>
        <div className="object-progress-card">
          <div className="progress-ring" style={{ "--progress": `${planPercent}%` } as CSSProperties} aria-label={t("Fortschritt {percent}%", { percent: planPercent })}>
            <div className="progress-ring-inner">
              <strong>{planPercent}%</strong>
              <span>{t("erledigt")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="summary-grid-desktop">
        <article className="summary-tile"><p>{t("Mitarbeiter")}</p><strong>{summary.employees.length}</strong></article>
        <article className="summary-tile"><p>{t("Kolonnen")}</p><strong>{summary.crews.length}</strong></article>
        <article className="summary-tile"><p>{t("Stunden")}</p><strong>{formatHours(summary.total_hours, 1)}</strong></article>
        <article className="summary-tile"><p>{t("Kosten")}</p><strong>{formatCurrency(summary.expense_total)}</strong></article>
      </div>

      <section className="table-card stack">
        <div>
          <h3 className="section-title">{t("Leistungsbild und Termine")}</h3>
          <p className="section-subtitle">{translateText(summary.object.work_scope)}</p>
        </div>
        <div className="detail-grid-desktop">
          <div className="detail-tile"><span>{t("Planstart")}</span><strong>{summary.object.planned_start_date || summary.object.start_date ? formatDate(summary.object.planned_start_date || summary.object.start_date || "") : t("offen")}</strong></div>
          <div className="detail-tile"><span>{t("Planende")}</span><strong>{summary.object.planned_end_date ? formatDate(summary.object.planned_end_date) : t("offen")}</strong></div>
          <div className="detail-tile"><span>{t("Bauleitung")}</span><strong>{translateText(summary.object.site_manager) || t("offen")}</strong></div>
        </div>
      </section>

      <section className="table-card stack">
        <div className="section-head">
          <h3 className="section-title">{t("Bauplan")}</h3>
          <button className="btn btn-secondary btn-sm" type="button" onClick={openCreatePlan}><Plus size={16} />{t("Arbeitspaket")}</button>
        </div>
        {planEditorOpen ? (
          <form className="planner-editor" onSubmit={savePlan}>
            <div className="section-head">
              <strong>{editingPlan ? t("Arbeitspaket bearbeiten") : t("Neues Arbeitspaket")}</strong>
              <button className="icon-btn" type="button" aria-label={t("Planeditor schliessen")} onClick={() => { setPlanEditorOpen(false); setEditingPlan(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="field-row">
              <label className="field">{t("Titel")}<input value={planForm.title} onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })} required /></label>
              <label className="field">{t("Team")}<select value={planForm.crew_id} onChange={(event) => setPlanForm({ ...planForm, crew_id: event.target.value })}>
                <option value="">{t("Ohne Zuordnung")}</option>
                {summary.crews.map((crew) => <option key={crew.id} value={crew.id}>{translateText(crew.name)}</option>)}
              </select></label>
            </div>
            <label className="field">{t("Beschreibung")}<textarea value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} /></label>
            <div className="field-row planner-fields">
              <label className="field">Geplante Menge<input min="0" step="0.1" type="number" value={planForm.planned_volume} onChange={(event) => setPlanForm({ ...planForm, planned_volume: event.target.value })} /></label>
              <label className="field">Erledigte Menge<input min="0" step="0.1" type="number" value={planForm.completed_volume} onChange={(event) => setPlanForm({ ...planForm, completed_volume: event.target.value })} /></label>
            </div>
            <div className="field-row planner-fields">
              <label className="field">Einheit<input value={planForm.unit} onChange={(event) => setPlanForm({ ...planForm, unit: event.target.value })} /></label>
              <label className="field">Status<select value={planForm.status} onChange={(event) => setPlanForm({ ...planForm, status: event.target.value })}>
                <option value="planned">Geplant</option>
                <option value="in_progress">In Arbeit</option>
                <option value="done">Abgeschlossen</option>
                <option value="blocked">Blockiert</option>
              </select></label>
            </div>
            <div className="field-row planner-fields">
              <label className="field">Start<input type="date" value={planForm.planned_start} onChange={(event) => setPlanForm({ ...planForm, planned_start: event.target.value })} /></label>
              <label className="field">Ende<input type="date" value={planForm.planned_end} onChange={(event) => setPlanForm({ ...planForm, planned_end: event.target.value })} /></label>
            </div>
            <div className="section-head">
              <label className="field planner-priority">Prioritat<select value={planForm.priority} onChange={(event) => setPlanForm({ ...planForm, priority: event.target.value })}>
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
                <option value="urgent">Dringend</option>
              </select></label>
              <button className="btn btn-primary" type="submit">{editingPlan ? t("Speichern") : t("Paket anlegen")}</button>
            </div>
            {planError ? <div className="form-error">{planError}</div> : null}
          </form>
        ) : null}
        <div className="planner-list">
          {summary.work_plan_items.map((item) => {
            const percent = item.planned_volume ? Math.min(100, Math.round((item.completed_volume / item.planned_volume) * 100)) : 0;
            return (
              <article className="planner-item" key={item.id}>
                <div className="report-item-top"><strong>{translateText(item.title)}</strong><div className="planner-actions"><StatusBadge status={item.status} /><button className="icon-btn" type="button" aria-label={`${translateText(item.title)} ${t("Bearbeiten")}`} onClick={() => openEditPlan(item)}><Pencil size={16} /></button></div></div>
                <p>{translateText(item.description)}</p>
                <div className="planner-meta">
                  <span>{t(PLAN_STATUS_LABELS[item.status] || item.status)}</span>
                  <span>Prioritat: {PRIORITY_LABELS[item.priority] || item.priority}</span>
                </div>
                <div className="bar-row compact"><span>{item.completed_volume}/{item.planned_volume} {item.unit}</span><div><i style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="table-card stack">
        <h3 className="section-title">{t("Teams und Mitarbeiter")}</h3>
        <div className="cards-grid">
          {summary.crews.map((crew) => (
            <article className="entity-card" key={crew.id}>
              <strong>{translateText(crew.name)}</strong>
              <span>{translateText(crew.specialization)}</span>
              <p>{crew.members.filter((member) => member.is_active).map((member) => `${member.employee?.first_name} ${member.employee?.last_name}`).join(", ") || t("Noch keine Teammitglieder hinterlegt")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="table-card stack">
        <h3 className="section-title">{t("Letzte Berichte")}</h3>
        {summary.reports.length ? summary.reports.map((report) => (
          <Link className="report-item" key={report.id} to={`/admin/reports/${report.id}`}>
            <div className="report-item-top"><strong>{report.report_number}</strong><StatusBadge status={report.status} /></div>
            <p>{report.employee.first_name} {report.employee.last_name} · {translateText(report.work_description)}</p>
            <div className="report-meta"><span>{formatDate(report.report_date)}</span><strong>{formatHours(report.worked_hours)}</strong></div>
          </Link>
        )) : <div className="empty-state"><strong>{t("Noch keine Berichte")}</strong><span>{t("Neu erfasste Berichte erscheinen hier automatisch.")}</span></div>}
      </section>
    </section>
  );
}
