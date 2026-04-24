"use client";

import { useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md">
      <GlassCard className="p-8 text-center">
        <h2 className="font-display text-xl font-extrabold text-foreground">
          Algo salió mal
        </h2>
        <p className="mt-3 text-sm text-text-dim">
          {error.message || "Error inesperado. Intenta de nuevo."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-text-muted">
            Ref: <code>{error.digest}</code>
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-text"
        >
          Reintentar
        </button>
      </GlassCard>
    </div>
  );
}
