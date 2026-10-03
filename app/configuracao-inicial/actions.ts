"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/log-activity"
import { redirect } from "next/navigation"

export type SetupState = { error?: string } | null

export async function createFirstOwner(_prevState: SetupState, formData: FormData): Promise<SetupState> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos." }
  }
  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." }
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." }
  }

  const admin = createAdminClient()

  const { data: hasAdmin } = await admin.rpc("has_any_admin")
  if (hasAdmin) {
    return { error: "A configuração inicial já foi concluída. Faça login normalmente." }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return { error: createError?.message ?? "Não foi possível criar a conta." }
  }

  const { error: profileError } = await admin.from("admin_profiles").insert({
    id: created.user.id,
    name,
    email,
    role: "OWNER",
    status: "ativo",
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: "Não foi possível criar o perfil administrativo." }
  }

  await logActivity(admin, {
    actorId: created.user.id,
    actorName: name,
    actionType: "configuracao_inicial",
    entityType: "admin_profile",
    entityId: created.user.id,
    description: `${name} concluiu a configuração inicial e se tornou o primeiro Owner.`,
  })

  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  redirect("/admin")
}
