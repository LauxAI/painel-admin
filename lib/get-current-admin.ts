import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { AdminProfile } from "@/lib/types"

/**
 * Server-only helper for authenticated dashboard routes.
 * Redirects to /login if there is no session, or back to /login if the
 * session belongs to a user without an admin_profiles row (e.g. a client account).
 */
export async function getCurrentAdmin(): Promise<AdminProfile> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("admin_profiles").select("*").eq("id", user.id).maybeSingle()

  if (!profile) {
    redirect("/login")
  }

  if (profile.status === "suspenso") {
    await supabase.auth.signOut()
    redirect("/login?suspenso=1")
  }

  return profile as AdminProfile
}
