import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useToast } from "../hooks/useToast";
import { formatHours } from "../lib/format";
import { api } from "../services/api";
import { ActiveAssignment } from "../types/api";

function hours(start: string, end: string, pause: number) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(((eh * 60 + em) - (sh * 60 + sm) - pause) / 60, 0);
}

export function CreateReportPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [activeAssignment, setActiveAssignment] = useState<ActiveAssignment | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    work_plan_item_id: "",
    start_time: "08:00",
    end_time: "16:30",
    break_minutes: 30,
    completed_volume: "",
    work_description: ""
  });
  const workedHours = useMemo(() => hours(form.start_time, form.end_time, form.break_minutes), [form]);

  useEffect(() => {
    api.get<ActiveAssignment>("/me/active-assignment").then((response) => {
      setActiveAssignment(response.data);
      setForm((current) => ({ ...current, work_plan_item_id: String(response.data.work_plan_items[0]?.id || "") }));
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.work_description.trim() || form.work_description.trim().length < 5) {
      setFormError("Bitte erfassen Sie eine aussagekraftige Arbeitsbeschreibung mit mindestens 5 Zeichen.");
      return;
    }
    if (!form.completed_volume) {
      setFormError("Bitte geben Sie die ausgeführte Menge an.");
      return;
    }
    if (Number(form.completed_volume) <= 0) {
      setFormError("Die ausgeführte Menge muss größer als 0 sein.");
      return;
    }
    if (form.end_time <= form.start_time) {
      setFormError("Die Endzeit muss nach der Startzeit liegen.");
      return;
    }
    if (form.break_minutes < 0) {
      setFormError("Die Pause darf nicht negativ sein.");
      return;
    }
    if (workedHours <= 0) {
      setFormError("Die Arbeitszeit muss größer als 0 Stunden sein.");
      return;
    }
    setFormError("");
    const response = await api.post("/daily-reports", {
      ...form,
      construction_object_id: activeAssignment?.construction_object?.id,
      employee_id: activeAssignment?.employee.id,
      work_plan_item_id: form.work_plan_item_id ? Number(form.work_plan_item_id) : null,
      completed_volume: form.completed_volume ? Number(form.completed_volume) : null,
      media_note: mediaFiles.length ? `${mediaFiles.length} Datei(en): ${mediaFiles.map((file) => file.name).join(", ")}` : null,
      worked_hours: workedHours,
      status: "submitted"
    });
    await Promise.all(mediaFiles.map((file) => {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("caption", "Vom Mitarbeiter im Bericht hochgeladen");
      return api.post(`/reports/${response.data.id}/media`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    }));
    pushToast({ tone: "success", title: "Bericht gesendet", description: "Der Tagesbericht wurde an den Polier zur Prüfung übergeben." });
    navigate(`/worker/reports/${response.data.id}`);
  }

  return (
    <>
      <header className="mobile-header">
        <button className="back-link button-reset" onClick={() => navigate(-1)} type="button">Zurück zur Übersicht</button>
        <h1>Tagesbericht erfassen</h1>
        <p>Bitte prüfen Sie vor dem Absenden Zeiten, Menge und Beschreibung.</p>
      </header>
      <main className="mobile-content">
        <form className="form-grid" onSubmit={submit}>
          <section className="locked-assignment">
            <span>Zugewiesenes Projekt</span>
            <strong>{activeAssignment?.construction_object?.name || "Kein Projekt zugewiesen"}</strong>
            <p>{activeAssignment?.employee.first_name} {activeAssignment?.employee.last_name} · {activeAssignment?.crew?.name || "ohne Team"}</p>
          </section>
          <label className="field">Datum<input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></label>
          <label className="field">Arbeitspaket<select value={form.work_plan_item_id} onChange={(e) => setForm({ ...form, work_plan_item_id: e.target.value })}>
            {activeAssignment?.work_plan_items.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.completed_volume}/{item.planned_volume} {item.unit}</option>)}
          </select></label>
          <div className="field-row">
            <label className="field">Start<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            <label className="field">Ende<input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
          </div>
          <label className="field">Pause, Min.<input type="number" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} /></label>
          <div className="hours-row"><span>Berechnete Arbeitszeit</span><strong>{formatHours(workedHours)}</strong></div>
          <label className="field">Ausgeführte Menge<input type="number" min="0" step="0.1" value={form.completed_volume} onChange={(e) => setForm({ ...form, completed_volume: e.target.value })} placeholder="z. B. 12,5" /></label>
          <label className="field">Arbeitsbeschreibung<textarea value={form.work_description} onChange={(e) => setForm({ ...form, work_description: e.target.value })} placeholder="z. B. Kabeltrassen montiert, Hauptverteilung vorbereitet" /></label>
          <label className="field">Fotos / Medien<input type="file" accept="image/*,video/*,.pdf,.doc,.docx" multiple onChange={(event) => setMediaFiles(Array.from(event.target.files || []))} /><span className="helper">Dateien werden gemeinsam mit dem Bericht hochgeladen und bleiben in der Berichtskarte sichtbar.</span></label>
          {formError ? <div className="form-error">{formError}</div> : null}
          {mediaFiles.length > 0 && <div className="file-list">{mediaFiles.map((file) => <span key={file.name}>{file.name}</span>)}</div>}
          <button className="btn btn-primary btn-block" disabled={!activeAssignment?.construction_object} type="submit">Bericht einreichen</button>
        </form>
      </main>
    </>
  );
}
