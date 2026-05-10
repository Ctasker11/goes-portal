import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminFamilyList, type FamilyRow } from "@/components/admin/AdminFamilyList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel interno · GOES Portal",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "advisor" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: families } = await supabase
    .from("families_with_stats")
    .select(
      "id, student_name, program, created_at, total, pending_review, in_review, approved, needs_revision, last_activity_at",
    );

  const totalPending = (families ?? []).reduce(
    (sum, f) => sum + (f.pending_review ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          Panel interno
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          Estudiantes activos · {families?.length ?? 0}
          {totalPending > 0 && (
            <>
              {" · "}
              <span className="font-medium text-accent">
                {totalPending} documento{totalPending !== 1 ? "s" : ""} necesita
                {totalPending === 1 ? "" : "n"} revisión
              </span>
            </>
          )}
        </p>
      </div>

      <AdminFamilyList families={(families ?? []) as FamilyRow[]} />
    </div>
  );
}
