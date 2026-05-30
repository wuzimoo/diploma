import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useToast } from "../hooks/useToast";
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
      setFormError("Додайте змістовний опис робіт щонайменше з 5 символів.");
      return;
    }
    if (!form.completed_volume) {
      setFormError("Вкажіть виконаний обсяг.");
      return;
    }
    if (Number(form.completed_volume) <= 0) {
      setFormError("Виконаний обсяг має бути більшим за 0.");
      return;
    }
    if (form.end_time <= form.start_time) {
      setFormError("Час завершення має бути пізнішим за час початку.");
      return;
    }
    if (form.break_minutes < 0) {
      setFormError("Перерва не може бути від'ємною.");
      return;
    }
    if (workedHours <= 0) {
      setFormError("Робочий час повинен бути більшим за 0 годин.");
      return;
    }
    setFormError("");
    const response = await api.post("/daily-reports", {
      ...form,
      construction_object_id: activeAssignment?.construction_object?.id,
      employee_id: activeAssignment?.employee.id,
      work_plan_item_id: form.work_plan_item_id ? Number(form.work_plan_item_id) : null,
      completed_volume: form.completed_volume ? Number(form.completed_volume) : null,
      media_note: mediaFiles.length ? `${mediaFiles.length} файл(и): ${mediaFiles.map((file) => file.name).join(", ")}` : null,
      worked_hours: workedHours,
      status: "review"
    });
    await Promise.all(mediaFiles.map((file) => api.post("/report-photos", {
      daily_report_id: response.data.id,
      file_name: file.name,
      file_url: `/demo-uploads/${encodeURIComponent(file.name)}`,
      caption: "Додано працівником у формі звіту"
    })));
    pushToast({ tone: "success", title: "Звіт створено", description: "Щоденний звіт відправлено на перевірку." });
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
          <section className="locked-assignment">
            <span>Закріплений поточний об'єкт</span>
            <strong>{activeAssignment?.construction_object?.name || "Об'єкт не призначено"}</strong>
            <p>{activeAssignment?.employee.first_name} {activeAssignment?.employee.last_name} · {activeAssignment?.crew?.name || "без бригади"}</p>
          </section>
          <label className="field">Дата<input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></label>
          <label className="field">План робіт<select value={form.work_plan_item_id} onChange={(e) => setForm({ ...form, work_plan_item_id: e.target.value })}>
            {activeAssignment?.work_plan_items.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.completed_volume}/{item.planned_volume} {item.unit}</option>)}
          </select></label>
          <div className="field-row">
            <label className="field">Початок<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            <label className="field">Завершення<input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
          </div>
          <label className="field">Перерва, хв<input type="number" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })} /></label>
          <div className="hours-row"><span>Розрахований робочий час</span><strong>{workedHours.toFixed(2)} h</strong></div>
          <label className="field">Виконаний обсяг<input type="number" min="0" step="0.1" value={form.completed_volume} onChange={(e) => setForm({ ...form, completed_volume: e.target.value })} placeholder="Напр.: 12.5" /></label>
          <label className="field">Опис робіт<textarea value={form.work_description} onChange={(e) => setForm({ ...form, work_description: e.target.value })} placeholder="Напр.: змонтовано кабельні траси, підготовлено головний щит" /></label>
          <label className="field">Фото / медіа<input type="file" accept="image/*,video/*" multiple onChange={(event) => setMediaFiles(Array.from(event.target.files || []))} /><span className="helper">У demo-збірці зберігається реєстр файлів для звіту; повний storage-пайплайн підключається окремо.</span></label>
          {formError ? <div className="form-error">{formError}</div> : null}
          {mediaFiles.length > 0 && <div className="file-list">{mediaFiles.map((file) => <span key={file.name}>{file.name}</span>)}</div>}
          <button className="btn btn-primary btn-block" disabled={!activeAssignment?.construction_object} type="submit">Надіслати звіт</button>
        </form>
      </main>
    </>
  );
}
