"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

  if (success) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">¡Casi listo!</h1>
        <p className="mt-3 text-muted-foreground">
          Te enviamos un email de confirmación. Verifica tu cuenta para entrar
          al portal.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 rounded-full bg-navy px-6 py-2 text-sm font-semibold text-white"
        >
          Volver al login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Una cuenta por familia. La pueden compartir estudiantes y padres.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-8 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-navy">
            Nombre completo del estudiante
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:border-navy focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:border-navy focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy">
            Contraseña
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:border-navy focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Mínimo 8 caracteres.
          </p>
        </div>

        {error && <p className="text-sm text-red-brand">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-red-brand py-2.5 font-semibold text-white transition hover:bg-red-brand-dark disabled:opacity-50"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-navy">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
