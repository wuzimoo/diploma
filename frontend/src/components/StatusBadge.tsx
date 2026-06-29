import { useI18n } from "../hooks/useI18n";

export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useI18n();
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
