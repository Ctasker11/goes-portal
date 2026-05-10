"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHAT_INITIAL_PAGE, type ChatMessage } from "@/lib/chat";
import { markChatSeen } from "@/app/chat-actions";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";

type Props = {
  familyId: string;
  studentName: string;
  userId: string;
};

export function ConversationView({ familyId, studentName, userId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    async function load() {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, family_id, sender_id, body, created_at")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false })
        .limit(CHAT_INITIAL_PAGE);
      if (!alive) return;
      setMessages((data ?? []).slice().reverse());
      void markChatSeen(familyId);
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
          void markChatSeen(familyId);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [familyId]);

  function handleSent(m: ChatMessage) {
    setMessages((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, m],
    );
  }

  return (
    <section className="flex flex-1 flex-col">
      <Header familyId={familyId} studentName={studentName} />
      <ChatMessageList messages={messages} userId={userId} />
      <ChatComposer familyId={familyId} onSent={handleSent} />
    </section>
  );
}

function Header({
  familyId,
  studentName,
}: {
  familyId: string;
  studentName: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3.5"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-glass)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: "var(--surface-sunken)",
            color: "var(--text-dim)",
            fontFamily: "var(--font-display), Manrope, sans-serif",
          }}
        >
          {initialsOf(studentName)}
        </div>
        <div
          className="text-[15px] font-bold"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-display), Manrope, sans-serif",
          }}
        >
          {studentName}
        </div>
      </div>
      <Link
        href={`/admin/${familyId}`}
        className="rounded-lg border-none px-3.5 py-1.5 text-xs font-semibold transition"
        style={{
          background: "var(--surface-sunken)",
          color: "var(--text-dim)",
        }}
      >
        Ver perfil
      </Link>
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "·";
}
