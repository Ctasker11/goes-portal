"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { friendlyError } from "@/lib/errors";
import { UploadDropzone } from "./UploadDropzone";

export type Item = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  status: BadgeStatus;
};

export type CurrentDoc = {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
  storage_path: string;
};

export type Comment = {
  id: string;
  body: string;
  created_at: string;
};

function UnreadPill({ count }: { count: number }) {
  return (
    <span
      className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
      style={{
        background: "var(--brand-red)",
        animation: "fadeIn 300ms ease",
      }}
      aria-label={`${count} mensaje${count !== 1 ? "s" : ""} sin leer`}
    >
      {count}
    </span>
  );
}

function SummaryRow({
  item,
  unreadCount,
  open,
  isStale,
}: {
  item: Item;
  unreadCount: number;
  open: boolean;
  isStale: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{item.title}</span>
          {unreadCount > 0 && <UnreadPill count={unreadCount} />}
        </div>
        {item.description && (
          <div className="mt-0.5 text-xs text-text-dim">{item.description}</div>
        )}
        {isStale && (
          <div className="mt-1 text-[11px] text-text-muted">
            En espera de revisión — tu asesor ha sido notificado.
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Badge status={item.status} />
        <span
          className="inline-block text-xs text-text-muted transition"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
          aria-hidden
        >
          ▾
        </span>
      </div>
    </div>
  );
}

function CommentsList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-text-dim">
        Mensajes de tu asesor
      </div>
      <div className="space-y-2">
        {comments.map((c) => (
          <div
            key={c.id}
            className="rounded-lg p-3.5"
            style={{
              borderLeft: "2px solid var(--accent)",
              background: "var(--surface-comment)",
            }}
          >
            <div className="text-[11px] text-text-muted">
              {new Date(c.created_at).toLocaleDateString("es-ES")}
            </div>
            <div className="mt-1 text-sm leading-relaxed text-foreground">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentDocCard({
  doc,
  onDownload,
}: {
  doc: CurrentDoc;
  onDownload: () => void;
}) {
  return (
    <div
      className="mb-4 flex items-center justify-between rounded-lg p-3 text-sm"
      style={{ background: "var(--surface-sunken)" }}
    >
      <span className="truncate text-foreground">📎 {doc.filename}</span>
      <button
        onClick={onDownload}
        className="shrink-0 text-xs font-semibold text-accent hover:underline"
      >
        Descargar
      </button>
    </div>
  );
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function downloadDoc(storagePath: string): Promise<Result<string>> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);
  if (error || !data) {
    return {
      ok: false,
      error: friendlyError(error, "No se pudo generar el enlace."),
    };
  }
  return { ok: true, value: data.signedUrl };
}

async function markItemViewed(
  userId: string,
  itemId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.from("item_views").upsert(
    {
      user_id: userId,
      checklist_item_id: itemId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,checklist_item_id" },
  );
}

export function ChecklistItem({
  item,
  familyId,
  userId,
  currentDoc,
  comments,
  unreadCount,
  isStaleSubmitted = false,
}: {
  item: Item;
  familyId: string;
  userId: string;
  currentDoc: CurrentDoc | null;
  comments: Comment[];
  unreadCount: number;
  isStaleSubmitted?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await markItemViewed(userId, item.id);
      router.refresh();
    }
  }

  async function handleDownload() {
    if (!currentDoc) return;
    const result = await downloadDoc(currentDoc.storage_path);
    if (!result.ok) {
      toast.show("error", result.error);
      return;
    }
    window.open(result.value, "_blank");
  }

  return (
    <div id={`item-${item.id}`} className="scroll-mt-24">
      <GlassCard glow={unreadCount > 0}>
        <button
          type="button"
          onClick={() => void handleToggle()}
          className="w-full text-left"
          aria-expanded={open}
        >
          <SummaryRow
            item={item}
            unreadCount={unreadCount}
            open={open}
            isStale={isStaleSubmitted}
          />
        </button>
        {open && (
          <div
            className="border-t border-border p-5"
            style={{ animation: "fadeUp 300ms ease" }}
          >
            <CommentsList comments={comments} />
            {currentDoc && (
              <CurrentDocCard
                doc={currentDoc}
                onDownload={() => void handleDownload()}
              />
            )}
            {item.status !== "approved" && (
              <UploadDropzone
                itemId={item.id}
                itemTitle={item.title}
                familyId={familyId}
                userId={userId}
                hasCurrent={!!currentDoc}
                onUploaded={() => setOpen(false)}
              />
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
