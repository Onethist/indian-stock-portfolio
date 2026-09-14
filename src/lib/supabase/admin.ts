import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses row-level security entirely.
 * Server-only, and only for system/background work that isn't acting on
 * behalf of any particular signed-in user (e.g. the scheduled price
 * refresh cron). Never import this from a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
