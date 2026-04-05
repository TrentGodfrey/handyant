interface StatusBadgeProps {
  status: "confirmed" | "pending" | "completed" | "in-progress" | "needs-parts" | "scheduled" | "cancelled";
  size?: "sm" | "md";
}

const statusConfig = {
  confirmed: { bg: "bg-success-light", text: "text-success", label: "Confirmed" },
  scheduled: { bg: "bg-info-light", text: "text-info", label: "Scheduled" },
  pending: { bg: "bg-warning-light", text: "text-accent-amber", label: "Pending" },
  completed: { bg: "bg-surface-secondary", text: "text-text-secondary", label: "Completed" },
  "in-progress": { bg: "bg-primary-50", text: "text-primary", label: "In Progress" },
  "needs-parts": { bg: "bg-[#F5F3FF]", text: "text-accent-purple", label: "Needs Parts" },
  cancelled: { bg: "bg-surface-secondary", text: "text-text-tertiary", label: "Cancelled" },
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${config.bg} ${
      size === "sm" ? "text-[11px]" : "text-xs"
    }`}>
      <span className={`font-semibold ${config.text}`}>{config.label}</span>
    </span>
  );
}
