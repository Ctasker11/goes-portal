"use client";

import type { AdvisorConversation } from "./types";

type Props = {
  conversations: AdvisorConversation[];
  activeId: string | null;
  search: string;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
};

export function ConversationList({
  conversations,
  activeId,
  search,
  onSearch,
  onSelect,
}: Props) {
  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <aside
      className="flex flex-shrink-0 flex-col"
      style={{
        width: 300,
        borderRight: "1px solid var(--border)",
        background: "var(--surface-glass)",
      }}
    >
      <div className="px-[18px] pt-5 pb-3.5">
        <h2
          className="text-lg font-extrabold tracking-tight"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-display), Manrope, sans-serif",
          }}
        >
          Mensajes
        </h2>
        {totalUnread > 0 && (
          <p
            className="mt-1 text-xs font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {totalUnread} sin leer
          </p>
        )}
      </div>

      <div className="px-3.5 pb-2.5">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar estudiante…"
          aria-label="Buscar estudiante"
          className="w-full rounded-[10px] border px-3 py-2 text-[13px] outline-none"
          style={{
            background: "var(--surface-sunken)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div
            className="px-5 py-6 text-center text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Sin conversaciones.
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationRow
              key={c.family_id}
              conversation={c}
              active={c.family_id === activeId}
              onSelect={() => onSelect(c.family_id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ConversationRow({
  conversation: c,
  active,
  onSelect,
}: {
  conversation: AdvisorConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-[18px] py-3 text-left transition"
      style={{
        background: active ? "var(--surface-glass)" : "transparent",
        borderLeft: `3px solid ${active ? "var(--accent)" : "transparent"}`,
      }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
        style={{
          background: "var(--surface-sunken)",
          color: "var(--text-dim)",
          fontFamily: "var(--font-display), Manrope, sans-serif",
        }}
      >
        {initialsOf(c.student_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]"
            style={{
              fontWeight: active || c.unread_count > 0 ? 700 : 500,
              color: "var(--foreground)",
            }}
          >
            {c.student_name.split(" ").slice(0, 2).join(" ")}
          </span>
          <span
            className="ml-2 flex-shrink-0 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            {formatRelative(c.last_message_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            {c.last_message ?? "Sin mensajes"}
          </span>
          {c.unread_count > 0 && (
            <span
              className="ml-1.5 flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "var(--brand-red)" }}
            >
              {c.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "·";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const diff = (now.getTime() - d.getTime()) / 86_400_000;
  if (diff < 2) return "Ayer";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}
