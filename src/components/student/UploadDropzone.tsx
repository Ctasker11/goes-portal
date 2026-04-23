"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { friendlyError } from "@/lib/errors";

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

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "Archivo demasiado grande (máx. 50 MB).";
  if (!ACCEPTED.split(",").includes(file.type)) {
    return "Formato no permitido. Solo PDF, PNG, JPG, WEBP, HEIC.";
  }
  return null;
}

function Dropzone({
  uploading,
  progress,
  hasCurrent,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick,
  onFileChange,
  fileRef,
}: {
  uploading: boolean;
  progress: number;
  hasCurrent: boolean;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
        dragOver
          ? "border-navy bg-navy/5"
          : "border-border hover:border-navy/50"
      }`}
    >
      <p className="text-sm text-muted-foreground">Arrastra un archivo aquí, o</p>
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="mt-2 rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-dark disabled:opacity-50"
      >
        {uploading
          ? `Subiendo… ${progress}%`
          : hasCurrent
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
        onChange={onFileChange}
      />
    </div>
  );
}

export function UploadDropzone({
  itemId,
  itemTitle,
  familyId,
  userId,
  hasCurrent,
  onUploaded,
}: {
  itemId: string;
  itemTitle: string;
  familyId: string;
  userId: string;
  hasCurrent: boolean;
  onUploaded: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    const invalid = validateFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(10);

    const supabase = createClient();
    const safeName = buildStorageName(file);
    const storagePath = `${familyId}/${itemId}/${crypto.randomUUID()}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
    setProgress(70);

    if (upErr) {
      const msg = friendlyError(upErr, "No se pudo subir el archivo.");
      setError(msg);
      toast.show("error", msg);
      setUploading(false);
      setProgress(0);
      return;
    }

    const { error: insErr } = await supabase.from("documents").insert({
      checklist_item_id: itemId,
      family_id: familyId,
      uploaded_by: userId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

    if (insErr) {
      const msg = friendlyError(insErr, "No se pudo registrar el archivo.");
      setError(msg);
      toast.show("error", msg);
      const { error: rmErr } = await supabase.storage
        .from("documents")
        .remove([storagePath]);
      if (rmErr) {
        console.error("[storage] orphan left at", storagePath, rmErr);
        toast.show("error", "Archivo huérfano en storage. Contacta al equipo.");
      }
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(100);
    setUploading(false);
    toast.show("success", `${itemTitle} subido`);
    onUploaded();
    router.refresh();
  }

  return (
    <>
      <Dropzone
        uploading={uploading}
        progress={progress}
        hasCurrent={hasCurrent}
        dragOver={dragOver}
        fileRef={fileRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void uploadFile(file);
        }}
        onPick={() => fileRef.current?.click()}
        onFileChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-brand">
          {error}
        </p>
      )}
    </>
  );
}
