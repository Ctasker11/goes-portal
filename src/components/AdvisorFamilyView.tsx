"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdvisorChecklistItem } from "@/components/AdvisorChecklistItem";
import { ActivityLogDrawer } from "@/components/ActivityLogDrawer";
import { useToast } from "@/components/Toast";

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

  const docsByItem = useMemo(() => {
    const m = new Map<string, Doc[]>();
    docs.forEach((d) => {
      const arr = m.get(d.checklist_item_id) ?? [];
      arr.push(d);
      m.set(d.checklist_item_id, arr);
    });
    return m;
  }, [docs]);

  const commentsByItem = useMemo(() => {
    const m = new Map<string, Comment[]>();
    comments.forEach((c) => {
      const arr = m.get(c.checklist_item_id) ?? [];
      arr.push(c);
      m.set(c.checklist_item_id, arr);
    });
    return m;
  }, [comments]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, Item[]>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});
  }, [items]);

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
          className="text-sm text-muted-foreground hover:text-navy"
        >
          ← Volver al panel
        </Link>
      </div>

      <section className="sticky top-0 z-20 -mx-6 border-b border-border bg-white/95 px-6 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-navy">
              {family.student_name}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="capitalize">{family.program}</span> · Alta:{" "}
              {new Date(family.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <div className="text-lg font-bold text-navy tabular-nums">
                {approved}/{total}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Aprobados
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-brand tabular-nums">
                {pendingReview}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Por revisar
              </div>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-navy hover:bg-muted"
            >
              Registro
            </button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-navy transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {Object.entries(grouped).map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
        <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-navy px-5 py-3 text-sm text-white shadow-xl">
          <span className="font-medium">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={bulkApprove}
            disabled={bulkSaving}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-navy disabled:opacity-50"
          >
            {bulkSaving ? "Guardando…" : "Aprobar todos"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-white/80 hover:text-white"
          >
            Limpiar
          </button>
        </div>
      )}

      <ActivityLogDrawer
        familyId={family.id}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
