export function QuestionBanksBadge({ children, tone }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "red"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-muted text-muted-foreground ring-border";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${toneClass}`}>{children}</span>;
}

export function formatDate(value) {
  if (!value) return "Not updated";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatBankStatus(value) {
  if (!value) return "None";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

export function getStatusTone(value) {
  if (value === "Ready") return "green";
  if (value === "Deleted") return "red";
  return "neutral";
}
