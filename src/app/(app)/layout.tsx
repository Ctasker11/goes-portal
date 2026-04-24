import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/ui/StarLogo";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { ParticleField } from "@/components/ui/ParticleField";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const isInternal = profile?.role === "advisor" || profile?.role === "admin";
  const homeHref = isInternal ? "/admin" : "/dashboard";
  const displayName = profile?.full_name || user.email;
  const theme = await getTheme();

  return (
    <div className="relative z-[1] flex min-h-screen flex-col">
      <ParticleField count={30} />
      <header
        className="sticky top-0 z-20 border-b border-border"
        style={{
          background: "var(--surface-overlay)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href={homeHref} aria-label="Inicio">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-sm font-semibold text-foreground sm:inline">
              {displayName}
            </span>
            {isInternal && (
              <Link
                href="/admin"
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-text transition hover:bg-accent-dark"
              >
                Panel interno
              </Link>
            )}
            <ThemeToggle theme={theme} />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
