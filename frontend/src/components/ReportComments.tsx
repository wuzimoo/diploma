import { FormEvent, useEffect, useState } from "react";

import { useToast } from "../hooks/useToast";
import { api } from "../services/api";
import { ReportComment } from "../types/api";

export function ReportComments({ reportId }: { reportId: number }) {
  const { pushToast } = useToast();
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  async function requestWithFallback<T>(method: "get" | "post", payload?: unknown) {
    const candidates = [`/reports/${reportId}/comments`, `/daily-reports/${reportId}/comments`];
    let lastError: any = null;

    for (const path of candidates) {
      try {
        const response = method === "get"
          ? await api.get<T>(path)
          : await api.post<T>(path, payload);
        return response;
      } catch (requestError: any) {
        lastError = requestError;
        if (requestError?.response?.status !== 404) {
          break;
        }
      }
    }

    throw lastError;
  }

  async function load() {
    setLoadError("");
    try {
      const response = await requestWithFallback<ReportComment[]>("get");
      setComments(response.data);
    } catch (requestError: any) {
      setComments([]);
      if (requestError?.response?.status === 404) {
        setLoadError("Модуль коментарів ще не доступний на поточному сервері. Оновіть backend deployment.");
        return;
      }
      setLoadError(requestError?.response?.data?.detail || "Не вдалося завантажити коментарі.");
    }
  }

  useEffect(() => {
    void load();
  }, [reportId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loadError) {
      setError(loadError);
      return;
    }
    if (!body.trim()) {
      setError("Порожній коментар не можна відправити.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await requestWithFallback("post", { body: body.trim() });
      setBody("");
      pushToast({ tone: "success", title: "Коментар додано", description: "Нова примітка збережена у звіті." });
      await load();
    } catch (requestError: any) {
      if (requestError?.response?.status === 404) {
        setError("Коментарі поки не підтримуються на поточному backend deployment.");
      } else {
        setError(requestError?.response?.data?.detail || "Не вдалося додати коментар.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="table-card stack">
      <div>
        <h3 className="section-title">Коментарі</h3>
        <p className="section-subtitle">Обговорення між worker, foreman та admin по конкретному звіту.</p>
        {loadError ? <div className="form-error comments-warning">{loadError}</div> : null}
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          Додати коментар
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Наприклад: додайте фото щитової або уточніть виконаний обсяг." disabled={Boolean(loadError) || saving} />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="btn btn-primary" disabled={saving || Boolean(loadError)} type="submit">Додати коментар</button>
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
        )) : <div className="empty-state"><strong>{loadError ? "Коментарі недоступні" : "Коментарів ще немає"}</strong><span>{loadError ? "Після оновлення backend deployment цей блок запрацює автоматично." : "Перший коментар можна додати нижче."}</span></div>}
      </div>
    </section>
  );
}
