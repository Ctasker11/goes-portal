"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this would ship to Sentry / logging backend.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-bold text-navy">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "Error inesperado. Intenta de nuevo."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Ref: <code>{error.digest}</code>
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white"
      >
        Reintentar
      </button>
    </div>
  );
}
