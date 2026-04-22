import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvisorChecklistItem } from "@/components/AdvisorChecklistItem";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  academic_records: "Expediente académico",
  standardized_tests: "Pruebas estandarizadas",
  essays: "Ensayos y cartas",
  sports_profile: "Perfil deportivo",
  personal_visa: "Personal y visa",
  other: "Otros",
};

export default async function AdminFamilyPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "advisor" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: family } = await supabase
    .from("families")
    .select("id, student_name, program, created_at")
    .eq("id", familyId)
    .maybeSingle();
  if (!family) notFound();

  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, category, title, description, status")
    .eq("family_id", familyId)
    .order("sort_order");

  const { data: docs } = await supabase
    .from("documents")
    .select(
      "id, checklist_item_id, filename, size_bytes, created_at, storage_path, version, is_current",
    )
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  const { data: comments } = await supabase
    .from("comments")
    .select("id, checklist_item_id, author_id, body, internal_only, created_at")
    .in("checklist_item_id", (items ?? []).map((i) => i.id))
    .order("created_at", { ascending: true });

  const docsByItem = new Map<string, typeof docs>();
  (docs ?? []).forEach((d) => {
    const arr = docsByItem.get(d.checklist_item_id) ?? [];
    arr.push(d);
    docsByItem.set(d.checklist_item_id, arr);
  });

  const commentsByItem = new Map<string, typeof comments>();
  (comments ?? []).forEach((c) => {
    const arr = commentsByItem.get(c.checklist_item_id) ?? [];
    arr.push(c);
    commentsByItem.set(c.checklist_item_id, arr);
  });

  const grouped = (items ?? []).reduce<Record<string, typeof items>>(
    (acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    },
    {},
  );

  const total = items?.length ?? 0;
  const approved = items?.filter((i) => i.status === "approved").length ?? 0;
  const submitted = items?.filter((i) => i.status === "submitted").length ?? 0;
  const pendingReview = submitted;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-navy"
        >
          ← Volver al panel
        </Link>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {family.student_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Programa: <span className="capitalize">{family.program}</span> ·
              Alta: {new Date(family.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-2xl font-bold text-navy">
                {approved}/{total}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Aprobados
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-brand">
                {pendingReview}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Por revisar
              </div>
            </div>
          </div>
        </div>
      </section>

      {Object.entries(grouped).map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="space-y-2">
            {list?.map((item) => (
              <AdvisorChecklistItem
                key={item.id}
                item={item}
                docs={docsByItem.get(item.id) ?? []}
                comments={commentsByItem.get(item.id) ?? []}
                currentUserId={user.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
