const labels: Record<string, string> = {
  open: "Відкрито",
  review: "На перевірці",
  approved: "Погоджено",
  rejected: "Відхилено",
  active: "Активно",
  planning: "Планування",
  archived: "Архів",
  done: "Завершено",
  blocked: "Блоковано",
  planned: "Заплановано",
  in_progress: "У роботі"
};

export function statusLabel(status: string) {
  return labels[status] || status;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved" || status === "active" || status === "done"
      ? "success"
      : status === "review" || status === "planning"
        ? "warning"
        : status === "rejected" || status === "blocked"
          ? "danger"
          : "neutral";
  return <span className={`badge badge-${tone}`}>{statusLabel(status)}</span>;
}
