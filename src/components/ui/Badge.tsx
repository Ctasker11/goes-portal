export type BadgeStatus =
  | "not_started"
  | "submitted"
  | "in_review"
  | "approved";

type BadgeView = "student" | "advisor";

type Config = { label: string; bg: string; color: string; dot: string };

const STUDENT_CONFIG: Record<BadgeStatus, Config> = {
  not_started: {
    label: "Pendiente",
    bg: "var(--surface-track)",
    color: "var(--text-dim)",
    dot: "var(--text-muted)",
  },
  submitted: {
    label: "Enviado",
    bg: "rgba(59,130,246,0.12)",
    color: "#60a5fa",
    dot: "#3b82f6",
  },
  in_review: {
    label: "En revisión",
    bg: "rgba(245,158,11,0.12)",
    color: "#fbbf24",
    dot: "#f59e0b",
  },
  approved: {
    label: "Aprobado",
    bg: "rgba(34,197,94,0.12)",
    color: "#4ade80",
    dot: "#22c55e",
  },
};

// Advisor view: 'submitted' = student uploaded, advisor must act → "Necesita revisión" (warm orange).
const ADVISOR_CONFIG: Record<BadgeStatus, Config> = {
  ...STUDENT_CONFIG,
  submitted: {
    label: "Necesita revisión",
    bg: "rgba(249,115,22,0.14)",
    color: "#fb923c",
    dot: "#f97316",
  },
};

export function Badge({
  status,
  view = "student",
}: {
  status: BadgeStatus;
  view?: BadgeView;
}) {
  const cfg = view === "advisor" ? ADVISOR_CONFIG[status] : STUDENT_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: cfg.dot }}
        aria-hidden
      />
      {cfg.label}
    </span>
  );
}
