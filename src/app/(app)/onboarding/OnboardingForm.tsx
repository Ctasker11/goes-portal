"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

type Program = "academic" | "sports" | "both";

const PROGRAMS: { value: Program; title: string; desc: string }[] = [
  {
    value: "academic",
    title: "Beca académica",
    desc: "Quiero entrar a una universidad de EE.UU. por mi expediente académico.",
  },
  {
    value: "sports",
    title: "Beca deportiva",
    desc: "Quiero conseguir una beca por mi rendimiento deportivo.",
  },
  {
    value: "both",
    title: "Beca académica + deportiva",
    desc: "Soy estudiante-atleta. Quiero combinar ambos perfiles.",
  },
];

function ProgramOption({
  option,
  selected,
  onSelect,
}: {
  option: (typeof PROGRAMS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
      style={{
        borderColor: selected ? "var(--border-active)" : "var(--border)",
        background: selected
          ? "var(--surface-comment)"
          : "var(--surface-sunken)",
      }}
    >
      <input
        type="radio"
        name="program"
        value={option.value}
        checked={selected}
        onChange={onSelect}
        className="mt-1 accent-[color:var(--accent)]"
      />
      <div>
        <div className="font-semibold text-foreground">{option.title}</div>
        <div className="mt-0.5 text-xs text-text-dim">{option.desc}</div>
      </div>
    </label>
  );
}

export function OnboardingForm({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState(defaultName);
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: newFamilyId, error: rpcErr } = await supabase.rpc(
      "complete_onboarding",
      {
        p_student_name: studentName.trim(),
        p_program: program,
      },
    );

    if (rpcErr) {
      setError(friendlyError(rpcErr, "No se pudo completar el onboarding."));
      setLoading(false);
      return;
    }
    if (!newFamilyId || typeof newFamilyId !== "string") {
      setError("El servidor no devolvió un ID de familia válido.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-7 space-y-6">
      <label className="block">
        <span className="text-xs font-semibold text-text-dim">
          Nombre completo del estudiante
        </span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={255}
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Ej. María García López"
          className="mt-1.5 w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--input-bg)] px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted outline-none focus:border-accent/60"
        />
        <p className="mt-1 text-[11px] text-text-muted">
          Tal y como aparece en el pasaporte.
        </p>
      </label>

      <div>
        <span className="text-xs font-semibold text-text-dim">
          ¿Qué tipo de beca buscas?
        </span>
        <div className="mt-2.5 space-y-2">
          {PROGRAMS.map((p) => (
            <ProgramOption
              key={p.value}
              option={p}
              selected={program === p.value}
              onSelect={() => setProgram(p.value)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p
          className="rounded-md p-3 text-sm text-red-brand"
          style={{ background: "rgba(206,69,77,0.1)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!program || !studentName.trim() || loading}
        className="w-full rounded-full bg-accent py-3 text-sm font-bold text-accent-text transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        style={{ boxShadow: "0 0 16px var(--glow)" }}
      >
        {loading ? "Creando tu portal…" : "Comenzar"}
      </button>
    </form>
  );
}
