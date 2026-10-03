"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/log-activity"
import { redirect } from "next/navigation"

export type LoginState = { error?: string } | null

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Informe e-mail e senha." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { error: "E-mail ou senha incorretos." }
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id, name, status, role")
    .eq("id", data.user.id)
    .maybeSingle()

  if (!profile || (profile.role !== "OWNER" && profile.role !== "ADMIN")) {
    await supabase.auth.signOut()
    return { error: "Esta conta não possui acesso ao painel administrativo." }
  }

  if (profile.status !== "ativo") {
    await supabase.auth.signOut()
    return { error: "Seu acesso foi suspenso. Entre em contato com um Owner." }
  }

  const admin = createAdminClient()
  await admin.from("admin_profiles").update({ last_sign_in_at: new Date().toISOString() }).eq("id", profile.id)
  await logActivity(admin, {
    actorId: profile.id,
    actorName: profile.name,
    actionType: "login",
    entityType: "admin_profile",
    entityId: profile.id,
    description: `${profile.name} entrou no painel.`,
  })

  redirect("/admin")
}
