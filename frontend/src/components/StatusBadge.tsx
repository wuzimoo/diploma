const labels: Record<string, string> = {
  open: "Відкрито",
  review: "На перевірці",
  approved: "Погоджено",
  rejected: "Відхилено",
  active: "Активно",
  planning: "Планування"
};

export function statusLabel(status: string) {
  return labels[status] || status;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "approved" || status === "active" ? "success" : status === "review" ? "warning" : status === "rejected" ? "danger" : "neutral";
  return <span className={`badge badge-${tone}`}>{statusLabel(status)}</span>;
}

