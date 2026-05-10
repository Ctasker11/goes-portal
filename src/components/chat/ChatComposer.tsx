"use client";

import { useRef, useState, useTransition } from "react";
import { sendChatMessage } from "@/app/chat-actions";
import { CHAT_BODY_MAX, type ChatMessage } from "@/lib/chat";
import { useToast } from "@/components/ui/Toast";

type Props = {
  familyId: string;
  onSent: (message: ChatMessage) => void;
};

export function ChatComposer({ familyId, onSent }: Props) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  function submit() {
    const trimmed = body.trim();
    if (trimmed.length === 0 || pending) return;
    setBody("");
    inputRef.current?.focus();
    startTransition(async () => {
      const res = await sendChatMessage(familyId, trimmed);
      if (!res.ok) {
        show("error", res.error);
        setBody(trimmed);
        return;
      }
      onSent(res.message);
    });
  }

  return (
    <div
      className="border-t px-3.5 py-2.5"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 rounded-xl p-1"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border)",
        }}
      >
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={CHAT_BODY_MAX}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="flex-1 border-none bg-transparent px-2.5 py-2 text-[13px] outline-none"
          style={{ color: "var(--foreground)" }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || body.trim().length === 0}
          aria-label="Enviar"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border-none text-sm font-bold transition disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-text)",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
