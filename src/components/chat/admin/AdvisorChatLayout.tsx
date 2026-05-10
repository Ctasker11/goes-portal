"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SIDEBAR_W } from "@/components/layout/Sidebar";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";
import type { AdvisorConversation } from "./types";

const HEADER_H = 57;

type Props = {
  conversations: AdvisorConversation[];
  userId: string;
};

export function AdvisorChatLayout({ conversations: initial, userId }: Props) {
  const [conversations, setConversations] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(
    initial[0]?.family_id ?? null,
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chat:advisor-summary")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => {
          void refreshSummary(setConversations);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.student_name.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const active = conversations.find((c) => c.family_id === activeId) ?? null;

  return (
    <div
      className="flex"
      style={{
        position: "fixed",
        left: SIDEBAR_W,
        top: HEADER_H,
        right: 0,
        bottom: 0,
      }}
    >
      <ConversationList
        conversations={filtered}
        activeId={activeId}
        search={search}
        onSearch={setSearch}
        onSelect={(id) => {
          setActiveId(id);
          setConversations((prev) =>
            prev.map((c) =>
              c.family_id === id ? { ...c, unread_count: 0 } : c,
            ),
          );
        }}
      />
      {active ? (
        <ConversationView
          familyId={active.family_id}
          studentName={active.student_name}
          userId={userId}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-1 items-center justify-center text-sm"
      style={{ color: "var(--text-dim)" }}
    >
      Selecciona una conversación.
    </div>
  );
}

async function refreshSummary(
  setter: (rows: AdvisorConversation[]) => void,
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.rpc("advisor_chat_summary");
  if (data) setter(data as AdvisorConversation[]);
}
