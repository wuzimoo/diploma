const labels: Record<string, string> = {
  open: "Подано",
  review: "Подано",
  approved: "Фінально погоджено",
  draft: "Чернетка",
  submitted: "У бригадира",
  foreman_approved: "У адміна",
  admin_approved: "Фінально погоджено",
  rejected: "Відхилено",
  change_requested: "Потрібні зміни",
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
    status === "approved" || status === "admin_approved" || status === "active" || status === "done"
      ? "success"
      : status === "review" || status === "submitted" || status === "foreman_approved" || status === "planning"
        ? "warning"
        : status === "rejected" || status === "blocked" || status === "change_requested"
          ? "danger"
          : "neutral";
  return <span className={`badge badge-${tone}`}>{statusLabel(status)}</span>;
}
