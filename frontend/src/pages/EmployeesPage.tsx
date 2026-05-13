import { useEffect, useState } from "react";

import { api } from "../services/api";
import { Employee } from "../types/api";

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    api.get<Employee[]>("/employees", { params: { search: search || undefined } }).then((response) => setEmployees(response.data));
  }, [search]);
  return (
    <section className="table-card stack">
      <div>
        <h2 className="section-title">Працівники</h2>
        <p className="section-subtitle">Команда, ставки та робочі ролі</p>
      </div>
      <label className="field narrow-field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ім'я або посада" /></label>
      <div className="cards-grid">
        {employees.map((employee) => (
          <article className="entity-card" key={employee.id}>
            <strong>{employee.first_name} {employee.last_name}</strong>
            <span>{employee.position}</span>
            <p>{employee.phone || "Телефон не вказано"}</p>
            <small>EUR {employee.hourly_rate}/h · {employee.status}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

