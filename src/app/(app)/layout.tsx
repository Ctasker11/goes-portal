import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { ParticleField } from "@/components/ui/ParticleField";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Sidebar, SIDEBAR_W } from "@/components/layout/Sidebar";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { getTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, family_id")
    .eq("id", user.id)
    .maybeSingle();

  const isInternal = profile?.role === "advisor" || profile?.role === "admin";
  const homeHref = isInternal ? "/admin" : "/dashboard";
  const displayName = profile?.full_name || user.email || "";
  const theme = await getTheme();
  const tabs = tabsFor(isInternal);
  const showChat = !isInternal && Boolean(profile?.family_id);
  const chatUnreadInitial = isInternal
    ? await fetchAdvisorChatUnread(supabase)
    : false;

  return (
    <div className="relative z-[1] min-h-screen">
      <ParticleField count={30} />
      <Sidebar
        tabs={tabs}
        initials={initialsFor(displayName)}
        homeHref={homeHref}
        userId={user.id}
        chatUnreadInitial={chatUnreadInitial}
      />
      <div style={{ marginLeft: SIDEBAR_W }}>
        <header
          className="sticky top-0 z-20 border-b border-border"
          style={{
            background: "var(--surface-overlay)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-4 px-6 py-3.5 text-sm">
            <span className="hidden font-semibold text-foreground sm:inline">
              {displayName}
            </span>
            <ThemeToggle theme={theme} />
            <SignOutButton />
          </div>
        </header>
        <main>{children}</main>
      </div>
      {showChat && profile?.family_id && (
        <ChatBubble familyId={profile.family_id} userId={user.id} />
      )}
    </div>
  );
}

type SbClient = Awaited<ReturnType<typeof createClient>>;

function tabsFor(isInternal: boolean) {
  if (isInternal) {
    return [
      { href: "/admin", label: "Dashboard", icon: "dashboard" as const },
      { href: "/admin/chat", label: "Chat", icon: "chat" as const },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
    { href: "/recursos", label: "Recursos", icon: "recursos" as const },
  ];
}

async function fetchAdvisorChatUnread(supabase: SbClient): Promise<boolean> {
  const { data } = await supabase.rpc("advisor_chat_summary");
  return (data ?? []).some((r: { unread_count: number }) => r.unread_count > 0);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "·";
  const second = parts[1];
  if (!second) return first.slice(0, 2).toUpperCase();
  const a = first[0] ?? "";
  const b = second[0] ?? "";
  return (a + b).toUpperCase();
}
