"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    <div>
      <h1 className="text-2xl font-bold text-navy">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bienvenido de vuelta a GOES.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-8 space-y-4"
      >
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 focus:border-navy focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-brand">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-navy py-2.5 font-semibold text-white transition hover:bg-navy-dark disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/signup" className="font-semibold text-navy">
          Crear una
        </Link>
      </p>
    </div>
  );
}
