// Validated env vars. Importing this module throws at load time if a
// required variable is missing, so misconfiguration surfaces immediately
// (on dev server start or at build time) rather than as a cryptic 401 at
// first Supabase call.
//
// Note: Next.js inlines NEXT_PUBLIC_* vars at compile time only when
// accessed via static member syntax (process.env.FOO), not dynamic lookup
// (process.env[name]). So each var is read explicitly below.

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var: ${name}. Check .env.local (local) or your hosting provider's env settings (prod).`,
    );
  }
  return value;
}

export const env = {
  SUPABASE_URL: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  SUPABASE_ANON_KEY: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
