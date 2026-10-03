// One-off server-side utility: generates a single-use Supabase Auth
// password-recovery link for an existing admin account.
//
// Usage: node scripts/generate-recovery-link.mjs <email>
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in the
// environment. Never import this file from application code — it is a
// manual/CLI tool only, and the generated link is printed once to stdout.
import { createClient } from "@supabase/supabase-js"

const email = process.argv[2]

if (!email) {
  console.error("Usage: node scripts/generate-recovery-link.mjs <email>")
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.")
  process.exit(1)
}

// This MUST be the app's own origin reachable from the browser (the v0
// preview redirect proxy, or a deployed domain) — never localhost, since the
// link is opened by the user's browser, not by this script.
const redirectOrigin = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL

if (!redirectOrigin) {
  console.error("Missing NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL in the environment.")
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Supabase only honors `redirectTo` when it exactly matches an entry in the
// project's allowed redirect URL list; the v0-managed proxy origin is
// pre-allowed there, but appending a query string breaks that exact match
// and GoTrue silently falls back to the default Site URL instead. The
// `/auth/callback` route already defaults its own `next` param to
// `/redefinir-senha`, so no query string is needed here.
const { data, error } = await admin.auth.admin.generateLink({
  type: "recovery",
  email,
  options: {
    redirectTo: redirectOrigin,
  },
})

if (error) {
  console.error("Failed to generate recovery link:", error.message)
  process.exit(1)
}

console.log("Single-use recovery link (expires after first use / short TTL):")
console.log(data.properties.action_link)
