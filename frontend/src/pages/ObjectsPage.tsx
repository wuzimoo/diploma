import { FormEvent, useEffect, useState } from "react";
import { Archive, Pencil, X } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { useI18n } from "../hooks/useI18n";
import { formatCurrency, formatDate, toLocalIsoDate } from "../lib/format";
import { api } from "../services/api";
import { ConstructionObject } from "../types/api";
import { useToast } from "../hooks/useToast";

const objectDefaults = {
  name: "",
  code: "",
  city: "Berlin",
  address: "",
  client: "",
  planned_start_date: toLocalIsoDate(new Date()),
  planned_end_date: "",
  budget: "250000",
  description: "",
  work_scope: "",
};

function objectError(form: typeof objectDefaults) {
  if (!form.name.trim() || !form.code.trim()) return "Projektname und Code sind erforderlich.";
  if (!form.city.trim() || !form.address.trim()) return "Stadt und Adresse sind erforderlich.";
  if (form.budget && Number(form.budget) < 0) return "Das Budget darf nicht negativ sein.";
  if (form.planned_start_date && form.planned_end_date && form.planned_end_date < form.planned_start_date) return "Das Enddatum darf nicht vor dem Startdatum liegen.";
  return "";
}

export function ObjectsPage() {
  const { t, translateText } = useI18n();
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
          status_filter: statusFilter === "all" ? undefined : statusFilter,
        },
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
      start_date: form.planned_start_date || null,
    });
    setForm(objectDefaults);
    setFormError("");
    pushToast({ tone: "success", title: t("Projekt angelegt"), description: t("Das neue Bauprojekt wurde gespeichert.") });
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
      work_scope: object.work_scope || "",
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
      budget: editForm.budget ? Number(editForm.budget) : 0,
    });
    pushToast({ tone: "success", title: t("Projekt aktualisiert"), description: t("Die Projektdetails wurden gespeichert.") });
    setEditingObject(null);
    load();
  }

  async function archiveObject(object: ConstructionObject) {
    if (!window.confirm(t("Projekt {name} archivieren?", { name: object.name }))) return;
    await api.patch(`/objects/${object.id}`, { status: "archived" });
    pushToast({ tone: "info", title: t("Projekt archiviert"), description: t("Das Projekt wird nicht mehr als aktiv angezeigt.") });
    if (editingObject?.id === object.id) setEditingObject(null);
    load();
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">{t("Bauprojekte")}</h2>
          <p className="section-subtitle">{t("Projekte, Termine, Budget und Leistungsumfang in einer ubersichtlichen Kundendemo.")}</p>
        </div>
        <form className="inline-form object-form" onSubmit={createObject}>
          <label className="field">{t("Projektname")}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Berlin Sud - Block D" required /></label>
          <label className="field">Code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="BER-SUD-D" required /></label>
          <label className="field">{t("Stadt")}<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label>
          <label className="field">{t("Adresse")}<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /></label>
          <label className="field">{t("Planstart")}<input type="date" value={form.planned_start_date} onChange={(event) => setForm({ ...form, planned_start_date: event.target.value })} /></label>
          <label className="field">{t("Planende")}<input type="date" value={form.planned_end_date} onChange={(event) => setForm({ ...form, planned_end_date: event.target.value })} /></label>
          <label className="field">{t("Kunde")}<input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} /></label>
          <label className="field">{t("Budget")}<input type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></label>
          <label className="field wide-field">{t("Kurzbeschreibung")}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="field wide-field">{t("Leistungsumfang")}<textarea value={form.work_scope} onChange={(event) => setForm({ ...form, work_scope: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit">{t("Projekt anlegen")}</button>
        </form>
        {formError ? <div className="form-error">{t(formError)}</div> : null}
      </section>

      <section className="table-card stack">
        <div className="filters">
          <label className="field">{t("Suche")}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Projektname, Stadt oder Code")} /></label>
          <label className="field">{t("Status")}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t("Alle")}</option><option value="active">{t("Aktiv")}</option><option value="planning">{t("In Planung")}</option><option value="archived">{t("Archiv")}</option></select></label>
          <div className="summary-card compact-summary"><span className="text-muted">{t("Gefunden")}</span><strong>{t("{count} Projekte", { count: objects.length })}</strong></div>
        </div>
        <div className="cards-grid objects-grid">
          {objects.map((object) => (
            <article className="entity-card object-list-card" key={object.id}>
              <div className="report-item-top object-list-head">
                <div className="object-list-title-wrap">
                  <strong className="object-list-title" title={translateText(object.name)}>{translateText(object.name)}</strong>
                  <span className="object-list-code">{object.city} · {object.code}</span>
                </div>
                <StatusBadge status={object.status} />
              </div>
              <p className="object-list-address">{object.address}</p>
              <p className="object-list-description">{translateText(object.description || object.work_scope) || t("Noch keine Beschreibung hinterlegt")}</p>
              <div className="mini-progress"><i style={{ width: `${object.progress_percent || 0}%` }} /><span>{object.progress_percent || 0}%</span></div>
              <small className="object-list-meta">{translateText(object.client) || t("Kein Kunde hinterlegt")} · {t("Start {date}", { date: object.planned_start_date || object.start_date ? formatDate(object.planned_start_date || object.start_date || "") : t("offen") })} · {formatCurrency(Number(object.budget || 0))}</small>
              <div className="card-actions">
                <Link className="btn btn-secondary btn-sm" to={`/admin/objects/${object.id}`}>{t("Details")}</Link>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditor(object)}><Pencil size={16} />{t("Bearbeiten")}</button>
                {object.status !== "archived" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => archiveObject(object)}><Archive size={16} />{t("Archivieren")}</button> : null}
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
                <h3 className="section-title">{t("Projekt bearbeiten")}</h3>
                <p className="section-subtitle">{t("Termine, Adresse, Beschreibung und Budget aktualisieren.")}</p>
              </div>
              <button className="icon-btn" type="button" aria-label={t("Schliessen")} onClick={() => setEditingObject(null)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={saveObject}>
              <div className="field-row">
                <label className="field">{t("Projektname")}<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></label>
                <label className="field">Code<input value={editForm.code} onChange={(event) => setEditForm({ ...editForm, code: event.target.value.toUpperCase() })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">{t("Stadt")}<input value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} required /></label>
                <label className="field">{t("Adresse")}<input value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">{t("Planstart")}<input type="date" value={editForm.planned_start_date} onChange={(event) => setEditForm({ ...editForm, planned_start_date: event.target.value })} /></label>
                <label className="field">{t("Planende")}<input type="date" value={editForm.planned_end_date} onChange={(event) => setEditForm({ ...editForm, planned_end_date: event.target.value })} /></label>
              </div>
              <div className="field-row">
                <label className="field">{t("Kunde")}<input value={editForm.client} onChange={(event) => setEditForm({ ...editForm, client: event.target.value })} /></label>
                <label className="field">{t("Budget")}<input type="number" min="0" value={editForm.budget} onChange={(event) => setEditForm({ ...editForm, budget: event.target.value })} /></label>
              </div>
              <label className="field">{t("Kurzbeschreibung")}<textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} /></label>
              <label className="field">{t("Leistungsumfang")}<textarea value={editForm.work_scope} onChange={(event) => setEditForm({ ...editForm, work_scope: event.target.value })} /></label>
              {editError ? <div className="form-error">{t(editError)}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setEditingObject(null)}>{t("Abbrechen")}</button>
                <button className="btn btn-primary" type="submit">{t("Änderungen speichern")}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
