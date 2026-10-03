// Server-side only. Sets a password for an existing Supabase Auth user via the Admin API
// using the service role key. Never run this from the browser/client code.
// Usage: TEMP_OWNER_PASSWORD=*** node scripts/set-owner-password.mjs <email>
import { createClient } from "@supabase/supabase-js"

const email = process.argv[2]
const password = process.env.TEMP_OWNER_PASSWORD

if (!email) {
  console.error("Usage: TEMP_OWNER_PASSWORD=*** node scripts/set-owner-password.mjs <email>")
  process.exit(1)
}

if (!password || password.length < 8) {
  console.error("TEMP_OWNER_PASSWORD env var must be set and have at least 8 characters.")
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.")
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: userList, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    console.error("Failed to list users:", listError.message)
    process.exit(1)
  }

  const user = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.error(`No auth user found with email ${email}.`)
    process.exit(1)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })

  if (updateError) {
    console.error("Failed to update password:", updateError.message)
    process.exit(1)
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("Password updated, but failed to verify admin_profiles row:", profileError.message)
    process.exit(1)
  }

  if (!profile) {
    console.error("Password updated, but no admin_profiles row exists for this user.")
    process.exit(1)
  }

  console.log("Password updated successfully.")
  console.log(`admin_profiles row -> role: ${profile.role}, status: ${profile.status}`)
}

main()
