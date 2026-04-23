"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      setError(rpcErr.message);
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
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-8 space-y-6"
    >
      <div>
        <label className="block text-sm font-medium text-navy">
          Nombre completo del estudiante
        </label>
        <input
          type="text"
          required
          minLength={2}
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:border-navy focus:outline-none"
          placeholder="Ej. María García López"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Tal y como aparece en el pasaporte.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy">
          ¿Qué tipo de beca buscas?
        </label>
        <div className="mt-3 space-y-2">
          {PROGRAMS.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                program === p.value
                  ? "border-navy bg-navy/5"
                  : "border-border hover:border-navy/50"
              }`}
            >
              <input
                type="radio"
                name="program"
                value={p.value}
                checked={program === p.value}
                onChange={() => setProgram(p.value)}
                className="mt-1 accent-navy"
              />
              <div>
                <div className="font-semibold text-navy">{p.title}</div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-brand">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!program || !studentName.trim() || loading}
        className="w-full rounded-full bg-red-brand py-3 font-semibold text-white transition hover:bg-red-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creando tu portal…" : "Comenzar"}
      </button>
    </form>
  );
}
