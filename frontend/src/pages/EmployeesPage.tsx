import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, KeyRound, Pencil, RotateCcw, ShieldCheck, X } from "lucide-react";

import { useI18n } from "../hooks/useI18n";
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
  if (!form.hourly_rate || Number(form.hourly_rate) <= 0) return "Der Stundensatz in EUR muss größer als 0 sein.";
  if (options?.requirePasswordForAccess && form.access_email.trim() && !form.access_password.trim()) return "Fur den Zugang ist ein temporares Passwort erforderlich.";
  return "";
}

export function EmployeesPage() {
  const { t, translateText } = useI18n();
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
      pushToast({ tone: "success", title: t("Mitarbeiter angelegt"), description: t("Mitarbeiterprofil und Zugang wurden erstellt.") });
      load();
    } catch (error: any) {
      setFormError(error?.response?.data?.detail || t("Der Mitarbeiter konnte nicht angelegt werden."));
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
        title: t("Daten gespeichert"),
        description: selectedEmployee.user ? t("Das Mitarbeiterprofil wurde aktualisiert.") : t("Profil gespeichert und Zugang angelegt."),
      });
      setSelectedEmployee(null);
      load();
    } catch (error: any) {
      setEditError(error?.response?.data?.detail || t("Der Mitarbeiter konnte nicht aktualisiert werden."));
    }
  }

  async function updatePassword() {
    if (!selectedEmployee) return;
    if (!editForm.access_password.trim()) {
      setEditError(t("Bitte ein neues temporäres Passwort eingeben."));
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch(`/employees/${selectedEmployee.id}`, { access_password: editForm.access_password.trim() });
      setEditForm((current) => ({ ...current, access_password: "" }));
      setEditError("");
      pushToast({ tone: "success", title: t("Passwort aktualisiert"), description: t("Das neue temporäre Passwort wurde gespeichert.") });
      load();
    } catch (error: any) {
      setEditError(error?.response?.data?.detail || t("Das Passwort konnte nicht geandert werden."));
    } finally {
      setSavingPassword(false);
    }
  }

  async function toggleAccess(employee: Employee, nextValue: boolean) {
    if (!employee.user) return;
    await api.patch(`/employees/${employee.id}`, { access_is_active: nextValue });
    pushToast({
      tone: nextValue ? "success" : "info",
      title: nextValue ? t("Zugang aktiviert") : t("Zugang deaktiviert"),
      description: nextValue ? t("Der Benutzer kann sich wieder anmelden.") : t("Der Systemzugang wurde deaktiviert."),
    });
    load();
    if (selectedEmployee?.id === employee.id) {
      setSelectedEmployee({ ...employee, user: employee.user ? { ...employee.user, is_active: nextValue } : null });
    }
  }

  async function archiveEmployee(employee: Employee) {
    if (!window.confirm(t("Mitarbeiter {name} archivieren?", { name: `${employee.first_name} ${employee.last_name}` }))) return;
    await api.patch(`/employees/${employee.id}`, { status: "archived", access_is_active: false });
    pushToast({ tone: "info", title: t("Mitarbeiter archiviert"), description: t("Der Datensatz bleibt erhalten, ist aber nicht mehr aktiv.") });
    if (selectedEmployee?.id === employee.id) setSelectedEmployee(null);
    load();
  }

  async function restoreEmployee(employee: Employee) {
    await api.patch(`/employees/${employee.id}`, { status: "active", access_is_active: true });
    pushToast({ tone: "success", title: t("Mitarbeiter reaktiviert"), description: t("Der Datensatz ist wieder für Teams und Einsätze verfügbar.") });
    load();
  }

  const activeCount = useMemo(() => employees.filter((employee) => employee.status === "active").length, [employees]);

  return (
    <section className="stack">
      <section className="table-card stack">
        <div>
          <h2 className="section-title">{t("Mitarbeiter")}</h2>
          <p className="section-subtitle">{t("Team, Stundensatze, Rollen und Zugange in einem Verwaltungsmodul.")}</p>
        </div>
        <form className="inline-form access-form" onSubmit={createEmployee}>
          <label className="field">{t("Vorname")}<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required /></label>
          <label className="field">{t("Nachname")}<input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required /></label>
          <label className="field">{t("Funktion")}<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} required /></label>
          <label className="field">{t("Telefon")}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: normalizePhone(event.target.value) })} placeholder="+49 30 1000000" /></label>
          <label className="field">EUR/h<input min="1" step="0.5" type="number" value={form.hourly_rate} onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })} required /></label>
          <label className="field">{t("Email")}<input type="email" value={form.access_email} onChange={(event) => setForm({ ...form, access_email: event.target.value })} placeholder="worker@company.de" /></label>
          <label className="field">{t("Temporäres Passwort")}<input type="password" value={form.access_password} onChange={(event) => setForm({ ...form, access_password: event.target.value })} placeholder="mindestens 8 Zeichen" /></label>
          <label className="field">{t("Zugriffsrolle")}<select value={form.access_role_code} onChange={(event) => setForm({ ...form, access_role_code: event.target.value })}><option value="worker">{t("Mitarbeiter")}</option><option value="foreman">{t("Polier")}</option><option value="admin">{t("Admin")}</option></select></label>
          <button className="btn btn-primary" type="submit">{t("Mitarbeiter anlegen")}</button>
        </form>
        {formError ? <div className="form-error">{formError}</div> : null}
      </section>

      <section className="table-card stack">
        <div className="section-head">
          <div>
            <h3 className="section-title">{t("Mitarbeiterliste")}</h3>
            <p className="section-subtitle">{t("Aktiv: {active} · Insgesamt in der aktuellen Ansicht: {total}", { active: activeCount, total: employees.length })}</p>
          </div>
        </div>
        <div className="filters">
          <label className="field">{t("Suche")}<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Vorname, Nachname, Funktion oder E-Mail")} /></label>
          <label className="field">{t("Status")}<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t("Alle")}</option><option value="active">{t("Aktiv")}</option><option value="archived">{t("Archiv")}</option></select></label>
          <div className="summary-card compact-summary">
            <span className="text-muted">{t("Systemzugang")}</span>
            <strong>{t("{count} aktive Konten", { count: employees.filter((employee) => employee.user?.is_active).length })}</strong>
          </div>
        </div>
        <div className="cards-grid">
          {employees.map((employee) => (
            <article className="entity-card employee-card" key={employee.id}>
              <div className="employee-card-header">
                <strong>{employee.first_name} {employee.last_name}</strong>
                <span className="employee-card-role">{translateText(employee.position)}</span>
              </div>
              <p>{employee.phone || t("Keine Telefonnummer hinterlegt")}</p>
              <small>EUR {employee.hourly_rate}/h · {employee.status === "active" ? t("aktiv") : t("archiviert")}</small>
              <div className="employee-access-row">
                <ShieldCheck size={16} />
                <span>{employee.user ? `${employee.user.email} · ${translateText(employee.user.role.name)} · ${employee.user.is_active ? t("aktiv") : t("deaktiviert")}` : t("Kein Zugang angelegt")}</span>
              </div>
              <div className="card-actions">
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditor(employee)}><Pencil size={16} />{t("Bearbeiten")}</button>
                {employee.user ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleAccess(employee, !employee.user?.is_active)}>
                    <ShieldCheck size={16} />{employee.user.is_active ? t("Zugang sperren") : t("Zugang aktivieren")}
                  </button>
                ) : null}
                {employee.status === "archived" ? (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => restoreEmployee(employee)}><RotateCcw size={16} />{t("Reaktivieren")}</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => archiveEmployee(employee)}><Archive size={16} />{t("Archivieren")}</button>
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
                <h3 className="section-title">{t("Mitarbeiterkarte")}</h3>
                <p className="section-subtitle">{t("Personaldaten und Systemzugang zentral bearbeiten.")}</p>
              </div>
              <button className="icon-btn" type="button" aria-label={t("Schliessen")} onClick={() => setSelectedEmployee(null)}><X size={18} /></button>
            </div>
            <form className="stack" onSubmit={saveEmployee}>
              <div className="field-row">
                <label className="field">{t("Vorname")}<input value={editForm.first_name} onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })} required /></label>
                <label className="field">{t("Nachname")}<input value={editForm.last_name} onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })} required /></label>
              </div>
              <div className="field-row">
                <label className="field">{t("Funktion")}<input value={editForm.position} onChange={(event) => setEditForm({ ...editForm, position: event.target.value })} required /></label>
                <label className="field">{t("Telefon")}<input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: normalizePhone(event.target.value) })} /></label>
              </div>
              <label className="field">EUR/h<input min="1" step="0.5" type="number" value={editForm.hourly_rate} onChange={(event) => setEditForm({ ...editForm, hourly_rate: event.target.value })} required /></label>

              <section className="access-panel">
                <div>
                  <h4 className="section-title">{t("Systemzugang")}</h4>
                  <p className="section-subtitle">{t("Konto fur Mitarbeiter, Poliere oder Administration anlegen und pflegen.")}</p>
                </div>
                <div className="field-row access-fields">
                  <label className="field">{t("Email")}<input type="email" value={editForm.access_email} onChange={(event) => setEditForm({ ...editForm, access_email: event.target.value })} placeholder="worker@company.de" /></label>
                  <label className="field">{t("Zugriffsrolle")}<select value={editForm.access_role_code} onChange={(event) => setEditForm({ ...editForm, access_role_code: event.target.value })}><option value="worker">{t("Mitarbeiter")}</option><option value="foreman">{t("Polier")}</option><option value="admin">{t("Admin")}</option></select></label>
                </div>
                <div className="field-row access-fields">
                  <label className="field">
                    {selectedEmployee.user ? t("Neues Passwort") : t("Temporäres Passwort")}
                    <input
                      type="password"
                      value={editForm.access_password}
                      onChange={(event) => setEditForm({ ...editForm, access_password: event.target.value })}
                      placeholder={selectedEmployee.user ? t("leer lassen, wenn unverandert") : t("Passwort fur die Kontoanlage eingeben")}
                    />
                  </label>
                  <div className="access-actions">
                    <span className="text-muted">
                      {selectedEmployee.user
                        ? t("Zugangsstatus: {status}", { status: selectedEmployee.user.is_active ? t("aktiv") : t("deaktiviert") })
                        : t("Noch kein Konto vorhanden. E-Mail und temporäres Passwort eintragen und danach speichern.")}
                    </span>
                    {selectedEmployee.user ? (
                      <button className="btn btn-secondary btn-sm" disabled={savingPassword} type="button" onClick={updatePassword}><KeyRound size={16} />{t("Passwort aktualisieren")}</button>
                    ) : null}
                  </div>
                </div>
              </section>

              {editError ? <div className="form-error">{editError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setSelectedEmployee(null)}>{t("Abbrechen")}</button>
                <button className="btn btn-primary" type="submit">{t("Änderungen speichern")}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
