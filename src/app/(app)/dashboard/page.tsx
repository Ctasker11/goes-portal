import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertDefined } from "@/lib/assert";
import type { Item } from "@/components/student/ChecklistItem";
import {
  CategoryGroup,
  EmptyState,
  NextActionBanner,
  ProgressHeader,
} from "./components";
import {
  buildCommentsAndUnread,
  buildDocByItem,
  computeProgress,
  findNextAction,
  groupByCategory,
} from "./data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi progreso · GOES Portal",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertDefined(user, "auth user");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "advisor" || profile?.role === "admin") {
    redirect("/admin");
  }
  if (!profile?.family_id) {
    redirect("/onboarding");
  }
  const familyId: string = profile.family_id;

  const [{ data: items }, { data: docs }] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, category, title, description, status")
      .eq("family_id", familyId)
      .order("sort_order"),
    supabase
      .from("documents")
      .select(
        "id, checklist_item_id, filename, size_bytes, created_at, storage_path",
      )
      .eq("family_id", familyId)
      .eq("is_current", true),
  ]);

  const itemIds = (items ?? []).map((i) => i.id);
  const [commentsRes, viewsRes] =
    itemIds.length > 0
      ? await Promise.all([
          supabase
            .from("comments")
            .select("id, checklist_item_id, author_id, body, created_at")
            .in("checklist_item_id", itemIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("item_views")
            .select("checklist_item_id, last_seen_at")
            .eq("user_id", user.id)
            .in("checklist_item_id", itemIds),
        ])
      : [{ data: null }, { data: null }];
  const rawComments = commentsRes.data ?? [];
  const views = viewsRes.data ?? [];

  const itemList = (items ?? []) as Item[];
  const docByItem = buildDocByItem(docs ?? []);
  const { commentsByItem, unreadByItem } = buildCommentsAndUnread(
    rawComments,
    views,
    user.id,
  );
  const { total, pct } = computeProgress(itemList);
  const grouped = groupByCategory(itemList);
  const { nextAction, count: pendingCount } = findNextAction(
    itemList,
    docByItem,
  );

  return (
    <div className="space-y-8">
      <ProgressHeader fullName={profile.full_name} pct={pct} />
      {nextAction && <NextActionBanner action={nextAction} count={pendingCount} />}
      {total === 0 && <EmptyState />}
      {Object.entries(grouped).map(([category, list]) => (
        <CategoryGroup
          key={category}
          category={category}
          list={list}
          docByItem={docByItem}
          commentsByItem={commentsByItem}
          unreadByItem={unreadByItem}
          familyId={familyId}
          userId={user.id}
        />
      ))}
    </div>
  );
}
