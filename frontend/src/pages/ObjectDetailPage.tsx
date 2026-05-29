import type { CSSProperties, FormEvent } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../hooks/useToast";
import { api } from "../services/api";
import { ObjectSummary, WorkPlanItem } from "../types/api";

export function ObjectDetailPage() {
  const { id } = useParams();
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
    priority: "normal"
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
      priority: "normal"
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
      priority: item.priority
    });
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!planForm.title.trim()) {
      setPlanError("Назва етапу обов'язкова.");
      return;
    }
    if (Number(planForm.planned_volume) <= 0) {
      setPlanError("Плановий обсяг має бути більшим за 0.");
      return;
    }
    if (Number(planForm.completed_volume) < 0) {
      setPlanError("Виконаний обсяг не може бути від'ємним.");
      return;
    }
    if (planForm.planned_start && planForm.planned_end && planForm.planned_end < planForm.planned_start) {
      setPlanError("Дата завершення етапу не може бути раніше старту.");
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
      priority: planForm.priority
    };
    if (editingPlan) {
      await api.patch(`/work-plan-items/${editingPlan.id}`, payload);
      pushToast({ tone: "success", title: "Етап оновлено", description: "План робіт синхронізовано." });
    } else {
      await api.post("/work-plan-items", payload);
      pushToast({ tone: "success", title: "Етап додано", description: "Новий етап з'явився у плані робіт." });
    }
    setPlanEditorOpen(false);
    setEditingPlan(null);
    loadSummary();
  }

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
        <div className="section-head">
          <h3 className="section-title">План робіт</h3>
          <button className="btn btn-secondary btn-sm" type="button" onClick={openCreatePlan}><Plus size={16} />Додати етап</button>
        </div>
        {planEditorOpen ? (
          <form className="planner-editor" onSubmit={savePlan}>
            <div className="section-head">
              <strong>{editingPlan ? "Редагувати етап" : "Новий етап"}</strong>
              <button className="icon-btn" type="button" aria-label="Закрити редактор плану" onClick={() => { setPlanEditorOpen(false); setEditingPlan(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="field-row">
              <label className="field">Назва<input value={planForm.title} onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })} required /></label>
              <label className="field">Бригада<select value={planForm.crew_id} onChange={(event) => setPlanForm({ ...planForm, crew_id: event.target.value })}>
                <option value="">Без прив'язки</option>
                {summary.crews.map((crew) => <option key={crew.id} value={crew.id}>{crew.name}</option>)}
              </select></label>
            </div>
            <label className="field">Опис<textarea value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} /></label>
            <div className="field-row planner-fields">
              <label className="field">Плановий обсяг<input min="0" step="0.1" type="number" value={planForm.planned_volume} onChange={(event) => setPlanForm({ ...planForm, planned_volume: event.target.value })} /></label>
              <label className="field">Виконано<input min="0" step="0.1" type="number" value={planForm.completed_volume} onChange={(event) => setPlanForm({ ...planForm, completed_volume: event.target.value })} /></label>
            </div>
            <div className="field-row planner-fields">
              <label className="field">Одиниця<input value={planForm.unit} onChange={(event) => setPlanForm({ ...planForm, unit: event.target.value })} /></label>
              <label className="field">Статус<select value={planForm.status} onChange={(event) => setPlanForm({ ...planForm, status: event.target.value })}>
                <option value="planned">planned</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
                <option value="blocked">blocked</option>
              </select></label>
            </div>
            <div className="field-row planner-fields">
              <label className="field">Початок<input type="date" value={planForm.planned_start} onChange={(event) => setPlanForm({ ...planForm, planned_start: event.target.value })} /></label>
              <label className="field">Фініш<input type="date" value={planForm.planned_end} onChange={(event) => setPlanForm({ ...planForm, planned_end: event.target.value })} /></label>
            </div>
            <div className="section-head">
              <label className="field planner-priority">Пріоритет<select value={planForm.priority} onChange={(event) => setPlanForm({ ...planForm, priority: event.target.value })}>
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select></label>
              <button className="btn btn-primary" type="submit">{editingPlan ? "Зберегти" : "Створити етап"}</button>
            </div>
            {planError ? <div className="form-error">{planError}</div> : null}
          </form>
        ) : null}
        <div className="planner-list">
          {summary.work_plan_items.map((item) => {
            const percent = item.planned_volume ? Math.min(100, Math.round((item.completed_volume / item.planned_volume) * 100)) : 0;
            return (
              <article className="planner-item" key={item.id}>
                <div className="report-item-top"><strong>{item.title}</strong><div className="planner-actions"><StatusBadge status={item.status} /><button className="icon-btn" type="button" aria-label={`Редагувати ${item.title}`} onClick={() => openEditPlan(item)}><Pencil size={16} /></button></div></div>
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
