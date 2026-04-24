"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

export type FamilyRow = {
  id: string;
  student_name: string;
  program: "academic" | "sports" | "both";
  created_at: string;
  total: number;
  pending_review: number;
  in_review: number;
  approved: number;
  needs_revision: number;
  last_activity_at: string | null;
};

type ProgramFilter = "all" | "academic" | "sports" | "both";
type SortKey = "pending_desc" | "name_asc" | "recent_desc" | "progress_desc";

function isRecent(ts: string | null) {
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() < 24 * 60 * 60 * 1000;
}

const PROGRAM_LABELS: Record<string, string> = {
  academic: "Académica",
  sports: "Deportiva",
  both: "Mixta",
};

function applyFilters(
  families: FamilyRow[],
  search: string,
  program: ProgramFilter,
  sort: SortKey,
): FamilyRow[] {
  let rows = families;
  const q = search.trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.student_name.toLowerCase().includes(q));
  if (program !== "all") rows = rows.filter((r) => r.program === program);
  rows = [...rows];
  if (sort === "pending_desc") {
    rows.sort((a, b) => b.pending_review - a.pending_review);
  } else if (sort === "name_asc") {
    rows.sort((a, b) => a.student_name.localeCompare(b.student_name));
  } else if (sort === "recent_desc") {
    rows.sort(
      (a, b) =>
        new Date(b.last_activity_at ?? b.created_at).getTime() -
        new Date(a.last_activity_at ?? a.created_at).getTime(),
    );
  } else if (sort === "progress_desc") {
    rows.sort((a, b) => {
      const pa = a.total ? a.approved / a.total : 0;
      const pb = b.total ? b.approved / b.total : 0;
      return pb - pa;
    });
  }
  return rows;
}

const SELECT_CLS =
  "rounded-md border border-[color:var(--border-input)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60";

function FilterBar({
  search,
  program,
  sort,
  onSearch,
  onProgram,
  onSort,
}: {
  search: string;
  program: ProgramFilter;
  sort: SortKey;
  onSearch: (v: string) => void;
  onProgram: (v: ProgramFilter) => void;
  onSort: (v: SortKey) => void;
}) {
  return (
    <GlassCard className="flex flex-wrap items-center gap-3 p-4">
      <input
        type="search"
        placeholder="Buscar estudiante…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="min-w-[200px] flex-1 rounded-md border border-[color:var(--border-input)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-accent/60"
      />
      <select
        value={program}
        onChange={(e) => onProgram(e.target.value as ProgramFilter)}
        className={SELECT_CLS}
      >
        <option value="all" className="bg-background">Todos los programas</option>
        <option value="academic" className="bg-background">Solo académica</option>
        <option value="sports" className="bg-background">Solo deportiva</option>
        <option value="both" className="bg-background">Mixta</option>
      </select>
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className={SELECT_CLS}
      >
        <option value="pending_desc" className="bg-background">Necesita revisión (más primero)</option>
        <option value="recent_desc" className="bg-background">Actividad reciente</option>
        <option value="progress_desc" className="bg-background">Más avanzado</option>
        <option value="name_asc" className="bg-background">Nombre (A-Z)</option>
      </select>
    </GlassCard>
  );
}

function ProgressCell({ pct, approved, total }: { pct: number; approved: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[color:var(--surface-track)]">
        <div
          className="h-full bg-accent"
          style={{ width: `${pct}%`, boxShadow: "0 0 6px var(--glow-strong)" }}
        />
      </div>
      <span className="text-xs tabular-nums text-text-dim">
        {approved}/{total}
      </span>
    </div>
  );
}

function FamilyRowView({ f }: { f: FamilyRow }) {
  const pct = f.total > 0 ? Math.round((f.approved / f.total) * 100) : 0;
  const lastDate = f.last_activity_at ?? f.created_at;
  return (
    <tr className="transition hover:bg-[color:var(--surface-sunken)]">
      <td className="px-6 py-3 font-medium text-foreground">
        <span className="inline-flex items-center gap-2">
          {isRecent(f.last_activity_at) && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-red-brand"
              title="Actividad reciente (últimas 24 h)"
              aria-label="Actividad reciente"
            />
          )}
          {f.student_name}
        </span>
      </td>
      <td className="px-6 py-3 text-text-dim">{PROGRAM_LABELS[f.program]}</td>
      <td className="px-6 py-3">
        <ProgressCell pct={pct} approved={f.approved} total={f.total} />
      </td>
      <td className="px-6 py-3 text-center">
        {f.pending_review > 0 ? (
          <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-red-brand px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
            {f.pending_review}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-text-muted">
        {new Date(lastDate).toLocaleDateString("es-ES")}
      </td>
      <td className="px-6 py-3 text-right">
        <Link
          href={`/admin/${f.id}`}
          className="inline-block whitespace-nowrap rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent/60 hover:bg-[color:var(--input-bg)]"
        >
          Ver perfil
        </Link>
      </td>
    </tr>
  );
}

function FamilyTable({ families }: { families: FamilyRow[] }) {
  return (
    <GlassCard className="overflow-hidden" hover={false}>
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[14%]" />
          <col className="w-[20%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="text-[11px] uppercase tracking-[0.06em] text-text-dim">
          <tr style={{ background: "var(--surface-sunken)" }}>
            <th className="px-6 py-3 text-left font-semibold">Estudiante</th>
            <th className="px-6 py-3 text-left font-semibold">Programa</th>
            <th className="px-6 py-3 text-center font-semibold">Progreso</th>
            <th className="px-6 py-3 text-center font-semibold">Necesita revisión</th>
            <th className="px-6 py-3 text-left font-semibold">Última actividad</th>
            <th className="px-6 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border align-middle">
          {families.map((f) => (
            <FamilyRowView key={f.id} f={f} />
          ))}
          {families.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                Ningún estudiante coincide con el filtro.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </GlassCard>
  );
}

export function AdminFamilyList({ families }: { families: FamilyRow[] }) {
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState<ProgramFilter>("all");
  const [sort, setSort] = useState<SortKey>("pending_desc");

  const filtered = useMemo(
    () => applyFilters(families, search, program, sort),
    [families, search, program, sort],
  );

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        program={program}
        sort={sort}
        onSearch={setSearch}
        onProgram={setProgram}
        onSort={setSort}
      />
      <FamilyTable families={filtered} />
    </div>
  );
}
