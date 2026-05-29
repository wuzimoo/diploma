import { FormEvent, useEffect, useState } from "react";

import { api } from "../services/api";
import { Employee } from "../types/api";

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", position: "Працівник", phone: "", hourly_rate: "28" });

  function load() {
    api.get<Employee[]>("/employees", { params: { search: search || undefined } }).then((response) => setEmployees(response.data));
  }

  useEffect(() => {
    load();
  }, [search]);

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    await api.post("/employees", {
      first_name: form.first_name,
      last_name: form.last_name,
      position: form.position,
      phone: form.phone || null,
      hourly_rate: Number(form.hourly_rate),
      status: "active"
    });
    setForm({ first_name: "", last_name: "", position: "Працівник", phone: "", hourly_rate: "28" });
    load();
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Працівники</h2>
          <p className="section-subtitle">Команда, ставки та робочі ролі. Адмін або бригадир може додати нового працівника для подальшого закріплення в бригаді.</p>
        </div>
        <form className="inline-form" onSubmit={createEmployee}>
          <label className="field">Ім'я<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required /></label>
          <label className="field">Прізвище<input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required /></label>
          <label className="field">Роль<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} /></label>
          <label className="field">Телефон<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+49 ..." /></label>
          <label className="field">EUR/h<input min="0" type="number" value={form.hourly_rate} onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })} /></label>
          <button className="btn btn-primary" type="submit">Додати працівника</button>
        </form>
      </section>
      <section className="table-card stack">
        <label className="field narrow-field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ім'я або посада" /></label>
        <div className="cards-grid">
          {employees.map((employee) => (
            <article className="entity-card employee-card" key={employee.id}>
              <div className="employee-card-header">
                <strong>{employee.first_name} {employee.last_name}</strong>
                <span className="employee-card-role">{employee.position}</span>
              </div>
              <p>{employee.phone || "Телефон не вказано"}</p>
              <small>EUR {employee.hourly_rate}/h · {employee.status}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
