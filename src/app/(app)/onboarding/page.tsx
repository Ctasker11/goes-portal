import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, family_id, full_name")
    .eq("id", user!.id)
    .maybeSingle();

  if (profile?.role === "advisor" || profile?.role === "admin") {
    redirect("/admin");
  }
  if (profile?.family_id) {
    redirect("/dashboard");
  }

  const defaultName =
    profile?.full_name || (user?.user_metadata?.full_name as string) || "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-navy">¡Bienvenido a GOES!</h1>
        <p className="mt-2 text-muted-foreground">
          Para empezar, cuéntanos un poco sobre ti. Esto nos permite preparar tu
          checklist personalizado.
        </p>
        <OnboardingForm defaultName={defaultName} />
      </div>
    </div>
  );
}
