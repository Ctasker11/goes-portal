import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ChecklistItem,
  type Item,
  type CurrentDoc,
  type Comment,
} from "@/components/student/ChecklistItem";
import { Collapsible } from "@/components/ui/Collapsible";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  academic_records: "Expediente académico",
  standardized_tests: "Pruebas estandarizadas",
  essays: "Ensayos y cartas",
  sports_profile: "Perfil deportivo",
  personal_visa: "Personal y visa",
  other: "Otros",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id, full_name")
    .eq("id", user!.id)
    .maybeSingle();

  if (profile?.role === "advisor" || profile?.role === "admin") {
    redirect("/admin");
  }
  if (!profile?.family_id) {
    redirect("/onboarding");
  }

  const [{ data: items }, { data: docs }] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, category, title, description, status")
      .eq("family_id", profile.family_id)
      .order("sort_order"),
    supabase
      .from("documents")
      .select("id, checklist_item_id, filename, size_bytes, created_at, storage_path")
      .eq("family_id", profile.family_id)
      .eq("is_current", true),
  ]);

  const docByItem = new Map<string, CurrentDoc>();
  (docs ?? []).forEach((d) =>
    docByItem.set(d.checklist_item_id, {
      id: d.id,
      filename: d.filename,
      size_bytes: d.size_bytes,
      created_at: d.created_at,
      storage_path: d.storage_path,
    }),
  );

  const itemIds = (items ?? []).map((i) => i.id);
  const [{ data: rawComments }, { data: views }] = itemIds.length
    ? await Promise.all([
        supabase
          .from("comments")
          .select("id, checklist_item_id, author_id, body, created_at")
          .in("checklist_item_id", itemIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("item_views")
          .select("checklist_item_id, last_seen_at")
          .eq("user_id", user!.id)
          .in("checklist_item_id", itemIds),
      ])
    : [{ data: [] }, { data: [] }];

  const lastSeenByItem = new Map<string, string>();
  (views ?? []).forEach((v) =>
    lastSeenByItem.set(v.checklist_item_id, v.last_seen_at),
  );

  const commentsByItem = new Map<string, Comment[]>();
  const unreadByItem = new Map<string, number>();
  (rawComments ?? []).forEach((c) => {
    const arr = commentsByItem.get(c.checklist_item_id) ?? [];
    arr.push({ id: c.id, body: c.body, created_at: c.created_at });
    commentsByItem.set(c.checklist_item_id, arr);

    if (c.author_id !== user!.id) {
      const lastSeen = lastSeenByItem.get(c.checklist_item_id);
      if (!lastSeen || new Date(c.created_at) > new Date(lastSeen)) {
        unreadByItem.set(
          c.checklist_item_id,
          (unreadByItem.get(c.checklist_item_id) ?? 0) + 1,
        );
      }
    }
  });

  const total = items?.length ?? 0;
  const done = items?.filter((i) => i.status === "approved").length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = (items ?? []).reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item as Item);
    return acc;
  }, {});

  const nextAction = (items ?? []).find(
    (i) => i.status !== "approved" && !docByItem.has(i.id),
  ) as Item | undefined;
  const nextActionCount = (items ?? []).filter(
    (i) => i.status !== "approved" && !docByItem.has(i.id),
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              ¡Hola{profile?.full_name ? `, ${profile.full_name}` : ""}!
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
      </section>

      {nextAction && (
        <a
          href={`#item-${nextAction.id}`}
          className="flex items-center justify-between rounded-xl border border-red-brand/30 bg-red-brand/5 p-5 shadow-sm transition hover:bg-red-brand/10"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-red-brand">
              Siguiente paso
            </div>
            <div className="mt-1 text-base font-medium text-navy">
              Sube: {nextAction.title}
            </div>
            {nextActionCount > 1 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {nextActionCount - 1} documento{nextActionCount - 1 !== 1 ? "s" : ""} más
                pendiente{nextActionCount - 1 !== 1 ? "s" : ""} después de este.
              </div>
            )}
          </div>
          <span className="rounded-full bg-red-brand px-4 py-2 text-sm font-semibold text-white">
            Ir →
          </span>
        </a>
      )}

      {total === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-muted-foreground">
            Aún no tienes documentos asignados. Tu asesor GOES te los preparará
            en breve.
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([category, list]) => {
        const catApproved = list.filter((i) => i.status === "approved").length;
        const allDone = catApproved === list.length && list.length > 0;
        return (
          <Collapsible
            key={category}
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
                  {catApproved}/{list.length}
                </span>
              </>
            }
          >
            <div className="space-y-2">
              {list.map((item) => {
                const doc = docByItem.get(item.id) ?? null;
                const stale =
                  item.status === "submitted" &&
                  !!doc &&
                  Date.now() - new Date(doc.created_at).getTime() >=
                    7 * 24 * 60 * 60 * 1000;
                return (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    familyId={profile!.family_id!}
                    userId={user!.id}
                    currentDoc={doc}
                    comments={commentsByItem.get(item.id) ?? []}
                    unreadCount={unreadByItem.get(item.id) ?? 0}
                    isStaleSubmitted={stale}
                  />
                );
              })}
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
