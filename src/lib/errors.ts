// Map Supabase/Postgres errors to user-safe messages. We don't want raw
// trigger text, SQL state codes, or policy names leaking to end users in
// production — an attacker can read rate-limit thresholds or RLS shape
// from the error surface. Development still sees raw messages via console.

type SupabaseErrorLike = {
  code?: string;
  message?: string;
} | null | undefined;

const CODE_MESSAGES: Record<string, string> = {
  // Raised by our BEFORE triggers (guard_profile_update, rate limit, etc).
  P0001: "Acción no permitida.",
  // Unique violation.
  "23505": "Ya existe un registro con esos datos.",
  // FK violation.
  "23503": "Referencia inválida.",
  // Check constraint violation (length caps, etc).
  "23514": "Datos inválidos.",
  // Insufficient privilege (RLS).
  "42501": "Sin permisos para esta acción.",
  // Not null violation.
  "23502": "Faltan datos requeridos.",
};

export function friendlyError(
  err: SupabaseErrorLike,
  fallback = "Algo salió mal. Inténtalo de nuevo.",
): string {
  if (!err) return fallback;

  // Always log raw for devs / ops.
  if (process.env.NODE_ENV !== "production") {
    console.error("[supabase error]", err);
  }

  if (err.code && CODE_MESSAGES[err.code]) {
    return CODE_MESSAGES[err.code];
  }
  // Rate limit message is distinctive enough to forward as-is, just without
  // the "max N per minute for action Y" specifics.
  if (err.message?.startsWith("rate limit exceeded")) {
    return "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
  }
  return fallback;
}
