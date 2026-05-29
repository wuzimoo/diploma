import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { ConstructionObject } from "../types/api";

export function ObjectsPage() {
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", code: "", city: "Berlin", address: "", client: "", planned_start_date: "2026-06-01", planned_end_date: "2026-09-30", budget: "250000", description: "", work_scope: "" });

  function load() {
    api.get<ConstructionObject[]>("/objects", { params: { search: search || undefined } }).then((response) => setObjects(response.data));
  }

  useEffect(() => {
    load();
  }, [search]);

  async function createObject(event: FormEvent) {
    event.preventDefault();
    await api.post("/objects", {
      ...form,
      budget: Number(form.budget),
      priority: "normal",
      progress_percent: 0,
      status: "planning",
      start_date: form.planned_start_date
    });
    setForm({ name: "", code: "", city: "Berlin", address: "", client: "", planned_start_date: "2026-06-01", planned_end_date: "2026-09-30", budget: "250000", description: "", work_scope: "" });
    load();
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Будівельні об'єкти</h2>
          <p className="section-subtitle">Berlin, Brandenburg, Potsdam: статус, бюджет, строки, опис і план робіт.</p>
        </div>
        <form className="inline-form object-form" onSubmit={createObject}>
          <label className="field">Назва<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Berlin Süd - Block D" required /></label>
          <label className="field">Код<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="BER-SUD-D" required /></label>
          <label className="field">Місто<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label>
          <label className="field">Адреса<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /></label>
          <label className="field">Старт<input type="date" value={form.planned_start_date} onChange={(event) => setForm({ ...form, planned_start_date: event.target.value })} /></label>
          <label className="field">Фініш<input type="date" value={form.planned_end_date} onChange={(event) => setForm({ ...form, planned_end_date: event.target.value })} /></label>
          <label className="field">Клієнт<input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} /></label>
          <label className="field">Бюджет<input type="number" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></label>
          <label className="field wide-field">Опис<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="field wide-field">Опис робіт<input value={form.work_scope} onChange={(event) => setForm({ ...form, work_scope: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit">Додати об'єкт</button>
        </form>
      </section>
      <section className="table-card stack">
        <label className="field narrow-field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Назва, місто або код" /></label>
        <div className="cards-grid">
          {objects.map((object) => (
            <article className="entity-card" key={object.id}>
              <div className="report-item-top"><strong>{object.name}</strong><StatusBadge status={object.status} /></div>
              <span>{object.city} · {object.code}</span>
              <p>{object.address}</p>
              <p>{object.description || object.work_scope}</p>
              <div className="mini-progress"><i style={{ width: `${object.progress_percent || 0}%` }} /><span>{object.progress_percent || 0}%</span></div>
              <small>{object.client} · старт {object.planned_start_date || object.start_date || "не задано"} · EUR {object.budget?.toLocaleString("uk-UA") || "0"}</small>
              <Link className="btn btn-secondary btn-sm" to={`/admin/objects/${object.id}`}>Відкрити деталі</Link>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
