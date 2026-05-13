import { useEffect, useState } from "react";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { ConstructionObject } from "../types/api";

export function ObjectsPage() {
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    api.get<ConstructionObject[]>("/objects", { params: { search: search || undefined } }).then((response) => setObjects(response.data));
  }, [search]);
  return (
    <section className="table-card stack">
      <div>
        <h2 className="section-title">Будівельні об'єкти</h2>
        <p className="section-subtitle">Berlin, Brandenburg, Potsdam: статус, бюджет і клієнт</p>
      </div>
      <label className="field narrow-field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Назва, місто або код" /></label>
      <div className="cards-grid">
        {objects.map((object) => (
          <article className="entity-card" key={object.id}>
            <div className="report-item-top"><strong>{object.name}</strong><StatusBadge status={object.status} /></div>
            <span>{object.city} · {object.code}</span>
            <p>{object.address}</p>
            <small>{object.client} · Budget EUR {object.budget?.toLocaleString("uk-UA") || "0"}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

