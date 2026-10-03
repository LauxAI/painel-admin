import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client. Server-only — never import this from a Client Component.
 * Bypasses Row Level Security, so it is restricted to a small set of controlled
 * server-side flows (invite token validation, account activation).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
