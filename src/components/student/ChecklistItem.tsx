"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { UploadDropzone } from "./UploadDropzone";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  in_review: { label: "En revisión", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Aprobado", color: "bg-green-100 text-green-800" },
};

export type Item = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  status: keyof typeof STATUS_LABELS;
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

function ItemSummary({
  item,
  currentDoc,
  isStaleSubmitted,
  unreadCount,
  open,
}: {
  item: Item;
  currentDoc: CurrentDoc | null;
  isStaleSubmitted: boolean;
  unreadCount: number;
  open: boolean;
}) {
  const status = STATUS_LABELS[item.status];
  return (
    <>
      <div>
        <div className="font-medium text-navy">{item.title}</div>
        {item.description && (
          <div className="text-sm text-muted-foreground">{item.description}</div>
        )}
        {currentDoc && (
          <div className="mt-1 text-xs text-muted-foreground">
            Archivo actual: {currentDoc.filename} (
            {Math.round(currentDoc.size_bytes / 1024)} KB)
          </div>
        )}
        {isStaleSubmitted && (
          <div className="mt-1 text-xs text-muted-foreground">
            ⏳ Tu asesor ha sido notificado · en espera de revisión
          </div>
        )}
        {unreadCount > 0 && (
          <div className="mt-1 text-xs font-medium text-red-brand">
            💬 {unreadCount} mensaje{unreadCount !== 1 ? "s" : ""} nuevo
            {unreadCount !== 1 ? "s" : ""} de tu asesor
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {status && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        )}
        <span className="text-muted-foreground">{open ? "▴" : "▾"}</span>
      </div>
    </>
  );
}

function CommentsList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-semibold text-navy">
        Mensajes de tu asesor
      </h4>
      <div className="space-y-2">
        {comments.map((c) => (
          <div
            key={c.id}
            className="rounded-md border-l-4 border-red-brand bg-red-50 p-3 text-sm"
          >
            <div className="text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleString("es-ES")}
            </div>
            <div className="mt-1 text-navy">{c.body}</div>
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
    <div className="mb-4 flex items-center justify-between rounded-md bg-muted p-3 text-sm">
      <span className="text-navy">📎 {doc.filename}</span>
      <button
        onClick={onDownload}
        className="text-navy underline hover:text-navy-dark"
      >
        Descargar
      </button>
    </div>
  );
}

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function downloadDoc(storagePath: string): Promise<Result<string>> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Sin enlace" };
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
      toast.show("error", `No se pudo descargar: ${result.error}`);
      return;
    }
    window.open(result.value, "_blank");
  }

  return (
    <div
      id={`item-${item.id}`}
      className="scroll-mt-24 rounded-lg bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => void handleToggle()}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <ItemSummary
          item={item}
          currentDoc={currentDoc}
          isStaleSubmitted={isStaleSubmitted}
          unreadCount={unreadCount}
          open={open}
        />
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <CommentsList comments={comments} />
          {currentDoc && (
            <CurrentDocCard
              doc={currentDoc}
              onDownload={() => void handleDownload()}
            />
          )}
          <UploadDropzone
            itemId={item.id}
            itemTitle={item.title}
            familyId={familyId}
            userId={userId}
            hasCurrent={!!currentDoc}
            onUploaded={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
