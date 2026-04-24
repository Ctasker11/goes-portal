"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { friendlyError } from "@/lib/errors";

// Advisor-side: 'submitted' = student uploaded, awaiting advisor → "Necesita Revisión"
const STATUS_OPTIONS: { value: BadgeStatus; label: string }[] = [
  { value: "submitted", label: "Necesita revisión" },
  { value: "in_review", label: "En revisión" },
  { value: "approved", label: "Aprobado" },
];

type Item = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

type Doc = {
  id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
  storage_path: string;
  version: number;
  is_current: boolean;
};

type Comment = {
  id: string;
  author_id: string;
  body: string;
  internal_only: boolean;
  created_at: string;
};

type WorkState = {
  optimisticStatus: string | null;
  savingStatus: boolean;
  postingComment: boolean;
  error: string | null;
};

type WorkAction =
  | { type: "status_start"; optimistic: string }
  | { type: "status_ok" }
  | { type: "status_err"; error: string }
  | { type: "comment_start" }
  | { type: "comment_ok" }
  | { type: "comment_err"; error: string }
  | { type: "error"; error: string };

function workReducer(state: WorkState, action: WorkAction): WorkState {
  switch (action.type) {
    case "status_start":
      return {
        ...state,
        optimisticStatus: action.optimistic,
        savingStatus: true,
        error: null,
      };
    case "status_ok":
      return { ...state, optimisticStatus: null, savingStatus: false };
    case "status_err":
      return {
        ...state,
        optimisticStatus: null,
        savingStatus: false,
        error: action.error,
      };
    case "comment_start":
      return { ...state, postingComment: true, error: null };
    case "comment_ok":
      return { ...state, postingComment: false };
    case "comment_err":
      return { ...state, postingComment: false, error: action.error };
    case "error":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

const INITIAL_WORK: WorkState = {
  optimisticStatus: null,
  savingStatus: false,
  postingComment: false,
  error: null,
};

function toBadgeStatus(s: string): BadgeStatus {
  if (s === "submitted" || s === "in_review" || s === "approved") return s;
  return "not_started";
}

async function updateItemStatus(itemId: string, newStatus: string) {
  const supabase = createClient();
  return supabase
    .from("checklist_items")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", itemId);
}

async function openSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);
  if (error || !data) return null;
  return data.signedUrl;
}

async function postComment(
  itemId: string,
  authorId: string,
  body: string,
  internalOnly: boolean,
) {
  const supabase = createClient();
  return supabase.from("comments").insert({
    checklist_item_id: itemId,
    author_id: authorId,
    body: body.trim(),
    internal_only: internalOnly,
  });
}

