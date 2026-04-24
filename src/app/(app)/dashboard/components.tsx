import {
  ChecklistItem,
  type Item,
  type CurrentDoc,
  type Comment,
} from "@/components/student/ChecklistItem";
import { Collapsible } from "@/components/ui/Collapsible";
import { GlassCard } from "@/components/ui/GlassCard";
import { Ring } from "@/components/ui/Ring";
import { Reveal } from "@/components/ui/Reveal";
import { isStaleSubmitted } from "./data";

const CATEGORY_LABELS: Record<string, string> = {
  academic_records: "Expediente académico",
  standardized_tests: "Pruebas estandarizadas",
  essays: "Ensayos y cartas",
  sports_profile: "Perfil deportivo",
  personal_visa: "Personal y visa",
  other: "Otros",
};

function progressMessage(pct: number): string {
  if (pct < 25) return "Tu viaje hacia la beca empieza aquí.";
  if (pct < 50) return "Buen ritmo. Sigue así.";
  if (pct < 75) return "Más de la mitad — tu asesor está revisando.";
  if (pct < 100) return "Ya casi. Últimos documentos.";
  return "Expediente completo.";
}

function Stat({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-text-dim">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <strong className="text-foreground">{count}</strong> {label}
    </div>
  );
}

export function ProgressHeader({
  fullName,
  pct,
  approvedCount,
  inProcessCount,
  pendingCount,
}: {
  fullName: string | null | undefined;
  pct: number;
  approvedCount: number;
  inProcessCount: number;
  pendingCount: number;
}) {
  return (
    <Reveal>
      <section className="text-center">
        <div className="inline-block">
          <Ring pct={pct} size={120} stroke={5} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-foreground">
          ¡Hola{fullName ? `, ${fullName}` : ""}!
        </h1>
        <p className="mt-2 text-[15px] text-text-dim">{progressMessage(pct)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-6">
          <Stat label="Aprobados" count={approvedCount} color="#4ade80" />
          <Stat label="En proceso" count={inProcessCount} color="#fbbf24" />
          <Stat label="Pendientes" count={pendingCount} color="#64748b" />
        </div>
      </section>
    </Reveal>
  );
}

export function NextActionBanner({
  action,
  count,
}: {
  action: Item;
  count: number;
}) {
  const remaining = count - 1;
  return (
    <Reveal delay={200}>
      <a href={`#item-${action.id}`} className="block">
        <GlassCard glow className="p-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-accent-text"
              style={{
                background: "var(--accent)",
                animation: "pulse 3s ease infinite",
              }}
              aria-hidden
            >
              →
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-accent">
                Siguiente paso
              </div>
              <div className="mt-0.5 text-[15px] font-semibold text-foreground">
                {action.title}
              </div>
              {remaining > 0 && (
                <div className="mt-0.5 text-xs text-text-dim">
                  {remaining} más después de este
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </a>
    </Reveal>
  );
}

export function EmptyState() {
  return (
    <GlassCard className="p-10 text-center">
      <p className="text-sm text-text-dim">
        Aún no tienes documentos asignados. Tu asesor GOES te los preparará en
        breve.
      </p>
    </GlassCard>
  );
}

function CategoryCountBadge({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const allDone = done === total && total > 0;
  const color = allDone ? "#4ade80" : "var(--text-muted)";
  const bg = allDone ? "rgba(34,197,94,0.12)" : "var(--surface-sunken)";
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
      style={{ background: bg, color }}
    >
      {done}/{total}
    </span>
  );
}

export function CategoryGroup({
  category,
  list,
  docByItem,
  commentsByItem,
  unreadByItem,
  familyId,
  userId,
  delay,
}: {
  category: string;
  list: Item[];
  docByItem: Map<string, CurrentDoc>;
  commentsByItem: Map<string, Comment[]>;
  unreadByItem: Map<string, number>;
  familyId: string;
  userId: string;
  delay: number;
}) {
  const approved = list.filter((i) => i.status === "approved").length;
  const allDone = approved === list.length && list.length > 0;
  return (
    <Reveal delay={delay}>
      <Collapsible
        defaultOpen={!allDone}
        title={
          <>
            {CATEGORY_LABELS[category] ?? category}
            <CategoryCountBadge done={approved} total={list.length} />
          </>
        }
      >
        {list.map((item) => {
          const doc = docByItem.get(item.id) ?? null;
          return (
            <ChecklistItem
              key={item.id}
              item={item}
              familyId={familyId}
              userId={userId}
              currentDoc={doc}
              comments={commentsByItem.get(item.id) ?? []}
              unreadCount={unreadByItem.get(item.id) ?? 0}
              isStaleSubmitted={isStaleSubmitted(item, doc)}
            />
          );
        })}
      </Collapsible>
    </Reveal>
  );
}
