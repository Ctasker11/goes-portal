"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

type ActivityEntry = {
  id: string;
  event: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
};

const EVENT_LABELS: Record<string, string> = {
  document_uploaded: "Documento subido",
  status_changed: "Estado actualizado",
  comment_added: "Comentario añadido",
  family_created: "Expediente creado",
  onboarding_completed: "Onboarding completado",
};

type ActorShape = { full_name: string | null };
type ActivityRow = {
  id: string;
  event: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor: ActorShape | ActorShape[] | null;
};

function toActivityEntry(raw: unknown): ActivityEntry {
  const r = raw as ActivityRow;
  const actorField = r.actor;
  const actor = Array.isArray(actorField) ? actorField[0] : actorField;
  return {
    id: r.id,
    event: r.event,
    payload: r.payload,
    created_at: r.created_at,
    actor_name: actor?.full_name ?? null,
  };
}

function EntryItem({ e }: { e: ActivityEntry }) {
  return (
    <li
      className="rounded-lg border border-border p-3 text-sm"
      style={{ background: "var(--surface-sunken)" }}
    >
      <div className="font-semibold text-foreground">
        {EVENT_LABELS[e.event] ?? e.event}
      </div>
      <div className="mt-1 text-[11px] text-text-muted">
        {e.actor_name ?? "Sistema"} ·{" "}
        {new Date(e.created_at).toLocaleString("es-ES")}
      </div>
      {e.payload && Object.keys(e.payload).length > 0 && (
        <pre
          className="mt-2 overflow-x-auto rounded p-2 text-[11px] text-text-dim"
          style={{ background: "var(--surface-code)" }}
        >
          {JSON.stringify(e.payload, null, 2)}
        </pre>
      )}
    </li>
  );
}

function DrawerBody({
  entries,
  loading,
  error,
}: {
  entries: ActivityEntry[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      {loading && <p className="text-sm text-text-dim">Cargando…</p>}
      {error && (
        <p
          className="rounded-md p-2 text-sm text-red-brand"
          style={{ background: "rgba(206,69,77,0.1)" }}
        >
          {error}
        </p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-text-muted">Sin actividad aún.</p>
      )}
      <ul className="space-y-3">
        {entries.map((e) => (
          <EntryItem key={e.id} e={e} />
        ))}
      </ul>
    </div>
  );
}

export function ActivityLogDrawer({
  familyId,
  open,
  onClose,
}: {
  familyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: qErr } = await supabase
        .from("activity_log")
        .select(
          "id, event, payload, created_at, actor:profiles!activity_log_actor_profile_fk(full_name)",
        )
        .eq("family_id", familyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (qErr) {
        setError(friendlyError(qErr, "No se pudo cargar el registro."));
        setLoading(false);
        return;
      }
      const mapped = (data ?? []).map(toActivityEntry);
      setEntries(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--surface-scrim)" }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Registro de actividad"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border shadow-2xl"
        style={{
          background: "var(--surface-overlay)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-extrabold text-foreground">
            Registro de actividad
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-dim hover:bg-[color:var(--surface-sunken)] hover:text-foreground"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>
        <DrawerBody entries={entries} loading={loading} error={error} />
      </aside>
    </div>
  );
}
