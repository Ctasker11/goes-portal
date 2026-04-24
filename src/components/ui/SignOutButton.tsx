"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={() => void handleSignOut()}
      className="rounded-full bg-[color:var(--surface-sunken)] px-3.5 py-1.5 text-xs text-text-dim transition hover:bg-[color:var(--surface-track)] hover:text-foreground"
    >
      Cerrar sesión
    </button>
  );
}
