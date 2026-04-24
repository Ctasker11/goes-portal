import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertDefined } from "@/lib/assert";
import { GlassCard } from "@/components/ui/GlassCard";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bienvenido · GOES Portal",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertDefined(user, "auth user");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "advisor" || profile?.role === "admin") {
    redirect("/admin");
  }
  if (profile?.family_id) {
    redirect("/dashboard");
  }

  const defaultName =
    profile?.full_name || (user.user_metadata?.full_name as string) || "";

  return (
    <div className="mx-auto max-w-2xl">
      <GlassCard className="p-8">
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          ¡Bienvenido a GOES!
        </h1>
        <p className="mt-2 text-sm text-text-dim">
          Para empezar, cuéntanos un poco sobre ti. Esto nos permite preparar
          tu checklist personalizado.
        </p>
        <OnboardingForm defaultName={defaultName} />
      </GlassCard>
    </div>
  );
}
