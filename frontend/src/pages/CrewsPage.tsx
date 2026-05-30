import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Plus, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { ConstructionObject, Crew, CrewMember, Employee } from "../types/api";
import { useToast } from "../hooks/useToast";

const crewFormDefaults = { name: "", specialization: "Електромонтаж", foreman_employee_id: "", current_object_id: "" };

function activeMembers(crew: Crew) {
  return crew.members.filter((member) => member.is_active);
}

function crewError(form: typeof crewFormDefaults) {
  if (!form.name.trim()) return "Назва бригади обов'язкова.";
  if (!form.specialization.trim()) return "Вкажіть профіль бригади.";
  if (!form.foreman_employee_id) return "Оберіть бригадира.";
  if (!form.current_object_id) return "Оберіть поточний об'єкт.";
  return "";
}

export function CrewsPage() {
  const { pushToast } = useToast();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [form, setForm] = useState(crewFormDefaults);
  const [pickerCrewId, setPickerCrewId] = useState<number | null>(null);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [editForm, setEditForm] = useState(crewFormDefaults);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");

  const foremanCandidates = useMemo(() => {
    const active = employees.filter((employee) => employee.status === "active");
    const narrowed = active.filter((employee) => /бригад|прораб|керів|foreman|lead/i.test(employee.position));
    return narrowed.length ? narrowed : active;
  }, [employees]);

  function load() {
    Promise.all([
      api.get<Crew[]>("/crews"),
      api.get<Employee[]>("/employees", { params: { status_filter: "active" } }),
      api.get<ConstructionObject[]>("/objects", { params: { status_filter: "active" } })
    ]).then(([crewResponse, employeeResponse, objectResponse]) => {
      setCrews(crewResponse.data);
      setEmployees(employeeResponse.data);
      setObjects(objectResponse.data);
      setForm((current) => ({
        ...current,
        foreman_employee_id: current.foreman_employee_id || String(employeeResponse.data[0]?.id || ""),
        current_object_id: current.current_object_id || String(objectResponse.data[0]?.id || "")
      }));
    });
  }

  useEffect(load, []);

  async function createCrew(event: FormEvent) {
    event.preventDefault();
    const error = crewError(form);
    setFormError(error);
    if (error) return;
    await api.post("/crews", {
      name: form.name.trim(),
      specialization: form.specialization.trim(),
      foreman_employee_id: Number(form.foreman_employee_id),
      current_object_id: Number(form.current_object_id),
      status: "active"
    });
    setForm(crewFormDefaults);
    setFormError("");
    pushToast({ tone: "success", title: "Бригаду створено", description: "Нова бригада додана до списку та готова до комплектування." });
    load();
  }

  async function addMember(crewId: number, employeeId: number) {
    const currentCrew = crews.find((crew) => crew.id === crewId);
    const employee = employees.find((item) => item.id === employeeId);
    const previousCrew = crews.find((crew) => crew.id !== crewId && activeMembers(crew).some((member) => member.employee_id === employeeId));
    const previousMembership = previousCrew?.members.find((member) => member.employee_id === employeeId && member.is_active);
    if (previousCrew && previousMembership) {
      const confirmed = window.confirm(
        `${employee?.first_name || "Працівник"} ${employee?.last_name || ""} вже входить до бригади ${previousCrew.name}. Перемістити його до ${currentCrew?.name || "нової бригади"}?`
      );
      if (!confirmed) return;
      await api.patch(`/crew-members/${previousMembership.id}`, { is_active: false });
    }
    try {
      await api.post("/crew-members", {
        crew_id: crewId,
        employee_id: employeeId,
        role_in_crew: "Працівник",
        joined_at: new Date().toISOString().slice(0, 10),
        is_active: true
      });
      setPickerCrewId(null);
      pushToast({
        tone: "success",
        title: previousCrew ? "Працівника переміщено" : "Працівника додано",
        description: previousCrew ? "Активна прив'язка до попередньої бригади закрита." : "Склад бригади оновлено."
      });
      load();
    } catch (error) {
      const detail = typeof error === "object" && error && "response" in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      pushToast({ tone: "error", title: "Не вдалося додати працівника", description: detail || "Спробуйте ще раз після оновлення списку." });
    }
  }

  async function removeMember(member: CrewMember) {
    if (!window.confirm(`Прибрати ${member.employee?.first_name} ${member.employee?.last_name} зі складу бригади?`)) return;
    await api.patch(`/crew-members/${member.id}`, { is_active: false });
    pushToast({ tone: "info", title: "Працівника відв'язано", description: "Працівник прибраний лише з поточної бригади." });
    load();
  }

  function openEditor(crew: Crew) {
    setEditingCrew(crew);
    setEditError("");
    setEditForm({
      name: crew.name,
      specialization: crew.specialization,
      foreman_employee_id: crew.foreman_employee_id ? String(crew.foreman_employee_id) : "",
      current_object_id: crew.current_object_id ? String(crew.current_object_id) : ""
    });
  }

  async function saveCrew(event: FormEvent) {
    event.preventDefault();
    if (!editingCrew) return;
    const error = crewError(editForm);
    setEditError(error);
    if (error) return;
    await api.patch(`/crews/${editingCrew.id}`, {
      name: editForm.name.trim(),
      specialization: editForm.specialization.trim(),
      foreman_employee_id: Number(editForm.foreman_employee_id),
      current_object_id: Number(editForm.current_object_id)
    });
    pushToast({ tone: "success", title: "Бригаду оновлено", description: "Зміни збережено." });
    setEditingCrew(null);
    load();
  }

  async function archiveCrew(crew: Crew) {
    if (!window.confirm(`Архівувати бригаду ${crew.name}?`)) return;
    await api.patch(`/crews/${crew.id}`, { status: "archived" });
    pushToast({ tone: "info", title: "Бригаду архівовано", description: "Бригада залишилась в історії, але прихована з активної роботи." });
    if (editingCrew?.id === crew.id) setEditingCrew(null);
    load();
  }

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Бригади</h2>
          <p className="section-subtitle">Формуйте склад, закріплюйте бригадирів і змінюйте поточні об'єкти без переходу в окрему систему.</p>
        </div>
        <form className="inline-form" onSubmit={createCrew}>
          <label className="field">Назва<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Бригада Berlin Ost" required /></label>
          <label className="field">Профіль<input value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} required /></label>
          <label className="field">Бригадир<select value={form.foreman_employee_id} onChange={(event) => setForm({ ...form, foreman_employee_id: event.target.value })}>{foremanCandidates.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}</select></label>
          <label className="field">Поточний об'єкт<select value={form.current_object_id} onChange={(event) => setForm({ ...form, current_object_id: event.target.value })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
          <button className="btn btn-primary" type="submit">Додати бригаду</button>
        </form>
        {formError ? <div className="form-error">{formError}</div> : null}
      </section>

      <div className="cards-grid">
        {crews.map((crew) => {
          const members = activeMembers(crew);
          const availableEmployees = employees.filter((employee) => !members.some((member) => member.employee_id === employee.id));
          return (
            <article className="entity-card crew-card" key={crew.id}>
              <div className="report-item-top"><strong>{crew.name}</strong><StatusBadge status={crew.status} /></div>
              <span>{crew.specialization}</span>
              <p>Об'єкт: {crew.current_object ? <Link className="inline-link" to={`/admin/objects/${crew.current_object.id}`}>{crew.current_object.name}</Link> : "не закріплено"}</p>
              <p>Бригадир: {crew.foreman ? `${crew.foreman.first_name} ${crew.foreman.last_name}` : "не задано"}</p>
              <div className="member-list">
                {members.map((member) => (
                  <span className="member-pill" key={member.id}>
                    <span>{member.employee?.first_name} {member.employee?.last_name} · {member.role_in_crew}</span>
                    <button className="member-remove" type="button" aria-label={`Прибрати ${member.employee?.first_name} ${member.employee?.last_name}`} onClick={() => removeMember(member)}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="crew-card-actions">
                <div className="card-actions">
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditor(crew)}><Pencil size={16} />Редагувати</button>
                  {crew.status !== "archived" ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => archiveCrew(crew)}><Archive size={16} />Архівувати</button> : null}
                </div>
                <div className="crew-inline-picker-toggle">
                  <span className="crew-members-label">Склад бригади</span>
                  <button className="icon-btn" type="button" aria-label="Додати працівника" onClick={() => setPickerCrewId((current) => current === crew.id ? null : crew.id)}>
                    {pickerCrewId === crew.id ? <X size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              </div>
              {pickerCrewId === crew.id ? (
                <div className="member-picker">
                  <strong>Додати працівника</strong>
                  <div className="member-picker-grid">
                    {availableEmployees.map((employee) => (
                      <button className="member-picker-card" key={employee.id} type="button" onClick={() => addMember(crew.id, employee.id)}>
                        <strong>{employee.first_name} {employee.last_name}</strong>
                        <span>{employee.position}</span>
                      </button>
                    ))}
                    {availableEmployees.length === 0 ? <p className="helper">Усі доступні працівники вже додані до цієї бригади.</p> : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {editingCrew ? (
        <div className="modal-backdrop" onClick={() => setEditingCrew(null)} role="presentation">
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <h3 className="section-title">Редагування бригади</h3>
                <p className="section-subtitle">Оновіть назву, профіль, бригадира та поточний об'єкт.</p>
              </div>
              <button className="icon-btn" type="button" aria-label="Закрити" onClick={() => setEditingCrew(null)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={saveCrew}>
              <label className="field">Назва<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required /></label>
              <label className="field">Профіль<input value={editForm.specialization} onChange={(event) => setEditForm({ ...editForm, specialization: event.target.value })} required /></label>
              <div className="field-row">
                <label className="field">Бригадир<select value={editForm.foreman_employee_id} onChange={(event) => setEditForm({ ...editForm, foreman_employee_id: event.target.value })}>{foremanCandidates.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}</select></label>
                <label className="field">Об'єкт<select value={editForm.current_object_id} onChange={(event) => setEditForm({ ...editForm, current_object_id: event.target.value })}>{objects.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>
              </div>
              {editError ? <div className="form-error">{editError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setEditingCrew(null)}>Скасувати</button>
                <button className="btn btn-primary" type="submit">Зберегти зміни</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
