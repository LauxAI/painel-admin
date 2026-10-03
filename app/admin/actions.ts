"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/log-activity"

export async function signOutAction() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from("admin_profiles").select("name").eq("id", user.id).maybeSingle()

    await logActivity(supabase, {
      actorId: user.id,
      actorName: profile?.name ?? user.email ?? "Desconhecido",
      actionType: "auth.logout",
      description: `${profile?.name ?? user.email} saiu do painel`,
    })
  }

  await supabase.auth.signOut()
  redirect("/login")
}
