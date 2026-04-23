"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

// Advisor-side: 'submitted' = student uploaded, awaiting advisor → "Necesita Revisión"
const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "submitted", label: "Necesita Revisión", color: "bg-orange-100 text-orange-800" },
  { value: "in_review", label: "En revisión", color: "bg-yellow-100 text-yellow-800" },
  { value: "approved", label: "Aprobado", color: "bg-green-100 text-green-800" },
];

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  not_started: { label: "Sin empezar", color: "bg-gray-200 text-gray-700" },
  submitted: { label: "Necesita Revisión", color: "bg-orange-100 text-orange-800" },
  in_review: { label: "En revisión", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Aprobado", color: "bg-green-100 text-green-800" },
};

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
  const display = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.not_started;
  return (
    <div className="flex items-start gap-3 p-4">
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleccionar ${item.title}`}
          className="mt-1 h-4 w-4 accent-navy"
        />
      )}
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex flex-1 items-center justify-between text-left"
      >
        <div>
          <div className="font-medium text-navy">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground">{item.description}</div>
          )}
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            <span>
              📎 {docs.length} archivo{docs.length !== 1 ? "s" : ""}
            </span>
            <span>
              💬 {comments.length} comentario{comments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${display.color}`}
          >
            {display.label}
          </span>
          <span className="text-muted-foreground">{open ? "▴" : "▾"}</span>
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
      <label className="text-sm font-medium text-navy">Estado:</label>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        disabled={saving}
        className="rounded-md border border-border px-3 py-1.5 text-sm focus:border-navy focus:outline-none disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {saving && (
        <span className="text-xs text-muted-foreground">Guardando…</span>
      )}
    </div>
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
      <h4 className="text-sm font-semibold text-navy">Archivos</h4>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Aún no se han subido archivos.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {current && <CurrentDocRow doc={current} onDownload={onDownload} />}
          {old.length > 0 && <OldVersions versions={old} onDownload={onDownload} />}
        </div>
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
    <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
      <div>
        <div className="font-medium text-navy">
          📎 {doc.filename}
          <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
            actual · v{doc.version}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(doc.size_bytes / 1024)} KB ·{" "}
          {new Date(doc.created_at).toLocaleString("es-ES")}
        </div>
      </div>
      <button
        onClick={() => onDownload(doc.storage_path)}
        className="text-navy underline hover:text-navy-dark"
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
      <summary className="cursor-pointer text-muted-foreground">
        Versiones anteriores ({versions.length})
      </summary>
      <div className="mt-2 space-y-1">
        {versions.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs"
          >
            <span>
              📎 {d.filename} · v{d.version} ·{" "}
              {new Date(d.created_at).toLocaleString("es-ES")}
            </span>
            <button
              onClick={() => onDownload(d.storage_path)}
              className="text-navy underline"
            >
              Descargar
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

function CommentsThread({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin comentarios aún.</p>;
  }
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <div
          key={c.id}
          className={`rounded-md p-3 text-sm ${
            c.internal_only
              ? "border border-yellow-200 bg-yellow-50"
              : "bg-muted"
          }`}
        >
          <div className="text-xs text-muted-foreground">
            {new Date(c.created_at).toLocaleString("es-ES")}
            {c.internal_only && (
              <span className="ml-2 rounded bg-yellow-200 px-1.5 py-0.5 text-yellow-900">
                interno
              </span>
            )}
          </div>
          <div className="mt-1 text-navy">{c.body}</div>
        </div>
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
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={internalOnly}
            onChange={(e) => setInternalOnly(e.target.checked)}
          />
          Solo equipo interno (no visible al estudiante)
        </label>
        <button
          type="submit"
          disabled={!body.trim() || posting}
          className="rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {posting ? "Enviando…" : "Comentar"}
        </button>
      </div>
    </form>
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
      toast.show("error", `Error al guardar: ${updErr.message}`);
      dispatch({ type: "status_err", error: updErr.message });
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
      dispatch({ type: "comment_err", error: insErr.message });
      return;
    }
    dispatch({ type: "comment_ok" });
    router.refresh();
  }

  return (
    <div
      id={`item-${item.id}`}
      className={`scroll-mt-40 rounded-lg bg-white shadow-sm ${
        selected ? "ring-2 ring-navy" : ""
      }`}
    >
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
        <div className="space-y-5 border-t border-border p-4">
          <StatusPicker
            status={status}
            saving={work.savingStatus}
            onChange={(s) => void handleStatusChange(s)}
          />
          <FilesSection
            docs={docs}
            onDownload={(path) => void handleDownload(path)}
          />
          <div>
            <h4 className="text-sm font-semibold text-navy">Comentarios</h4>
            <div className="mt-2">
              <CommentsThread comments={comments} />
            </div>
            <CommentForm
              posting={work.postingComment}
              onSubmit={(body, internal) =>
                void handlePostComment(body, internal)
              }
            />
          </div>
          {work.error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-brand">
              {work.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
