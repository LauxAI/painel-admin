// One-off provisioning script: creates (or repairs) the OWNER admin account.
//
// - Creates the user in Supabase Auth via the Admin API (service role key).
//   No password is embedded here — Supabase generates a one-time invite
//   link that the recipient uses to set their own password.
// - Upserts the matching row in public.admin_profiles with role OWNER and
//   status ativo, so the login flow grants dashboard access.
//
// Usage: node scripts/create-owner.mjs <email> [name]
import { createClient } from "@supabase/supabase-js"

const email = process.argv[2]
const name = process.argv[3] ?? "Owner"

if (!email) {
  console.error("Usage: node scripts/create-owner.mjs <email> [name]")
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.")
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  // 1. Find or create the Auth user. generateLink with type "invite" creates
  // the user if they don't exist yet and returns a one-time action link —
  // no password is ever set by this script.
  const redirectTo = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || undefined

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  })

  let userId

  if (linkError) {
    // Most likely cause: the user already exists in Supabase Auth.
    if (String(linkError.message || "").toLowerCase().includes("already")) {
      const { data: list, error: listError } = await admin.auth.admin.listUsers()
      if (listError) {
        console.error("Failed to look up existing user:", listError.message)
        process.exit(1)
      }
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (!existing) {
        console.error("generateLink reported the user exists, but it could not be found:", linkError.message)
        process.exit(1)
      }
      userId = existing.id
      console.log(`Auth user already exists for ${email} (id: ${userId}).`)

      // Issue a fresh password recovery link for them to (re)set their password.
      const { data: recoveryLink, error: recoveryError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      })
      if (recoveryError) {
        console.error("Failed to generate a recovery link:", recoveryError.message)
      } else {
        console.log("\nPassword recovery link (one-time, use to set/reset the password):")
        console.log(recoveryLink.properties.action_link)
      }
    } else {
      console.error("Failed to create Auth user:", linkError.message)
      process.exit(1)
    }
  } else {
    userId = linkData.user.id
    console.log(`Created Auth user for ${email} (id: ${userId}).`)
    console.log("\nInvite link (one-time, use to set the password):")
    console.log(linkData.properties.action_link)
  }

  // 2. Upsert the admin_profiles row as an active OWNER.
  const { error: profileError } = await admin
    .from("admin_profiles")
    .upsert(
      {
        id: userId,
        name,
        email,
        role: "OWNER",
        status: "ativo",
      },
      { onConflict: "id" },
    )

  if (profileError) {
    console.error("Failed to upsert admin_profiles row:", profileError.message)
    process.exit(1)
  }

  console.log(`\nadmin_profiles row ready: role=OWNER status=ativo for ${email}.`)
}

main()
