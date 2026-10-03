"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { logActivity } from "@/lib/log-activity"

export async function updateOrganizationSettings(formData: FormData) {
  const admin = await getCurrentAdmin()
  if (admin.role !== "OWNER") throw new Error("Apenas o Owner pode alterar estas configurações.")

  const name = String(formData.get("name") ?? "").trim()
  const supportEmail = String(formData.get("supportEmail") ?? "").trim()

  if (!name) throw new Error("Informe o nome da organização.")

  const supabase = await createClient()

  const { error } = await supabase.from("app_settings").upsert({
    key: "organizacao",
    value: { name, support_email: supportEmail || null },
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  })

  if (error) throw new Error("Não foi possível salvar as configurações.")

  await logActivity(supabase, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "configuracoes_atualizadas",
    entityType: "app_settings",
    entityId: "organizacao",
    description: `${admin.name} atualizou os dados da organização.`,
  })

  revalidatePath("/configuracoes")
}

export async function updateOwnProfile(formData: FormData) {
  const admin = await getCurrentAdmin()
  const name = String(formData.get("name") ?? "").trim()

  if (!name) throw new Error("Informe seu nome.")

  const supabase = await createClient()
  const { error } = await supabase.from("admin_profiles").update({ name }).eq("id", admin.id)

  if (error) throw new Error("Não foi possível atualizar o perfil.")

  await logActivity(supabase, {
    actorId: admin.id,
    actorName: name,
    actionType: "perfil_atualizado",
    entityType: "admin_profile",
    entityId: admin.id,
    description: `${admin.name} atualizou o próprio nome para "${name}".`,
  })

  revalidatePath("/configuracoes")
}

export async function updateOwnPassword(formData: FormData) {
  const admin = await getCurrentAdmin()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.")
  if (password !== confirmPassword) throw new Error("As senhas não coincidem.")

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) throw new Error("Não foi possível atualizar a senha.")

  await logActivity(supabase, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "senha_atualizada",
    entityType: "admin_profile",
    entityId: admin.id,
    description: `${admin.name} atualizou a própria senha.`,
  })
}
