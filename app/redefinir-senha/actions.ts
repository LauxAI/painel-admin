"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/log-activity"
import { redirect } from "next/navigation"

export type ResetPasswordState = { error?: string } | null

export async function resetPassword(_prevState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." }
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." }
  }

  const supabase = await createClient()

  // Requires the short-lived session created by exchangeCodeForSession in
  // /auth/callback after the user clicked their invite or recovery link.
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { error: "O link expirou ou é inválido. Solicite um novo link de redefinição." }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) {
    return { error: "Não foi possível atualizar a senha. Tente novamente." }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("id, name, role, status")
    .eq("id", userData.user.id)
    .maybeSingle()

  if (profile) {
    await logActivity(admin, {
      actorId: profile.id,
      actorName: profile.name,
      actionType: "senha_atualizada",
      entityType: "admin_profile",
      entityId: profile.id,
      description: `${profile.name} definiu/atualizou a senha.`,
    })

    if (profile.role === "OWNER" || profile.role === "ADMIN") {
      if (profile.status !== "ativo") {
        await supabase.auth.signOut()
        return { error: "Seu acesso foi suspenso. Entre em contato com um Owner." }
      }
      redirect("/admin")
    }
  }

  // Not an admin account (e.g. a client) — no dashboard access.
  await supabase.auth.signOut()
  redirect("/login")
}
