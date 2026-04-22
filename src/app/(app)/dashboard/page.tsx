import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ChecklistItem,
  type Item,
  type CurrentDoc,
  type Comment,
} from "@/components/ChecklistItem";

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

  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, category, title, description, status")
    .order("sort_order");

  const { data: docs } = await supabase
    .from("documents")
    .select("id, checklist_item_id, filename, size_bytes, created_at, storage_path")
    .eq("is_current", true);

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
  const { data: rawComments } = itemIds.length
    ? await supabase
        .from("comments")
        .select("id, checklist_item_id, author_id, body, created_at")
        .in("checklist_item_id", itemIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: views } = itemIds.length
    ? await supabase
        .from("item_views")
        .select("checklist_item_id, last_seen_at")
        .eq("user_id", user!.id)
        .in("checklist_item_id", itemIds)
    : { data: [] };

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
      </section>

      {total === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-muted-foreground">
            Aún no tienes documentos asignados. Tu asesor GOES te los preparará
            en breve.
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="space-y-2">
            {list.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                familyId={profile!.family_id!}
                userId={user!.id}
                currentDoc={docByItem.get(item.id) ?? null}
                comments={commentsByItem.get(item.id) ?? []}
                unreadCount={unreadByItem.get(item.id) ?? 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
