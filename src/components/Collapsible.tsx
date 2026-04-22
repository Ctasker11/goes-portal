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
        className="mb-3 flex w-full cursor-pointer items-center justify-between text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className={`transition ${open ? "rotate-90" : ""}`}>▸</span>
          {title}
        </div>
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}
