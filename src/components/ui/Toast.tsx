"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; message: string };
type ToastCtx = {
  show: (kind: ToastKind, message: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto min-w-[240px] rounded-xl border border-border px-4 py-3 text-sm text-foreground backdrop-blur-xl"
            style={{
              background:
                t.kind === "success"
                  ? "rgba(34,197,94,0.15)"
                  : t.kind === "error"
                    ? "rgba(206,69,77,0.2)"
                    : "var(--surface-overlay)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
              animation: "fadeUp 300ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      show: () => {},
    } as ToastCtx;
  }
  return ctx;
}
