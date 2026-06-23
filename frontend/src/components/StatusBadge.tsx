const labels: Record<string, string> = {
  open: "Eingereicht",
  review: "In Prüfung",
  approved: "Final freigegeben",
  draft: "Entwurf",
  submitted: "Beim Polier",
  foreman_approved: "Bei der Verwaltung",
  admin_approved: "Final freigegeben",
  rejected: "Abgelehnt",
  change_requested: "Nacharbeit",
  active: "Aktiv",
  planning: "In Planung",
  archived: "Archiv",
  done: "Abgeschlossen",
  blocked: "Blockiert",
  planned: "Geplant",
  in_progress: "In Arbeit"
};

export function statusLabel(status: string) {
  return labels[status] || status;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved" || status === "admin_approved" || status === "active" || status === "done"
      ? "success"
      : status === "review" || status === "submitted" || status === "foreman_approved" || status === "planning"
        ? "warning"
        : status === "rejected" || status === "blocked" || status === "change_requested"
          ? "danger"
          : "neutral";
  return <span className={`badge badge-${tone}`}>{statusLabel(status)}</span>;
}
