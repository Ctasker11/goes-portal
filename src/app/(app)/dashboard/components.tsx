import {
  ChecklistItem,
  type Item,
  type CurrentDoc,
  type Comment,
} from "@/components/student/ChecklistItem";
import { Collapsible } from "@/components/ui/Collapsible";
import { isStaleSubmitted } from "./data";

const CATEGORY_LABELS: Record<string, string> = {
  academic_records: "Expediente académico",
  standardized_tests: "Pruebas estandarizadas",
  essays: "Ensayos y cartas",
  sports_profile: "Perfil deportivo",
  personal_visa: "Personal y visa",
  other: "Otros",
};

export function ProgressHeader({
  fullName,
  pct,
}: {
  fullName: string | null | undefined;
  pct: number;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            ¡Hola{fullName ? `, ${fullName}` : ""}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu progreso hacia la beca. Sube los documentos pendientes y tu
            asesor los revisará.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-navy">{pct}%</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Completado
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-red-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <StatusLegend />
    </section>
  );
}

function StatusLegend() {
  return (
    <details className="group mt-4 text-xs text-muted-foreground">
      <summary className="inline-flex cursor-pointer items-center gap-1 select-none">
        <span className="underline-offset-2 group-hover:underline">
          ¿Qué significan los estados?
        </span>
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-2 space-y-1">
        <li>
          <span className="mr-2 rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
            Enviado
          </span>
          El documento se subió y espera revisión.
        </li>
        <li>
          <span className="mr-2 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800">
            En revisión
          </span>
          Tu asesor lo está revisando.
        </li>
        <li>
          <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-green-800">
            Aprobado
          </span>
          Todo en orden — no requiere acción.
        </li>
      </ul>
    </details>
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
    <a
      href={`#item-${action.id}`}
      className="flex items-center justify-between rounded-xl border border-red-brand/30 bg-red-brand/5 p-5 shadow-sm transition hover:bg-red-brand/10"
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-red-brand">
          Siguiente paso
        </div>
        <div className="mt-1 text-base font-medium text-navy">
          Sube: {action.title}
        </div>
        {remaining > 0 && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {remaining} documento{remaining !== 1 ? "s" : ""} más pendiente
            {remaining !== 1 ? "s" : ""} después de este.
          </div>
        )}
      </div>
      <span className="rounded-full bg-red-brand px-4 py-2 text-sm font-semibold text-white">
        Ir →
      </span>
    </a>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-xl bg-white p-10 text-center shadow-sm">
      <p className="text-muted-foreground">
        Aún no tienes documentos asignados. Tu asesor GOES te los preparará en
        breve.
      </p>
    </div>
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
}: {
  category: string;
  list: Item[];
  docByItem: Map<string, CurrentDoc>;
  commentsByItem: Map<string, Comment[]>;
  unreadByItem: Map<string, number>;
  familyId: string;
  userId: string;
}) {
  const approved = list.filter((i) => i.status === "approved").length;
  const allDone = approved === list.length && list.length > 0;
  return (
    <Collapsible
      defaultOpen={!allDone}
      title={
        <>
          {CATEGORY_LABELS[category] ?? category}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              allDone
                ? "bg-green-100 text-green-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {approved}/{list.length}
          </span>
        </>
      }
    >
      <div className="space-y-2">
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
      </div>
    </Collapsible>
  );
}
