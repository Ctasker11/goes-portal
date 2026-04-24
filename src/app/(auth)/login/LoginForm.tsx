"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

const INPUT_CLS =
  "mt-1.5 w-full rounded-xl bg-[color:var(--input-bg)] px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted border border-[color:var(--border-input)] outline-none focus:border-accent/60 focus:bg-[color:var(--surface-track)]";

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-text-dim">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={INPUT_CLS}
      />
    </label>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      setError(signInErr.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <GlassCard className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Iniciar sesión
      </h1>
      <p className="mt-1 text-sm text-text-dim">Bienvenido de vuelta a GOES.</p>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-7 space-y-4">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-brand">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-bold text-accent-text transition hover:bg-accent-dark disabled:opacity-50"
          style={{ boxShadow: "0 0 16px var(--glow)" }}
        >
          {loading ? "Cargando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-text-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/signup"
          className="font-semibold text-accent hover:underline"
        >
          Crear una
        </Link>
      </p>
    </GlassCard>
  );
}
