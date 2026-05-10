"use client";

import type { ChatMessage } from "@/lib/chat";
import { ChatMessageList } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";

type ChatPanelProps = {
  familyId: string;
  userId: string;
  messages: ChatMessage[];
  onClose: () => void;
  onSent: (message: ChatMessage) => void;
};

export function ChatPanel({ familyId, userId, messages, onClose, onSent }: ChatPanelProps) {
  return (
    <div
      role="dialog"
      aria-label="Chat con tu asesor"
      className="fixed bottom-[88px] right-6 z-[200] flex h-[480px] w-[370px] flex-col overflow-hidden rounded-[20px]"
      style={{
        background: "var(--surface-overlay)",
        border: "1px solid var(--border)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.25), 0 0 0 1px var(--border)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        animation: "fadeUp 250ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <ChatHeader onClose={onClose} />
      <ChatMessageList messages={messages} userId={userId} />
      <ChatComposer familyId={familyId} onSent={onSent} />
    </div>
  );
}

function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between border-b px-5 py-4"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-glass)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: "var(--surface-glass)",
            color: "var(--accent)",
            fontFamily: "var(--font-display), Manrope, sans-serif",
          }}
        >
          AG
        </div>
        <div
          className="text-sm font-bold"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-display), Manrope, sans-serif",
          }}
        >
          Equipo GOES
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="cursor-pointer border-none bg-transparent p-1 text-lg leading-none"
        style={{ color: "var(--text-muted)" }}
      >
        ✕
      </button>
    </div>
  );
}
