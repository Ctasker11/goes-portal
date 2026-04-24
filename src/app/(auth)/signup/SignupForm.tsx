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
  hint,
  minLength,
  maxLength,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  minLength?: number;
  maxLength?: number;
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
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={INPUT_CLS}
      />
      {hint && <p className="mt-1 text-[11px] text-text-muted">{hint}</p>}
    </label>
  );
}

function SuccessScreen({ onReturn }: { onReturn: () => void }) {
  return (
    <GlassCard className="p-8 text-center">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        ¡Casi listo!
      </h1>
      <p className="mt-3 text-sm text-text-dim">
        Te enviamos un email de confirmación. Verifica tu cuenta para entrar
        al portal.
      </p>
      <button
        onClick={onReturn}
        className="mt-6 rounded-full bg-accent px-6 py-2 text-sm font-bold text-accent-text"
      >
        Volver al login
      </button>
    </GlassCard>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  if (success) return <SuccessScreen onReturn={() => router.push("/login")} />;

  return (
    <GlassCard className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        Crear cuenta
      </h1>
      <p className="mt-1 text-sm text-text-dim">
        Una cuenta por familia. La pueden compartir estudiantes y padres.
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-7 space-y-4">
        <Field
          label="Nombre completo del estudiante"
          type="text"
          value={fullName}
          onChange={setFullName}
          minLength={2}
          maxLength={255}
          autoComplete="name"
        />
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
          minLength={8}
          hint="Mínimo 8 caracteres."
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-brand">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-bold text-accent-text transition hover:bg-accent-dark disabled:opacity-50"
          style={{ boxShadow: "0 0 16px var(--glow)" }}
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-accent hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </GlassCard>
  );
}
