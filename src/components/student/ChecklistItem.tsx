"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  in_review: { label: "En revisión", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Aprobado", color: "bg-green-100 text-green-800" },
};

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED = "application/pdf,image/png,image/jpeg,image/webp,image/heic";

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/heic": "heic",
};

function buildStorageName(file: File): string {
  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const lastDot = file.name.lastIndexOf(".");
  const rawBase = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;
  const base = rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "file";
  return `${base}.${ext}`;
}

export type Item = {
  id: string;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      const supabase = createClient();
      await supabase.from("item_views").upsert(
        {
          user_id: userId,
          checklist_item_id: item.id,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,checklist_item_id" },
      );
      router.refresh();
    }
  }
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const status = STATUS_LABELS[item.status];

  async function uploadFile(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError(`Archivo demasiado grande (máx. 50 MB).`);
      return;
    }
    if (!ACCEPTED.split(",").includes(file.type)) {
      setError(`Formato no permitido. Solo PDF, PNG, JPG, WEBP, HEIC.`);
      return;
    }

    setUploading(true);
    setProgress(10);

    const supabase = createClient();
    const safeName = buildStorageName(file);
    const storagePath = `${familyId}/${item.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    setProgress(70);

    if (upErr) {
      setError(upErr.message);
      toast.show("error", `No se pudo subir: ${upErr.message}`);
      setUploading(false);
      setProgress(0);
      return;
    }

    const { error: insErr } = await supabase.from("documents").insert({
      checklist_item_id: item.id,
      family_id: familyId,
      uploaded_by: userId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

    if (insErr) {
      setError(insErr.message);
      toast.show("error", `Error al registrar: ${insErr.message}`);
      setUploading(false);
      setProgress(0);
      // best-effort cleanup
      await supabase.storage.from("documents").remove([storagePath]);
      return;
    }

    setProgress(100);
    setUploading(false);
    setOpen(false);
    toast.show("success", `${item.title} subido`);
    router.refresh();
  }

  async function handleDownload() {
    if (!currentDoc) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(currentDoc.storage_path, 60);
    if (error || !data) {
      setError(error?.message ?? "No se pudo generar el enlace");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div id={`item-${item.id}`} className="scroll-mt-24 rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <div className="font-medium text-navy">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted-foreground">
              {item.description}
            </div>
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
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {comments.length > 0 && (
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
          )}

          {currentDoc && (
            <div className="mb-4 flex items-center justify-between rounded-md bg-muted p-3 text-sm">
              <span className="text-navy">📎 {currentDoc.filename}</span>
              <button
                onClick={handleDownload}
                className="text-navy underline hover:text-navy-dark"
              >
                Descargar
              </button>
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) uploadFile(file);
            }}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
              dragOver
                ? "border-navy bg-navy/5"
                : "border-border hover:border-navy/50"
            }`}
          >
            <p className="text-sm text-muted-foreground">
              Arrastra un archivo aquí, o
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-dark disabled:opacity-50"
            >
              {uploading
                ? `Subiendo… ${progress}%`
                : currentDoc
                  ? "Subir nueva versión"
                  : "Seleccionar archivo"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              PDF, PNG, JPG, WEBP, HEIC · máx. 50 MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-brand">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
