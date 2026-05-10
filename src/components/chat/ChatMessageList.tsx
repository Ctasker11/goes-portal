"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat";

type Props = {
  messages: ChatMessage[];
  userId: string;
};

export function ChatMessageList({ messages, userId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-4 pb-2"
    >
      {messages.length === 0 ? (
        <div
          className="m-auto text-center text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Aún no hay mensajes. Escribe el primero.
        </div>
      ) : (
        messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.sender_id === userId} />
        ))
      )}
    </div>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div
      className="flex flex-col"
      style={{ alignItems: mine ? "flex-end" : "flex-start" }}
    >
      <div
        className="max-w-[80%] px-3.5 py-2.5 text-[13px] leading-snug"
        style={{
          borderRadius: 14,
          borderBottomRightRadius: mine ? 4 : 14,
          borderBottomLeftRadius: mine ? 14 : 4,
          background: mine
            ? "color-mix(in srgb, var(--accent) 14%, transparent)"
            : "var(--surface-sunken)",
          border: mine
            ? "1px solid color-mix(in srgb, var(--accent) 22%, transparent)"
            : "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      >
        {message.body}
      </div>
      <div
        className="mt-0.5 px-1 text-[9px]"
        style={{ color: "var(--text-muted)" }}
      >
        {formatTime(message.created_at)}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
