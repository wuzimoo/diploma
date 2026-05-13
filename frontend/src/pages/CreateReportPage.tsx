import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import { ConstructionObject, Employee } from "../types/api";

function hours(start: string, end: string, pause: number) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(((eh * 60 + em) - (sh * 60 + sm) - pause) / 60, 0);
}

export function CreateReportPage() {
  const navigate = useNavigate();
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    report_date: "2026-05-13",
    construction_object_id: "",
    employee_id: "",
    start_time: "08:00",
    end_time: "16:30",
    break_minutes: 30,
    work_description: ""
  });
  const workedHours = useMemo(() => hours(form.start_time, form.end_time, form.break_minutes), [form]);

  useEffect(() => {
    Promise.all([api.get<ConstructionObject[]>("/objects"), api.get<Employee[]>("/employees")]).then(([objectsResponse, employeesResponse]) => {
      setObjects(objectsResponse.data);
      setEmployees(employeesResponse.data);
      setForm((current) => ({
        ...current,
        construction_object_id: String(objectsResponse.data[0]?.id || ""),
        employee_id: String(employeesResponse.data[0]?.id || "")
      }));
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await api.post("/daily-reports", {
      ...form,
      construction_object_id: Number(form.construction_object_id),
      employee_id: Number(form.employee_id),
      worked_hours: workedHours,
      status: "review"
    });
    navigate(`/worker/reports/${response.data.id}`);
  }

  return (
    <>
      <header className="mobile-header">
        <button className="back-link button-reset" onClick={() => navigate(-1)} type="button">Назад до панелі</button>
        <h1>Заповнення щоденного звіту</h1>
        <p>Перед відправкою перевірте, що всі поля заповнені.</p>
      </header>
      <main className="mobile-content">
        <form className="form-grid" onSubmit={submit}>
          <label className="field">Дата<input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></label>
          <label className="field">Працівник<select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}</select></label>
          <label className="field">Об'єкт<select value={form.construction_object_id} onChange={(e) => setForm({ ...form, construction_object_id: e.target.value })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
          <div className="field-row">
            <label className="field">Початок<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            <label className="field">Завершення<input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
          </div>
          <label className="field">Перерва, хв<input type="number" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} /></label>
          <div className="hours-row"><span>Розрахований робочий час</span><strong>{workedHours.toFixed(2)} h</strong></div>
          <label className="field">Опис робіт<textarea value={form.work_description} onChange={(e) => setForm({ ...form, work_description: e.target.value })} placeholder="Напр.: змонтовано кабельні траси, підготовлено головний щит" /></label>
          <label className="field">Фото<input type="file" accept="image/*" multiple /><span className="helper">MVP зберігає metadata фото через API; реальне файлове сховище підключається окремо.</span></label>
          <button className="btn btn-primary btn-block" type="submit">Надіслати звіт</button>
        </form>
      </main>
    </>
  );
}

