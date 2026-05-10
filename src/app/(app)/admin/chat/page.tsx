import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvisorChatLayout } from "@/components/chat/admin/AdvisorChatLayout";
import type { AdvisorConversation } from "@/components/chat/admin/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chat · GOES Portal",
};

export default async function AdvisorChatPage() {
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

  const { data } = await supabase.rpc("advisor_chat_summary");
  const conversations = (data ?? []) as AdvisorConversation[];

  return <AdvisorChatLayout conversations={conversations} userId={user.id} />;
}
