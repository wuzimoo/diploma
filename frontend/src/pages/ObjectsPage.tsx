import { FormEvent, useEffect, useState } from "react";
import { Archive, Pencil, X } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { ConstructionObject } from "../types/api";
import { useToast } from "../hooks/useToast";

const objectDefaults = {
  name: "",
  code: "",
  city: "Berlin",
  address: "",
  client: "",
  planned_start_date: new Date().toISOString().slice(0, 10),
  planned_end_date: "",
  budget: "250000",
  description: "",
  work_scope: ""
};

function objectError(form: typeof objectDefaults) {
  if (!form.name.trim() || !form.code.trim()) return "Назва та код об'єкта обов'язкові.";
  if (!form.city.trim() || !form.address.trim()) return "Місто та адреса обов'язкові.";
  if (form.budget && Number(form.budget) < 0) return "Бюджет не може бути від'ємним.";
  if (form.planned_start_date && form.planned_end_date && form.planned_end_date < form.planned_start_date) return "Дата завершення не може бути раніше за дату старту.";
  return "";
}

export function ObjectsPage() {
  const { pushToast } = useToast();
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [form, setForm] = useState(objectDefaults);
  const [editingObject, setEditingObject] = useState<ConstructionObject | null>(null);
  const [editForm, setEditForm] = useState(objectDefaults);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");

  function load() {
    api
      .get<ConstructionObject[]>("/objects", {
        params: {
          search: search || undefined,
          status_filter: statusFilter === "all" ? undefined : statusFilter
        }
      })
      .then((response) => setObjects(response.data));
  }

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  async function createObject(event: FormEvent) {
    event.preventDefault();
    const error = objectError(form);
    setFormError(error);
    if (error) return;
    await api.post("/objects", {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      client: form.client.trim() || null,
      description: form.description.trim() || null,
      work_scope: form.work_scope.trim() || null,
      budget: form.budget ? Number(form.budget) : 0,
      priority: "normal",
      progress_percent: 0,
      status: "planning",
      start_date: form.planned_start_date || null
    });
    setForm(objectDefaults);
    setFormError("");
    pushToast({ tone: "success", title: "Об'єкт створено", description: "Новий будівельний об'єкт додано до реєстру." });
    load();
  }

  function openEditor(object: ConstructionObject) {
    setEditingObject(object);
    setEditError("");
    setEditForm({
      name: object.name,
      code: object.code,
      city: object.city,
      address: object.address,
      client: object.client || "",
      planned_start_date: object.planned_start_date || object.start_date || "",
      planned_end_date: object.planned_end_date || "",
      budget: object.budget ? String(object.budget) : "0",
      description: object.description || "",
      work_scope: object.work_scope || ""
    });
  }

  async function saveObject(event: FormEvent) {
    event.preventDefault();
    if (!editingObject) return;
    const error = objectError(editForm);
    setEditError(error);
    if (error) return;
    await api.patch(`/objects/${editingObject.id}`, {
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      city: editForm.city.trim(),
      address: editForm.address.trim(),
      client: editForm.client.trim() || null,
      description: editForm.description.trim() || null,
      work_scope: editForm.work_scope.trim() || null,
      planned_start_date: editForm.planned_start_date || null,
      planned_end_date: editForm.planned_end_date || null,
      start_date: editForm.planned_start_date || null,
      budget: editForm.budget ? Number(editForm.budget) : 0
    });
    pushToast({ tone: "success", title: "Об'єкт оновлено", description: "Деталі об'єкта збережено." });
    setEditingObject(null);
    load();
  }

  async function archiveObject(object: ConstructionObject) {
    if (!window.confirm(`Архівувати об'єкт ${object.name}?`)) return;
    await api.patch(`/objects/${object.id}`, { status: "archived" });
    pushToast({ tone: "info", title: "Об'єкт архівовано", description: "Об'єкт більше не показується у списку активних." });
    if (editingObject?.id === object.id) setEditingObject(null);
    load();
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Будівельні об'єкти</h2>
          <p className="section-subtitle">Berlin, Brandenburg, Potsdam: строки, бюджет, опис, обсяг робіт і перехід у деталку.</p>
        </div>
        <form className="inline-form object-form" onSubmit={createObject}>
          <label className="field">Назва<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Berlin Süd - Block D" required /></label>
          <label className="field">Код<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="BER-SUD-D" required /></label>
          <label className="field">Місто<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label>
          <label className="field">Адреса<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /></label>
          <label className="field">Старт<input type="date" value={form.planned_start_date} onChange={(event) => setForm({ ...form, planned_start_date: event.target.value })} /></label>
          <label className="field">Фініш<input type="date" value={form.planned_end_date} onChange={(event) => setForm({ ...form, planned_end_date: event.target.value })} /></label>
          <label className="field">Клієнт<input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} /></label>
          <label className="field">Бюджет<input type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></label>
          <label className="field wide-field">Опис<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="field wide-field">Опис робіт<textarea value={form.work_scope} onChange={(event) => setForm({ ...form, work_scope: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit">Додати об'єкт</button>
        </form>
        {formError ? <div className="form-error">{formError}</div> : null}
      </section>
      <section className="table-card stack">
        <div className="filters">
          <label className="field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Назва, місто або код" /></label>
          <label className="field">Статус<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Усі</option><option value="active">Активні</option><option value="planning">Планування</option><option value="archived">Архів</option></select></label>
          <div className="summary-card compact-summary"><span className="text-muted">Знайдено</span><strong>{objects.length} об'єкт(и)</strong></div>
        </div>
        <div className="cards-grid">
          {objects.map((object) => (
            <article className="entity-card" key={object.id}>
              <div className="report-item-top"><strong>{object.name}</strong><StatusBadge status={object.status} /></div>
              <span>{object.city} · {object.code}</span>
              <p>{object.address}</p>
              <p>{object.description || object.work_scope || "Опис ще не додано"}</p>
              <div className="mini-progress"><i style={{ width: `${object.progress_percent || 0}%` }} /><span>{object.progress_percent || 0}%</span></div>
              <small>{object.client || "Клієнт не вказаний"} · старт {object.planned_start_date || object.start_date || "не задано"} · EUR {object.budget?.toLocaleString("uk-UA") || "0"}</small>
              <div className="card-actions">
                <Link className="btn btn-secondary btn-sm" to={`/admin/objects/${object.id}`}>Відкрити деталі</Link>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditor(object)}><Pencil size={16} />Редагувати</button>
                {object.status !== "archived" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => archiveObject(object)}><Archive size={16} />Архівувати</button> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
      {editingObject ? (
        <div className="modal-backdrop" onClick={() => setEditingObject(null)} role="presentation">
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <h3 className="section-title">Редагування об'єкта</h3>
                <p className="section-subtitle">Оновіть строки, адресу, опис та бюджет.</p>
              </div>
              <button className="icon-btn" type="button" aria-label="Закрити" onClick={() => setEditingObject(null)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={saveObject}>
              <div className="field-row">
                <label className="field">Назва<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></label>
                <label className="field">Код<input value={editForm.code} onChange={(event) => setEditForm({ ...editForm, code: event.target.value.toUpperCase() })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">Місто<input value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} required /></label>
                <label className="field">Адреса<input value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">Старт<input type="date" value={editForm.planned_start_date} onChange={(event) => setEditForm({ ...editForm, planned_start_date: event.target.value })} /></label>
                <label className="field">Фініш<input type="date" value={editForm.planned_end_date} onChange={(event) => setEditForm({ ...editForm, planned_end_date: event.target.value })} /></label>
              </div>
              <div className="field-row">
                <label className="field">Клієнт<input value={editForm.client} onChange={(event) => setEditForm({ ...editForm, client: event.target.value })} /></label>
                <label className="field">Бюджет<input type="number" min="0" value={editForm.budget} onChange={(event) => setEditForm({ ...editForm, budget: event.target.value })} /></label>
              </div>
              <label className="field">Опис<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label>
              <label className="field">Опис робіт<textarea value={editForm.work_scope} onChange={(event) => setEditForm({ ...editForm, work_scope: event.target.value })} /></label>
              {editError ? <div className="form-error">{editError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setEditingObject(null)}>Скасувати</button>
                <button className="btn btn-primary" type="submit">Зберегти зміни</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
