import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, Pencil, X } from "lucide-react";

import { api } from "../services/api";
import { Employee } from "../types/api";
import { useToast } from "../hooks/useToast";

const emptyForm = { first_name: "", last_name: "", position: "Працівник", phone: "", hourly_rate: "28" };

function normalizePhone(value: string) {
  return value.replace(/[^\d+()\-\s]/g, "");
}

function employeeError(form: typeof emptyForm) {
  if (!form.first_name.trim() || !form.last_name.trim()) return "Ім'я та прізвище обов'язкові.";
  if (!form.position.trim()) return "Вкажіть роль або посаду.";
  if (form.phone.trim() && !/^[+\d][\d\s()\-]{6,}$/.test(form.phone.trim())) return "Телефон має містити щонайменше 7 символів у коректному форматі.";
  if (!form.hourly_rate || Number(form.hourly_rate) <= 0) return "Ставка EUR/h повинна бути більшою за 0.";
  return "";
}

export function EmployeesPage() {
  const { pushToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [form, setForm] = useState(emptyForm);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");

  function load() {
    api
      .get<Employee[]>("/employees", {
        params: {
          search: search || undefined,
          status_filter: statusFilter === "all" ? undefined : statusFilter
        }
      })
      .then((response) => setEmployees(response.data));
  }

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  function openEditor(employee: Employee) {
    setSelectedEmployee(employee);
    setEditError("");
    setEditForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      position: employee.position,
      phone: employee.phone || "",
      hourly_rate: String(employee.hourly_rate)
    });
  }

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    const error = employeeError(form);
    setFormError(error);
    if (error) return;
    await api.post("/employees", {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      position: form.position.trim(),
      phone: form.phone.trim() || null,
      hourly_rate: Number(form.hourly_rate),
      status: "active"
    });
    setForm(emptyForm);
    setFormError("");
    pushToast({ tone: "success", title: "Працівника додано", description: "Новий запис з'явився у списку." });
    load();
  }

  async function saveEmployee(event: FormEvent) {
    event.preventDefault();
    if (!selectedEmployee) return;
    const error = employeeError(editForm);
    setEditError(error);
    if (error) return;
    await api.patch(`/employees/${selectedEmployee.id}`, {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      position: editForm.position.trim(),
      phone: editForm.phone.trim() || null,
      hourly_rate: Number(editForm.hourly_rate)
    });
    pushToast({ tone: "success", title: "Дані оновлено", description: "Картку працівника збережено." });
    setSelectedEmployee(null);
    load();
  }

  async function archiveEmployee(employee: Employee) {
    if (!window.confirm(`Архівувати працівника ${employee.first_name} ${employee.last_name}?`)) return;
    await api.patch(`/employees/${employee.id}`, { status: "archived" });
    pushToast({ tone: "info", title: "Працівника архівовано", description: "Запис залишився в системі, але більше не активний." });
    if (selectedEmployee?.id === employee.id) setSelectedEmployee(null);
    load();
  }

  async function restoreEmployee(employee: Employee) {
    await api.patch(`/employees/${employee.id}`, { status: "active" });
    pushToast({ tone: "success", title: "Працівника повернуто", description: "Запис знову доступний для бригад і призначень." });
    load();
  }

  const activeCount = useMemo(() => employees.filter((employee) => employee.status === "active").length, [employees]);

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Працівники</h2>
          <p className="section-subtitle">Команда, ставки та ролі. Додавайте, редагуйте й архівуйте працівників без переходу в окремий модуль.</p>
        </div>
        <form className="inline-form" onSubmit={createEmployee}>
          <label className="field">Ім'я<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required /></label>
          <label className="field">Прізвище<input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required /></label>
          <label className="field">Роль<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} required /></label>
          <label className="field">Телефон<input value={form.phone} onChange={(event) => setForm({ ...form, phone: normalizePhone(event.target.value) })} placeholder="+49 30 1000000" /></label>
          <label className="field">EUR/h<input min="1" step="0.5" type="number" value={form.hourly_rate} onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })} required /></label>
          <button className="btn btn-primary" type="submit">Додати працівника</button>
        </form>
        {formError ? <div className="form-error">{formError}</div> : null}
      </section>

      <section className="table-card stack">
        <div className="section-head">
          <div>
            <h3 className="section-title">Список працівників</h3>
            <p className="section-subtitle">Активні: {activeCount} · Усього в поточній вибірці: {employees.length}</p>
          </div>
        </div>
        <div className="filters">
          <label className="field">Пошук<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ім'я, прізвище або посада" /></label>
          <label className="field">Статус<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Усі</option><option value="active">Активні</option><option value="archived">Архів</option></select></label>
          <div className="summary-card compact-summary">
            <span className="text-muted">Керування</span>
            <strong>{selectedEmployee ? "Редагування картки" : "Оберіть працівника"}</strong>
          </div>
        </div>
        <div className="cards-grid">
          {employees.map((employee) => (
            <article className="entity-card employee-card" key={employee.id}>
              <div className="employee-card-header">
                <strong>{employee.first_name} {employee.last_name}</strong>
                <span className="employee-card-role">{employee.position}</span>
              </div>
              <p>{employee.phone || "Телефон не вказано"}</p>
              <small>EUR {employee.hourly_rate}/h · {employee.status}</small>
              <div className="card-actions">
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditor(employee)}><Pencil size={16} />Редагувати</button>
                {employee.status === "archived" ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => restoreEmployee(employee)}>Повернути</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => archiveEmployee(employee)}><Archive size={16} />Архівувати</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedEmployee ? (
        <div className="modal-backdrop" onClick={() => setSelectedEmployee(null)} role="presentation">
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <h3 className="section-title">Картка працівника</h3>
                <p className="section-subtitle">Редагування без втрати історії та звітів.</p>
              </div>
              <button className="icon-btn" type="button" aria-label="Закрити" onClick={() => setSelectedEmployee(null)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={saveEmployee}>
              <div className="field-row">
                <label className="field">Ім'я<input value={editForm.first_name} onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })} required /></label>
                <label className="field">Прізвище<input value={editForm.last_name} onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">Роль<input value={editForm.position} onChange={(event) => setEditForm({ ...editForm, position: event.target.value })} required /></label>
                <label className="field">Телефон<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: normalizePhone(event.target.value) })} /></label>
              </div>
              <label className="field">EUR/h<input min="1" step="0.5" type="number" value={editForm.hourly_rate} onChange={(event) => setEditForm({ ...editForm, hourly_rate: event.target.value })} required /></label>
              {editError ? <div className="form-error">{editError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedEmployee(null)}>Скасувати</button>
                <button className="btn btn-primary" type="submit">Зберегти зміни</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
