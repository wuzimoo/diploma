import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { ConstructionObject, Crew, Employee } from "../types/api";

export function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [form, setForm] = useState({ name: "", specialization: "Електромонтаж", foreman_employee_id: "", current_object_id: "" });

  function load() {
    Promise.all([api.get<Crew[]>("/crews"), api.get<Employee[]>("/employees"), api.get<ConstructionObject[]>("/objects")]).then(([crewResponse, employeeResponse, objectResponse]) => {
      setCrews(crewResponse.data);
      setEmployees(employeeResponse.data);
      setObjects(objectResponse.data);
      setForm((current) => ({ ...current, foreman_employee_id: current.foreman_employee_id || String(employeeResponse.data[0]?.id || ""), current_object_id: current.current_object_id || String(objectResponse.data[0]?.id || "") }));
    });
  }

  useEffect(load, []);

  async function createCrew(event: FormEvent) {
    event.preventDefault();
    await api.post("/crews", {
      name: form.name,
      specialization: form.specialization,
      foreman_employee_id: Number(form.foreman_employee_id),
      current_object_id: Number(form.current_object_id),
      status: "active"
    });
    setForm({ ...form, name: "" });
    load();
  }

  async function addMember(crewId: number, employeeId: number) {
    await api.post("/crew-members", { crew_id: crewId, employee_id: employeeId, role_in_crew: "Працівник", joined_at: "2026-05-29", is_active: true });
    load();
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Бригади</h2>
          <p className="section-subtitle">Формуйте бригади, закріплюйте їх за поточними об'єктами і додавайте працівників.</p>
        </div>
        <form className="inline-form" onSubmit={createCrew}>
          <label className="field">Назва<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Бригада Berlin Ost" required /></label>
          <label className="field">Профіль<input value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} /></label>
          <label className="field">Бригадир<select value={form.foreman_employee_id} onChange={(event) => setForm({ ...form, foreman_employee_id: event.target.value })}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}</select></label>
          <label className="field">Поточний об'єкт<select value={form.current_object_id} onChange={(event) => setForm({ ...form, current_object_id: event.target.value })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
          <button className="btn btn-primary" type="submit">Додати бригаду</button>
        </form>
      </section>

      <div className="cards-grid">
        {crews.map((crew) => (
          <article className="entity-card crew-card" key={crew.id}>
            <div className="report-item-top"><strong>{crew.name}</strong><StatusBadge status={crew.status} /></div>
            <span>{crew.specialization}</span>
            <p>Об'єкт: {crew.current_object ? <Link className="inline-link" to={`/admin/objects/${crew.current_object.id}`}>{crew.current_object.name}</Link> : "не закріплено"}</p>
            <p>Бригадир: {crew.foreman ? `${crew.foreman.first_name} ${crew.foreman.last_name}` : "не задано"}</p>
            <div className="member-list">
              {crew.members.map((member) => <span key={member.id}>{member.employee?.first_name} {member.employee?.last_name} · {member.role_in_crew}</span>)}
            </div>
            <label className="field">Додати працівника<select onChange={(event) => event.target.value && addMember(crew.id, Number(event.target.value))} defaultValue="">
              <option value="">Обрати</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}
            </select></label>
          </article>
        ))}
      </div>
    </section>
  );
}
