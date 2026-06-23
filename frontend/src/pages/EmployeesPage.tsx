import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, KeyRound, Pencil, RotateCcw, ShieldCheck, X } from "lucide-react";

import { api } from "../services/api";
import { Employee } from "../types/api";
import { useToast } from "../hooks/useToast";

const emptyForm = {
  first_name: "",
  last_name: "",
  position: "Fachkraft",
  phone: "",
  hourly_rate: "28",
  access_email: "",
  access_password: "",
  access_role_code: "worker",
};

function normalizePhone(value: string) {
  return value.replace(/[^\d+()\-\s]/g, "");
}

function employeeError(form: typeof emptyForm, options?: { requirePasswordForAccess?: boolean }) {
  if (!form.first_name.trim() || !form.last_name.trim()) return "Vorname und Nachname sind erforderlich.";
  if (!form.position.trim()) return "Bitte Rolle oder Funktion angeben.";
  if (form.phone.trim() && !/^[+\d][\d\s()\-]{6,}$/.test(form.phone.trim())) return "Die Telefonnummer muss mindestens 7 Zeichen im gultigen Format enthalten.";
  if (!form.hourly_rate || Number(form.hourly_rate) <= 0) return "Der Stundensatz in EUR muss grosser als 0 sein.";
  if (options?.requirePasswordForAccess && form.access_email.trim() && !form.access_password.trim()) return "Fur den Zugang ist ein temporares Passwort erforderlich.";
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
  const [savingPassword, setSavingPassword] = useState(false);

  function load() {
    api
      .get<Employee[]>("/employees", {
        params: {
          search: search || undefined,
          status_filter: statusFilter === "all" ? undefined : statusFilter,
        },
      })
      .then((response) => setEmployees(response.data));
  }

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  function openEditor(employee: Employee) {
    setSelectedEmployee(employee);
    setEditError("");
    setSavingPassword(false);
    setEditForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      position: employee.position,
      phone: employee.phone || "",
      hourly_rate: String(employee.hourly_rate),
      access_email: employee.user?.email || "",
      access_password: "",
      access_role_code: employee.user?.role.code || "worker",
    });
  }

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    const error = employeeError(form, { requirePasswordForAccess: true });
    setFormError(error);
    if (error) return;
    try {
      await api.post("/employees", {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        position: form.position.trim(),
        phone: form.phone.trim() || null,
        hourly_rate: Number(form.hourly_rate),
        status: "active",
        access_email: form.access_email.trim() || null,
        access_password: form.access_password.trim() || null,
        access_role_code: form.access_email.trim() ? form.access_role_code : null,
        access_is_active: true,
      });
      setForm(emptyForm);
      setFormError("");
      pushToast({ tone: "success", title: "Mitarbeiter angelegt", description: "Mitarbeiterprofil und Zugang wurden erstellt." });
      load();
    } catch (error: any) {
      setFormError(error?.response?.data?.detail || "Der Mitarbeiter konnte nicht angelegt werden.");
    }
  }

  async function saveEmployee(event: FormEvent) {
    event.preventDefault();
    if (!selectedEmployee) return;
    const error = employeeError(editForm, {
      requirePasswordForAccess: !selectedEmployee.user && Boolean(editForm.access_email.trim()),
    });
    setEditError(error);
    if (error) return;
    try {
      await api.patch(`/employees/${selectedEmployee.id}`, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        position: editForm.position.trim(),
        phone: editForm.phone.trim() || null,
        hourly_rate: Number(editForm.hourly_rate),
        access_email: editForm.access_email.trim() || null,
        access_password: editForm.access_password.trim() || null,
        access_role_code: editForm.access_email.trim() ? editForm.access_role_code : null,
      });
      pushToast({
        tone: "success",
        title: "Daten gespeichert",
        description: selectedEmployee.user ? "Das Mitarbeiterprofil wurde aktualisiert." : "Profil gespeichert und Zugang angelegt.",
      });
      setSelectedEmployee(null);
      load();
    } catch (error: any) {
      setEditError(error?.response?.data?.detail || "Der Mitarbeiter konnte nicht aktualisiert werden.");
    }
  }

  async function updatePassword() {
    if (!selectedEmployee) return;
    if (!editForm.access_password.trim()) {
      setEditError("Bitte ein neues temporäres Passwort eingeben.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch(`/employees/${selectedEmployee.id}`, { access_password: editForm.access_password.trim() });
      setEditForm((current) => ({ ...current, access_password: "" }));
      setEditError("");
      pushToast({ tone: "success", title: "Passwort aktualisiert", description: "Das neue temporäre Passwort wurde gespeichert." });
      load();
    } catch (error: any) {
      setEditError(error?.response?.data?.detail || "Das Passwort konnte nicht geandert werden.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function toggleAccess(employee: Employee, nextValue: boolean) {
    if (!employee.user) return;
    await api.patch(`/employees/${employee.id}`, { access_is_active: nextValue });
    pushToast({
      tone: nextValue ? "success" : "info",
      title: nextValue ? "Zugang aktiviert" : "Zugang deaktiviert",
      description: nextValue ? "Der Benutzer kann sich wieder anmelden." : "Der Systemzugang wurde deaktiviert.",
    });
    load();
    if (selectedEmployee?.id === employee.id) {
      setSelectedEmployee({ ...employee, user: employee.user ? { ...employee.user, is_active: nextValue } : null });
    }
  }

  async function archiveEmployee(employee: Employee) {
    if (!window.confirm(`Mitarbeiter ${employee.first_name} ${employee.last_name} archivieren?`)) return;
    await api.patch(`/employees/${employee.id}`, { status: "archived", access_is_active: false });
    pushToast({ tone: "info", title: "Mitarbeiter archiviert", description: "Der Datensatz bleibt erhalten, ist aber nicht mehr aktiv." });
    if (selectedEmployee?.id === employee.id) setSelectedEmployee(null);
    load();
  }

  async function restoreEmployee(employee: Employee) {
    await api.patch(`/employees/${employee.id}`, { status: "active", access_is_active: true });
    pushToast({ tone: "success", title: "Mitarbeiter reaktiviert", description: "Der Datensatz ist wieder fur Teams und Einsatze verfugbar." });
    load();
  }

  const activeCount = useMemo(() => employees.filter((employee) => employee.status === "active").length, [employees]);

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">Mitarbeiter</h2>
          <p className="section-subtitle">Team, Stundensatze, Rollen und Zugange in einem Verwaltungsmodul.</p>
        </div>
        <form className="inline-form access-form" onSubmit={createEmployee}>
          <label className="field">Vorname<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required /></label>
          <label className="field">Nachname<input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required /></label>
          <label className="field">Funktion<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} required /></label>
          <label className="field">Telefon<input value={form.phone} onChange={(event) => setForm({ ...form, phone: normalizePhone(event.target.value) })} placeholder="+49 30 1000000" /></label>
          <label className="field">EUR/h<input min="1" step="0.5" type="number" value={form.hourly_rate} onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })} required /></label>
          <label className="field">Email<input type="email" value={form.access_email} onChange={(event) => setForm({ ...form, access_email: event.target.value })} placeholder="worker@company.de" /></label>
          <label className="field">Temporäres Passwort<input type="password" value={form.access_password} onChange={(event) => setForm({ ...form, access_password: event.target.value })} placeholder="mindestens 8 Zeichen" /></label>
          <label className="field">Zugriffsrolle<select value={form.access_role_code} onChange={(event) => setForm({ ...form, access_role_code: event.target.value })}><option value="worker">Mitarbeiter</option><option value="foreman">Polier</option><option value="admin">Admin</option></select></label>
          <button className="btn btn-primary" type="submit">Mitarbeiter anlegen</button>
        </form>
        {formError ? <div className="form-error">{formError}</div> : null}
      </section>

      <section className="table-card stack">
        <div className="section-head">
          <div>
            <h3 className="section-title">Mitarbeiterliste</h3>
            <p className="section-subtitle">Aktiv: {activeCount} · Insgesamt in der aktuellen Ansicht: {employees.length}</p>
          </div>
        </div>
        <div className="filters">
          <label className="field">Suche<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Vorname, Nachname, Funktion oder E-Mail" /></label>
          <label className="field">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Alle</option><option value="active">Aktiv</option><option value="archived">Archiv</option></select></label>
          <div className="summary-card compact-summary">
            <span className="text-muted">Systemzugang</span>
            <strong>{employees.filter((employee) => employee.user?.is_active).length} aktive Konten</strong>
          </div>
        </div>
        <div className="cards-grid">
          {employees.map((employee) => (
            <article className="entity-card employee-card" key={employee.id}>
              <div className="employee-card-header">
                <strong>{employee.first_name} {employee.last_name}</strong>
                <span className="employee-card-role">{employee.position}</span>
              </div>
              <p>{employee.phone || "Keine Telefonnummer hinterlegt"}</p>
              <small>EUR {employee.hourly_rate}/h · {employee.status === "active" ? "aktiv" : "archiviert"}</small>
              <div className="employee-access-row">
                <ShieldCheck size={16} />
                <span>{employee.user ? `${employee.user.email} · ${employee.user.role.name} · ${employee.user.is_active ? "aktiv" : "deaktiviert"}` : "Kein Zugang angelegt"}</span>
              </div>
              <div className="card-actions">
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditor(employee)}><Pencil size={16} />Bearbeiten</button>
                {employee.user ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleAccess(employee, !employee.user?.is_active)}>
                    <ShieldCheck size={16} />{employee.user.is_active ? "Zugang sperren" : "Zugang aktivieren"}
                  </button>
                ) : null}
                {employee.status === "archived" ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => restoreEmployee(employee)}><RotateCcw size={16} />Reaktivieren</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => archiveEmployee(employee)}><Archive size={16} />Archivieren</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedEmployee ? (
        <div className="modal-backdrop" onClick={() => setSelectedEmployee(null)} role="presentation">
          <section className="modal-card wide-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <h3 className="section-title">Mitarbeiterkarte</h3>
                <p className="section-subtitle">Personaldaten und Systemzugang zentral bearbeiten.</p>
              </div>
              <button className="icon-btn" type="button" aria-label="Schliessen" onClick={() => setSelectedEmployee(null)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={saveEmployee}>
              <div className="field-row">
                <label className="field">Vorname<input value={editForm.first_name} onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })} required /></label>
                <label className="field">Nachname<input value={editForm.last_name} onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">Funktion<input value={editForm.position} onChange={(event) => setEditForm({ ...editForm, position: event.target.value })} required /></label>
                <label className="field">Telefon<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: normalizePhone(event.target.value) })} /></label>
              </div>
              <label className="field">EUR/h<input min="1" step="0.5" type="number" value={editForm.hourly_rate} onChange={(event) => setEditForm({ ...editForm, hourly_rate: event.target.value })} required /></label>

              <section className="access-panel">
                <div>
                  <h4 className="section-title">Systemzugang</h4>
                  <p className="section-subtitle">Konto fur Mitarbeiter, Poliere oder Administration anlegen und pflegen.</p>
                </div>
                <div className="field-row access-fields">
                  <label className="field">Email<input type="email" value={editForm.access_email} onChange={(event) => setEditForm({ ...editForm, access_email: event.target.value })} placeholder="worker@company.de" /></label>
                  <label className="field">Zugriffsrolle<select value={editForm.access_role_code} onChange={(event) => setEditForm({ ...editForm, access_role_code: event.target.value })}><option value="worker">Mitarbeiter</option><option value="foreman">Polier</option><option value="admin">Admin</option></select></label>
                </div>
                <div className="field-row access-fields">
                  <label className="field">
                    {selectedEmployee.user ? "Neues Passwort" : "Temporäres Passwort"}
                    <input
                      type="password"
                      value={editForm.access_password}
                      onChange={(event) => setEditForm({ ...editForm, access_password: event.target.value })}
                      placeholder={selectedEmployee.user ? "leer lassen, wenn unverandert" : "Passwort fur die Kontoanlage eingeben"}
                    />
                  </label>
                  <div className="access-actions">
                    <span className="text-muted">
                      {selectedEmployee.user
                        ? `Zugangsstatus: ${selectedEmployee.user.is_active ? "aktiv" : "deaktiviert"}`
                        : "Noch kein Konto vorhanden. E-Mail und temporäres Passwort eintragen und danach speichern."}
                    </span>
                    {selectedEmployee.user ? (
                      <button className="btn btn-secondary btn-sm" disabled={savingPassword} type="button" onClick={updatePassword}><KeyRound size={16} />Passwort aktualisieren</button>
                    ) : null}
                  </div>
                </div>
              </section>

              {editError ? <div className="form-error">{editError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedEmployee(null)}>Abbrechen</button>
                <button className="btn btn-primary" type="submit">Anderungen speichern</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
