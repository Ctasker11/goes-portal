"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Advisor-side: 'submitted' = student uploaded, awaiting advisor → "Necesita Revisión"
const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "submitted", label: "Necesita Revisión", color: "bg-orange-100 text-orange-800" },
  { value: "in_review", label: "En revisión", color: "bg-yellow-100 text-yellow-800" },
  { value: "approved", label: "Aprobado", color: "bg-green-100 text-green-800" },
];

// Used for badge display (includes pre-upload state)
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

export function AdvisorChecklistItem({
  item,
  docs,
  comments,
  currentUserId,
}: {
  item: Item;
  docs: Doc[];
  comments: Comment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(item.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStatus =
    STATUS_DISPLAY[status] ?? STATUS_DISPLAY.not_started;

  async function handleStatusChange(newStatus: string) {
    setSavingStatus(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("checklist_items")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      setError(error.message);
      setStatus(item.status);
    } else {
      setStatus(newStatus);
      router.refresh();
    }
    setSavingStatus(false);
  }

  async function handleDownload(storagePath: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      setError(error?.message ?? "Sin enlace");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPostingComment(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("comments").insert({
      checklist_item_id: item.id,
      author_id: currentUserId,
      body: commentBody.trim(),
      internal_only: internalOnly,
    });
    if (error) {
      setError(error.message);
    } else {
      setCommentBody("");
      setInternalOnly(false);
      router.refresh();
    }
    setPostingComment(false);
  }

  const currentDoc = docs.find((d) => d.is_current);
  const oldVersions = docs.filter((d) => !d.is_current);

  return (
    <div className="rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <div className="font-medium text-navy">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground">
              {item.description}
            </div>
          )}
          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
            <span>📎 {docs.length} archivo{docs.length !== 1 ? "s" : ""}</span>
            <span>💬 {comments.length} comentario{comments.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${currentStatus.color}`}
          >
            {currentStatus.label}
          </span>
          <span className="text-muted-foreground">{open ? "▴" : "▾"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-navy">Estado:</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
              className="rounded-md border border-border px-3 py-1.5 text-sm focus:border-navy focus:outline-none disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {savingStatus && (
              <span className="text-xs text-muted-foreground">
                Guardando…
              </span>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-navy">Archivos</h4>
            {docs.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Aún no se han subido archivos.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {currentDoc && (
                  <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
                    <div>
                      <div className="font-medium text-navy">
                        📎 {currentDoc.filename}
                        <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          actual · v{currentDoc.version}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(currentDoc.size_bytes / 1024)} KB ·{" "}
                        {new Date(currentDoc.created_at).toLocaleString("es-ES")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(currentDoc.storage_path)}
                      className="text-navy underline hover:text-navy-dark"
                    >
                      Descargar
                    </button>
                  </div>
                )}
                {oldVersions.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Versiones anteriores ({oldVersions.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {oldVersions.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs"
                        >
                          <span>
                            📎 {d.filename} · v{d.version} ·{" "}
                            {new Date(d.created_at).toLocaleString("es-ES")}
                          </span>
                          <button
                            onClick={() => handleDownload(d.storage_path)}
                            className="text-navy underline"
                          >
                            Descargar
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-navy">Comentarios</h4>
            <div className="mt-2 space-y-2">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sin comentarios aún.
                </p>
              )}
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

            <form onSubmit={handlePostComment} className="mt-3 space-y-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
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
                  disabled={!commentBody.trim() || postingComment}
                  className="rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {postingComment ? "Enviando…" : "Comentar"}
                </button>
              </div>
            </form>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-brand">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
