/**
 * Supabase persistence is entirely opt-in: without these two env vars set,
 * the app falls back to the original localStorage-only behavior so the
 * zero-config demo experience never breaks (section 38 — auth is optional
 * for the local/demo build).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
