import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertDefined } from "@/lib/assert";
import { AdvisorFamilyView } from "@/components/admin/AdvisorFamilyView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expediente · GOES Portal",
};

export default async function AdminFamilyPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  assertDefined(familyId, "familyId param");

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

  const [{ data: family }, { data: items }, { data: docs }] = await Promise.all([
    supabase
      .from("families")
      .select("id, student_name, program, created_at")
      .eq("id", familyId)
      .maybeSingle(),
    supabase
      .from("checklist_items")
      .select("id, category, title, description, status")
      .eq("family_id", familyId)
      .order("sort_order"),
    supabase
      .from("documents")
      .select(
        "id, checklist_item_id, filename, size_bytes, created_at, storage_path, version, is_current",
      )
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
  ]);

  if (!family) notFound();

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: comments } = itemIds.length
    ? await supabase
        .from("comments")
        .select(
          "id, checklist_item_id, author_id, body, internal_only, created_at",
        )
        .in("checklist_item_id", itemIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <AdvisorFamilyView
        family={family}
        items={items ?? []}
        docs={docs ?? []}
        comments={comments ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
