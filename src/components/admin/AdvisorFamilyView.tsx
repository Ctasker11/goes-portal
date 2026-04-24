"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdvisorChecklistItem } from "@/components/admin/AdvisorChecklistItem";
import { ActivityLogDrawer } from "@/components/admin/ActivityLogDrawer";
import { useToast } from "@/components/ui/Toast";

const CATEGORY_LABELS: Record<string, string> = {
  academic_records: "Expediente académico",
  standardized_tests: "Pruebas estandarizadas",
  essays: "Ensayos y cartas",
  sports_profile: "Perfil deportivo",
  personal_visa: "Personal y visa",
  other: "Otros",
};

type Item = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  status: string;
};

type Doc = {
  id: string;
  checklist_item_id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
  storage_path: string;
  version: number;
  is_current: boolean;
};

type Comment = {
  id: string;
  checklist_item_id: string;
  author_id: string;
  body: string;
  internal_only: boolean;
  created_at: string;
};

type Family = {
  id: string;
  student_name: string;
  program: string;
  created_at: string;
};

function groupById<T extends { checklist_item_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const arr = m.get(r.checklist_item_id) ?? [];
    arr.push(r);
    m.set(r.checklist_item_id, arr);
  }
  return m;
}

function groupByCategory(items: Item[]): Record<string, Item[]> {
  return items.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
}

function FamilyHeader({
  family,
  approved,
  total,
  pendingReview,
  pct,
  onOpenDrawer,
}: {
  family: Family;
  approved: number;
  total: number;
  pendingReview: number;
  pct: number;
  onOpenDrawer: () => void;
}) {
  return (
    <section
      className="sticky top-[60px] z-10 -mx-6 border-b border-border px-6 py-4 text-foreground"
      style={{
        background: "var(--surface-overlay)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display truncate text-xl font-extrabold">
            {family.student_name}
          </h1>
          <p className="mt-0.5 text-xs text-text-dim">
            <span className="capitalize">{family.program}</span> · Alta:{" "}
            {new Date(family.created_at).toLocaleDateString("es-ES")}
          </p>
        </div>
        <div className="flex items-center gap-5">
          <HeaderStat value={`${approved}/${total}`} label="Aprobados" />
          <HeaderStat
            value={pendingReview.toString()}
            label="Por revisar"
            accent
          />
          <div className="h-8 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={onOpenDrawer}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-accent/50 hover:bg-[color:var(--surface-sunken)] hover:text-foreground"
          >
            Registro
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-track)]">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 6px var(--glow-strong)",
          }}
        />
      </div>
    </section>
  );
}

function HeaderStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`font-display text-lg font-extrabold tabular-nums ${
          accent ? "text-red-brand" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-text-muted">
        {label}
      </div>
    </div>
  );
}

function BulkBar({
  count,
  saving,
  onApprove,
  onClear,
}: {
  count: number;
  saving: boolean;
  onApprove: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 text-sm text-foreground"
      style={{
        background: "var(--surface-overlay)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      <span className="font-medium">
        {count} seleccionado{count !== 1 ? "s" : ""}
      </span>
      <button
        onClick={onApprove}
        disabled={saving}
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-text disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Aprobar todos"}
      </button>
      <button
        onClick={onClear}
        className="text-xs text-text-dim hover:text-foreground"
      >
        Limpiar
      </button>
    </div>
  );
}

export function AdvisorFamilyView({
  family,
  items,
  docs,
  comments,
  currentUserId,
}: {
  family: Family;
  items: Item[];
  docs: Doc[];
  comments: Comment[];
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const docsByItem = useMemo(() => groupById(docs), [docs]);
  const commentsByItem = useMemo(() => groupById(comments), [comments]);
  const grouped = useMemo(() => groupByCategory(items), [items]);

  const total = items.length;
  const approved = items.filter((i) => i.status === "approved").length;
  const pendingReview = items.filter((i) => i.status === "submitted").length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkApprove() {
    if (selected.size === 0) return;
    setBulkSaving(true);
    const supabase = createClient();
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("checklist_items")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("family_id", family.id)
      .in("id", ids);
    setBulkSaving(false);
    if (error) {
      toast.show("error", `Error: ${error.message}`);
      return;
    }
    toast.show("success", `${ids.length} aprobado${ids.length !== 1 ? "s" : ""}`);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link
          href="/admin"
          className="text-sm text-text-dim hover:text-foreground"
        >
          ← Volver al panel
        </Link>
      </div>
      <FamilyHeader
        family={family}
        approved={approved}
        total={total}
        pendingReview={pendingReview}
        pct={pct}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      {Object.entries(grouped).map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="space-y-2">
            {list.map((item) => (
              <AdvisorChecklistItem
                key={item.id}
                item={item}
                docs={docsByItem.get(item.id) ?? []}
                comments={commentsByItem.get(item.id) ?? []}
                currentUserId={currentUserId}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        </section>
      ))}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          saving={bulkSaving}
          onApprove={() => void bulkApprove()}
          onClear={() => setSelected(new Set())}
        />
      )}
      <ActivityLogDrawer
        familyId={family.id}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
