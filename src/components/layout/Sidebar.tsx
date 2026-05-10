"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarLogo } from "@/components/ui/StarLogo";

export const SIDEBAR_W = 72;

type Tab = {
  href: string;
  label: string;
  icon: "dashboard" | "recursos" | "chat";
};

type SidebarProps = {
  tabs: Tab[];
  initials: string;
  homeHref: string;
  userId?: string;
  chatUnreadInitial?: boolean;
};

export function Sidebar({
  tabs,
  initials,
  homeHref,
  userId,
  chatUnreadInitial = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [chatUnread, setChatUnread] = useState(chatUnreadInitial);
  const [lastClearedFor, setLastClearedFor] = useState<string | null>(null);
  const onChatRoute = pathname?.startsWith("/admin/chat") ?? false;
  const hasChatTab = tabs.some((t) => t.icon === "chat");

  // Reset-on-route-entry via the "adjusting state based on prop change"
  // pattern (React docs): runs in render, sets state, React reconciles.
  if (onChatRoute && lastClearedFor !== pathname) {
    setLastClearedFor(pathname);
    if (chatUnread) setChatUnread(false);
  }

  useEffect(() => {
    if (!hasChatTab || !userId) return undefined;
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar:chat-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as { sender_id: string };
          if (m.sender_id !== userId) setChatUnread(true);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hasChatTab, userId]);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col items-center pt-5"
      style={{
        width: SIDEBAR_W,
        background: "var(--surface-overlay)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <Link
        href={homeHref}
        aria-label="Inicio"
        className="mb-7 transition hover:opacity-80"
      >
        <StarLogo size={28} />
      </Link>

      <nav className="flex w-full flex-col gap-1 px-2">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href);
          const showDot = t.icon === "chat" && chatUnread && !onChatRoute;
          return (
            <SidebarTab key={t.href} tab={t} active={active} showDot={showDot} />
          );
        })}
      </nav>

      <div
        className="mt-auto mb-5 flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold"
        style={{
          background: "var(--surface-glass)",
          color: "var(--accent)",
          fontFamily: "var(--font-display), Manrope, sans-serif",
        }}
        aria-label="Tu perfil"
      >
        {initials}
      </div>
    </aside>
  );
}

function SidebarTab({
  tab,
  active,
  showDot,
}: {
  tab: Tab;
  active: boolean;
  showDot: boolean;
}) {
  return (
    <Link
      href={tab.href}
      className="relative flex flex-col items-center gap-1 rounded-xl py-2.5 transition"
      style={{
        background: active ? "var(--surface-glass)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-dim)",
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -left-2 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r"
          style={{
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--glow-strong)",
          }}
        />
      )}
      <span className="relative">
        <TabIcon kind={tab.icon} />
        {showDot && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full"
            style={{
              background: "var(--brand-red)",
              border: "2px solid var(--surface-overlay)",
            }}
          />
        )}
      </span>
      <span
        className="text-[9px] uppercase tracking-wider"
        style={{
          fontWeight: active ? 700 : 500,
          fontFamily: "var(--font-display), Manrope, sans-serif",
        }}
      >
        {tab.label}
      </span>
    </Link>
  );
}

function TabIcon({ kind }: { kind: Tab["icon"] }) {
  if (kind === "dashboard") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="12" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="9" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === "recursos") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h3A1.5 1.5 0 0 1 9 4.5V7H4.5A1.5 1.5 0 0 1 3 5.5V4.5z" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="6" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 17V9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 4h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 3-3-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/admin") {
    if (pathname === "/admin") return true;
    if (pathname.startsWith("/admin/chat")) return false;
    return /^\/admin\/[^/]+$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
