"use client";

import { useState } from "react";

export function Collapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full cursor-pointer items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span
          className="inline-block text-[11px] text-text-muted transition"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0)" }}
        >
          ▸
        </span>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-dim">
          {title}
        </div>
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </section>
  );
}
