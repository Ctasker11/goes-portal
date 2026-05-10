"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHAT_INITIAL_PAGE, type ChatMessage } from "@/lib/chat";
import { markChatSeen } from "@/app/chat-actions";
import { ChatPanel } from "./ChatPanel";

type ChatBubbleProps = {
  familyId: string;
  userId: string;
};

export function ChatBubble({ familyId, userId }: ChatBubbleProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function load() {
      const [msgRes, seenRes] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("id, family_id, sender_id, body, created_at")
          .eq("family_id", familyId)
          .order("created_at", { ascending: false })
          .limit(CHAT_INITIAL_PAGE),
        supabase
          .from("chat_seen")
          .select("last_seen_at")
          .eq("family_id", familyId)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (!alive) return;
      if (msgRes.data) setMessages(msgRes.data.slice().reverse());
      setLastSeen(seenRes.data?.last_seen_at ?? null);
      setHydrated(true);
    }
    void load();

    const channel = supabase
      .channel(`chat:${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [familyId, userId]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    const now = new Date().toISOString();
    setLastSeen(now);
    void markChatSeen(familyId);
  }, [familyId]);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleSent = useCallback((m: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  const unread = computeUnread(messages, userId, lastSeen);
  const hasUnread = hydrated && unread > 0 && !open;

  return (
    <>
      {open && (
        <ChatPanel
          familyId={familyId}
          userId={userId}
          messages={messages}
          onClose={handleClose}
          onSent={handleSent}
        />
      )}
      <BubbleButton open={open} hasUnread={hasUnread} onOpen={handleOpen} onClose={handleClose} />
    </>
  );
}

function BubbleButton({
  open,
  hasUnread,
  onOpen,
  onClose,
}: {
  open: boolean;
  hasUnread: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={open ? onClose : onOpen}
      aria-label={open ? "Cerrar chat" : "Abrir chat"}
      className="fixed bottom-6 right-6 z-[200] flex h-14 w-14 items-center justify-center rounded-full transition"
      style={{
        background: "var(--accent)",
        color: "var(--accent-text)",
        boxShadow:
          "0 4px 20px var(--glow-strong), 0 0 0 4px color-mix(in srgb, var(--accent) 8%, transparent)",
        transform: open ? "scale(0.92)" : "scale(1)",
      }}
    >
      {open ? (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M6 6l10 10M16 6L6 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5l-4 4-4-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor" />
        </svg>
      )}
      {hasUnread && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full"
          style={{
            background: "var(--brand-red)",
            border: "2px solid var(--background)",
            animation: "pulse 2s ease infinite",
          }}
        />
      )}
    </button>
  );
}

function computeUnread(
  messages: ChatMessage[],
  userId: string,
  lastSeen: string | null,
): number {
  if (messages.length === 0) return 0;
  const seenAt = lastSeen ? Date.parse(lastSeen) : 0;
  let count = 0;
  for (const m of messages) {
    if (m.sender_id === userId) continue;
    if (Date.parse(m.created_at) > seenAt) count += 1;
  }
  return count;
}
