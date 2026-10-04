"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { logActivity } from "@/lib/log-activity"
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from "@/app/admin/configuracoes/types"

async function readOrganizationSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<OrganizationSettings> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "organizacao").maybeSingle()
  return { ...DEFAULT_ORGANIZATION_SETTINGS, ...(data?.value as Partial<OrganizationSettings> | undefined) }
}

export async function updateOrganizationSettings(formData: FormData) {
  const admin = await getCurrentAdmin()
  if (admin.role !== "OWNER") throw new Error("Apenas o Owner pode alterar estas configurações.")

  const name = String(formData.get("name") ?? "").trim()
  const supportEmail = String(formData.get("supportEmail") ?? "").trim()
  const displayName = String(formData.get("displayName") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const website = String(formData.get("website") ?? "").trim()
  const logoUrl = String(formData.get("logoUrl") ?? "").trim()

  if (!name) throw new Error("Informe o nome da organização.")

  const supabase = await createClient()
  const current = await readOrganizationSettings(supabase)

  const { error } = await supabase.from("app_settings").upsert({
    key: "organizacao",
    value: {
      ...current,
      name,
      support_email: supportEmail || null,
      display_name: displayName || null,
      phone: phone || null,
      website: website || null,
      logo_url: logoUrl || null,
    },
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

  revalidatePath("/admin/configuracoes")
}

export async function updateOrganizationPreferences(formData: FormData) {
  const admin = await getCurrentAdmin()
  if (admin.role !== "OWNER") throw new Error("Apenas o Owner pode alterar estas preferências.")

  const timezone = String(formData.get("timezone") ?? "").trim()
  const language = String(formData.get("language") ?? "").trim()
  const dateFormat = String(formData.get("dateFormat") ?? "").trim()
  const timeFormat = String(formData.get("timeFormat") ?? "").trim()

  const supabase = await createClient()
  const current = await readOrganizationSettings(supabase)

  const { error } = await supabase.from("app_settings").upsert({
    key: "organizacao",
    value: {
      ...current,
      timezone: timezone || null,
      language: language || null,
      date_format: dateFormat || null,
      time_format: timeFormat || null,
    },
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  })

  if (error) throw new Error("Não foi possível salvar as preferências.")

  await logActivity(supabase, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "configuracoes_atualizadas",
    entityType: "app_settings",
    entityId: "organizacao_preferencias",
    description: `${admin.name} atualizou as preferências gerais da organização.`,
  })

  revalidatePath("/admin/configuracoes")
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