function ItemHeader({
  item,
  docs,
  comments,
  status,
  open,
  selected,
  onToggleSelect,
  onToggleOpen,
}: {
  item: Item;
  docs: Doc[];
  comments: Comment[];
  status: string;
  open: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onToggleOpen: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleccionar ${item.title}`}
          className="mt-1.5 h-4 w-4 accent-[color:var(--accent)]"
        />
      )}
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex flex-1 items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{item.title}</div>
          {item.description && (
            <div className="mt-0.5 text-xs text-text-dim">{item.description}</div>
          )}
          <div className="mt-1.5 flex gap-3 text-[11px] text-text-muted">
            <span>📎 {docs.length} archivo{docs.length !== 1 ? "s" : ""}</span>
            <span>💬 {comments.length} comentario{comments.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Badge status={toBadgeStatus(status)} view="advisor" />
          <span
            className="inline-block text-xs text-text-muted transition"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>
    </div>
  );
}

function StatusPicker({
  status,
  saving,
  onChange,
}: {
  status: string;
  saving: boolean;
  onChange: (s: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-semibold text-text-dim">Estado:</label>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        className="rounded-md border border-[color:var(--border-input)] bg-[color:var(--input-bg)] px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent/60 disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-background">
            {o.label}
          </option>
        ))}
      </select>
      {saving && (
        <span className="text-[11px] text-text-muted">Guardando…</span>
      )}
    </div>
  );
}

function CurrentDocRow({
  doc,
  onDownload,
}: {
  doc: Doc;
  onDownload: (path: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg p-3 text-sm"
      style={{ background: "var(--surface-sunken)" }}
    >
      <div className="min-w-0">
        <div className="font-medium text-foreground">
          📎 <span className="truncate">{doc.filename}</span>
          <span
            className="ml-2 rounded px-2 py-0.5 text-[11px]"
            style={{
              background: "rgba(34,197,94,0.15)",
              color: "#4ade80",
            }}
          >
            actual · v{doc.version}
          </span>
        </div>
        <div className="text-[11px] text-text-muted">
          {Math.round(doc.size_bytes / 1024)} KB ·{" "}
          {new Date(doc.created_at).toLocaleString("es-ES")}
        </div>
      </div>
      <button
        onClick={() => onDownload(doc.storage_path)}
        className="shrink-0 text-xs font-semibold text-accent hover:underline"
      >
        Descargar
      </button>
    </div>
  );
}

function OldVersions({
  versions,
  onDownload,
}: {
  versions: Doc[];
  onDownload: (path: string) => void;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-text-dim">
        Versiones anteriores ({versions.length})
      </summary>
      <div className="mt-2 space-y-1">
        {versions.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-md p-2 text-[11px]"
            style={{ background: "var(--surface-sunken)" }}
          >
            <span className="truncate text-text-dim">
              📎 {d.filename} · v{d.version} ·{" "}
              {new Date(d.created_at).toLocaleString("es-ES")}
            </span>
            <button
              onClick={() => onDownload(d.storage_path)}
              className="shrink-0 text-accent hover:underline"
            >
              Descargar
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

function FilesSection({
  docs,
  onDownload,
}: {
  docs: Doc[];
  onDownload: (path: string) => void;
}) {
  const current = docs.find((d) => d.is_current);
  const old = docs.filter((d) => !d.is_current);
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[0.06em] text-text-dim">
        Archivos
      </h4>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Aún no se han subido archivos.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {current && <CurrentDocRow doc={current} onDownload={onDownload} />}
          {old.length > 0 && <OldVersions versions={old} onDownload={onDownload} />}
        </div>
      )}
    </div>
  );
}

function CommentItem({ c }: { c: Comment }) {
  const internalStyle = c.internal_only
    ? {
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.2)",
      }
    : { background: "var(--surface-sunken)" };
  return (
    <div className="rounded-lg p-3 text-sm" style={internalStyle}>
      <div className="text-[11px] text-text-muted">
        {new Date(c.created_at).toLocaleString("es-ES")}
        {c.internal_only && (
          <span
            className="ml-2 rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: "rgba(245,158,11,0.25)", color: "#fbbf24" }}
          >
            interno
          </span>
        )}
      </div>
      <div className="mt-1 text-foreground">{c.body}</div>
    </div>
  );
}

function CommentsThread({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-text-muted">Sin comentarios aún.</p>;
  }
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <CommentItem key={c.id} c={c} />
      ))}
    </div>
  );
}

function CommentForm({
  onSubmit,
  posting,
}: {
  onSubmit: (body: string, internalOnly: boolean) => void;
  posting: boolean;
}) {
  const [body, setBody] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit(body, internalOnly);
    setBody("");
    setInternalOnly(false);
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribir comentario para el estudiante…"
        rows={2}
        maxLength={5000}
        className="w-full rounded-md border border-[color:var(--border-input)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-accent/60"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[11px] text-text-muted">
          <input
            type="checkbox"
            checked={internalOnly}
            onChange={(e) => setInternalOnly(e.target.checked)}
            className="accent-[color:var(--accent)]"
          />
          Solo equipo interno (no visible al estudiante)
        </label>
        <button
          type="submit"
          disabled={!body.trim() || posting}
          className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-text disabled:opacity-50"
        >
          {posting ? "Enviando…" : "Comentar"}
        </button>
      </div>
    </form>
  );
}

function ItemBody({
  status,
  work,
  docs,
  comments,
  onStatusChange,
  onDownload,
  onPostComment,
}: {
  status: string;
  work: WorkState;
  docs: Doc[];
  comments: Comment[];
  onStatusChange: (s: string) => void;
  onDownload: (path: string) => void;
  onPostComment: (body: string, internalOnly: boolean) => void;
}) {
  return (
    <div className="space-y-5 border-t border-border p-4">
      <StatusPicker
        status={status}
        saving={work.savingStatus}
        onChange={onStatusChange}
      />
      <FilesSection docs={docs} onDownload={onDownload} />
      <div>
        <h4 className="text-xs font-bold uppercase tracking-[0.06em] text-text-dim">
          Comentarios
        </h4>
        <div className="mt-2">
          <CommentsThread comments={comments} />
        </div>
        <CommentForm posting={work.postingComment} onSubmit={onPostComment} />
      </div>
      {work.error && (
        <p
          className="rounded-md p-2 text-sm text-red-brand"
          style={{ background: "rgba(206,69,77,0.1)" }}
        >
          {work.error}
        </p>
      )}
    </div>
  );
}

export function AdvisorChecklistItem({
  item,
  docs,
  comments,
  currentUserId,
  selected,
  onToggleSelect,
}: {
  item: Item;
  docs: Doc[];
  comments: Comment[];
  currentUserId: string;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [work, dispatch] = useReducer(workReducer, INITIAL_WORK);
  const status = work.optimisticStatus ?? item.status;

  async function handleStatusChange(newStatus: string) {
    dispatch({ type: "status_start", optimistic: newStatus });
    const { error: updErr } = await updateItemStatus(item.id, newStatus);
    if (updErr) {
      const msg = friendlyError(updErr, "No se pudo actualizar el estado.");
      toast.show("error", msg);
      dispatch({ type: "status_err", error: msg });
      return;
    }
    toast.show("success", "Estado actualizado");
    dispatch({ type: "status_ok" });
    router.refresh();
  }

  async function handleDownload(storagePath: string) {
    const url = await openSignedUrl(storagePath);
    if (!url) {
      dispatch({ type: "error", error: "Sin enlace" });
      return;
    }
    window.open(url, "_blank");
  }

  async function handlePostComment(body: string, internalOnly: boolean) {
    dispatch({ type: "comment_start" });
    const { error: insErr } = await postComment(
      item.id,
      currentUserId,
      body,
      internalOnly,
    );
    if (insErr) {
      dispatch({
        type: "comment_err",
        error: friendlyError(insErr, "No se pudo enviar el comentario."),
      });
      return;
    }
    dispatch({ type: "comment_ok" });
    router.refresh();
  }

  return (
    <div
      id={`item-${item.id}`}
      className="scroll-mt-40"
      style={selected ? { outline: "2px solid var(--accent)", outlineOffset: 2, borderRadius: 16 } : undefined}
    >
      <GlassCard>
        <ItemHeader
          item={item}
          docs={docs}
          comments={comments}
          status={status}
          open={open}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onToggleOpen={() => setOpen((o) => !o)}
        />
        {open && (
          <ItemBody
            status={status}
            work={work}
            docs={docs}
            comments={comments}
            onStatusChange={(s) => void handleStatusChange(s)}
            onDownload={(p) => void handleDownload(p)}
            onPostComment={(b, i) => void handlePostComment(b, i)}
          />
        )}
      </GlassCard>
    </div>
  );
}
