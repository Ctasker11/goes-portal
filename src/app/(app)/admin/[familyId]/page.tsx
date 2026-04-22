import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvisorFamilyView } from "@/components/AdvisorFamilyView";

export const dynamic = "force-dynamic";

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

  return (
    <AdvisorFamilyView
      family={family}
      items={items ?? []}
      docs={docs ?? []}
      comments={comments ?? []}
      currentUserId={user.id}
    />
  );
}
