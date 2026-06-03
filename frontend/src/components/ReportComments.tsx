import { FormEvent, useEffect, useState } from "react";

import { useToast } from "../hooks/useToast";
import { api } from "../services/api";
import { ReportComment } from "../types/api";

export function ReportComments({ reportId }: { reportId: number }) {
  const { pushToast } = useToast();
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<ReportComment[]>(`/reports/${reportId}/comments`).then((response) => setComments(response.data));
  }

  useEffect(() => {
    load();
  }, [reportId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Порожній коментар не можна відправити.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`/reports/${reportId}/comments`, { body: body.trim() });
      setBody("");
      pushToast({ tone: "success", title: "Коментар додано", description: "Нова примітка збережена у звіті." });
      load();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "Не вдалося додати коментар.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="table-card stack">
      <div>
        <h3 className="section-title">Коментарі</h3>
        <p className="section-subtitle">Обговорення між worker, foreman та admin по конкретному звіту.</p>
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          Додати коментар
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Наприклад: додайте фото щитової або уточніть виконаний обсяг." />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="btn btn-primary" disabled={saving} type="submit">Додати коментар</button>
      </form>
      <div className="comments-list">
        {comments.length ? comments.map((comment) => (
          <article className="comment-card" key={comment.id}>
            <div className="report-item-top">
              <strong>{comment.author.full_name}</strong>
              <span className="text-muted">{new Date(comment.created_at).toLocaleString("uk-UA")}</span>
            </div>
            <div className="comment-meta">{comment.author.role.name}</div>
            <p>{comment.body}</p>
          </article>
        )) : <div className="empty-state"><strong>Коментарів ще немає</strong><span>Перший коментар можна додати нижче.</span></div>}
      </div>
    </section>
  );
}
