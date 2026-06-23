import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, MessageSquareText } from "lucide-react";

import { useToast } from "../hooks/useToast";
import { formatDateTime } from "../lib/format";
import { api } from "../services/api";
import { ReportActivityItem } from "../types/api";

const toneIcon = {
  neutral: Clock3,
  success: CheckCircle2,
  warning: CircleAlert,
  danger: CircleAlert,
} as const;

export function ReportComments({ reportId }: { reportId: number }) {
  const { pushToast } = useToast();
  const [activity, setActivity] = useState<ReportActivityItem[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  async function requestWithFallback<T>(method: "get" | "post", suffix: "activity" | "comments", payload?: unknown) {
    const candidates = [`/reports/${reportId}/${suffix}`, `/daily-reports/${reportId}/${suffix}`];
    let lastError: any = null;

    for (const path of candidates) {
      try {
        const response = method === "get" ? await api.get<T>(path) : await api.post<T>(path, payload);
        return response;
      } catch (requestError: any) {
        lastError = requestError;
        if (requestError?.response?.status !== 404) break;
      }
    }

    throw lastError;
  }

  async function load() {
    setLoadError("");
    try {
      const response = await requestWithFallback<ReportActivityItem[]>("get", "activity");
      setActivity(response.data);
    } catch (requestError: any) {
      setActivity([]);
      if (requestError?.response?.status === 404) {
        setLoadError("Das Aktivitatsmodul ist auf diesem Server noch nicht verfugbar. Bitte das Backend-Deployment aktualisieren.");
        return;
      }
      setLoadError(requestError?.response?.data?.detail || "Die Berichtshistorie konnte nicht geladen werden.");
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
      setError("Leere Kommentare konnen nicht gespeichert werden.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await requestWithFallback("post", "comments", { body: body.trim() });
      setBody("");
      pushToast({ tone: "success", title: "Kommentar gespeichert", description: "Die neue Notiz wurde dem Bericht hinzugefugt." });
      await load();
    } catch (requestError: any) {
      if (requestError?.response?.status === 404) {
        setError("Kommentare werden vom aktuellen Backend-Deployment noch nicht unterstutzt.");
      } else {
        setError(requestError?.response?.data?.detail || "Der Kommentar konnte nicht gespeichert werden.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="table-card stack">
      <div>
        <h3 className="section-title">Kommentare und Historie</h3>
        <p className="section-subtitle">Ereignisse zum Bericht: Erstellung, Statuswechsel, Uploads und Teamkommentare.</p>
        {loadError ? <div className="form-error comments-warning">{loadError}</div> : null}
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          Kommentar erfassen
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="z. B. bitte Fotos der Verteilung nachreichen oder Mengenangabe konkretisieren"
            disabled={Boolean(loadError) || saving}
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="btn btn-primary" disabled={saving || Boolean(loadError)} type="submit">
          Kommentar speichern
        </button>
      </form>
      <div className="activity-list">
        {activity.length ? (
          activity.map((item) => {
            const Icon = item.kind === "comment" ? MessageSquareText : toneIcon[item.tone];
            return (
              <article className={`activity-card ${item.tone}`} key={item.id}>
                <div className="activity-card-head">
                  <div className="activity-title-row">
                    <span className={`activity-icon ${item.tone}`}>
                      <Icon size={15} />
                    </span>
                    <strong>{item.title}</strong>
                  </div>
                  <span className="text-muted">{formatDateTime(item.created_at)}</span>
                </div>
                {item.author ? <div className="comment-meta">{item.author.full_name} · {item.author.role.name}</div> : null}
                {item.body ? <p>{item.body}</p> : null}
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <strong>{loadError ? "Historie nicht verfugbar" : "Noch keine Ereignisse"}</strong>
            <span>{loadError ? "Nach dem Backend-Update wird dieser Bereich automatisch aktiv." : "Der erste Kommentar oder Statuswechsel erscheint hier."}</span>
          </div>
        )}
      </div>
    </section>
  );
}
