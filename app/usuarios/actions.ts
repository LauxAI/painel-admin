"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { generateInviteToken } from "@/lib/invites"
import { logActivity } from "@/lib/log-activity"
import type { ClientPlan, ClientStatus } from "@/lib/types"

export type ClientFormState = { error?: string; inviteUrl?: string } | null

const INVITE_TTL_DAYS = 7

export async function inviteClient(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const admin = await getCurrentAdmin()
  const db = createAdminClient()

  const responsibleName = String(formData.get("responsibleName") ?? "").trim()
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null
  const companyName = String(formData.get("companyName") ?? "").trim()
  const plan = String(formData.get("plan") ?? "starter") as ClientPlan

  if (!responsibleName || !email || !companyName) {
    return { error: "Preencha nome do responsável, empresa e e-mail." }
  }

  const { data: existing } = await db.from("client_accounts").select("id").eq("email", email).maybeSingle()
  if (existing) {
    return { error: "Já existe uma conta de cliente com este e-mail." }
  }

  const { data: company, error: companyError } = await db
    .from("companies")
    .insert({ name: companyName })
    .select()
    .single()

  if (companyError || !company) {
    return { error: "Não foi possível registrar a empresa." }
  }

  const { data: client, error: clientError } = await db
    .from("client_accounts")
    .insert({
      company_id: company.id,
      responsible_name: responsibleName,
      email,
      whatsapp,
      plan,
      status: "pendente",
      created_by: admin.id,
    })
    .select()
    .single()

  if (clientError || !client) {
    return { error: "Não foi possível criar a conta do cliente." }
  }

  const { rawToken, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await db.from("invites").insert({
    type: "cliente",
    email,
    name: responsibleName,
    client_account_id: client.id,
    token_hash: tokenHash,
    status: "pendente",
    expires_at: expiresAt,
    created_by: admin.id,
  })

  if (inviteError) {
    return { error: "Conta criada, mas não foi possível gerar o convite." }
  }

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "cliente_convidado",
    entityType: "client_account",
    entityId: client.id,
    description: `${admin.name} convidou ${responsibleName} (${companyName}) como novo cliente.`,
  })

  revalidatePath("/usuarios")
  return { inviteUrl: `/ativar-conta?token=${rawToken}` }
}

export async function updateClient(id: string, _prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const admin = await getCurrentAdmin()
  const db = createAdminClient()

  const responsibleName = String(formData.get("responsibleName") ?? "").trim()
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null
  const plan = String(formData.get("plan") ?? "starter") as ClientPlan
  const expirationDate = String(formData.get("accountExpirationDate") ?? "").trim() || null
  const notes = String(formData.get("notes") ?? "").trim() || null

  if (!responsibleName) {
    return { error: "O nome do responsável é obrigatório." }
  }

  const { error } = await db
    .from("client_accounts")
    .update({
      responsible_name: responsibleName,
      whatsapp,
      plan,
      account_expiration_date: expirationDate,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return { error: "Não foi possível atualizar os dados do cliente." }
  }

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "cliente_atualizado",
    entityType: "client_account",
    entityId: id,
    description: `${admin.name} atualizou os dados de ${responsibleName}.`,
  })

  revalidatePath("/usuarios")
  return null
}

export async function changeClientStatus(id: string, status: ClientStatus, clientName: string) {
  const admin = await getCurrentAdmin()
  const db = createAdminClient()

  const { error } = await db
    .from("client_accounts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error("Não foi possível alterar o status do cliente.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "cliente_status_alterado",
    entityType: "client_account",
    entityId: id,
    description: `${admin.name} alterou o status de ${clientName} para "${status}".`,
  })

  revalidatePath("/usuarios")
}

export async function resendClientInvite(clientId: string, previousInviteId: string, email: string, name: string) {
  const admin = await getCurrentAdmin()
  const db = createAdminClient()

  await db.from("invites").update({ status: "cancelado" }).eq("id", previousInviteId)

  const { rawToken, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await db.from("invites").insert({
    type: "cliente",
    email,
    name,
    client_account_id: clientId,
    token_hash: tokenHash,
    status: "pendente",
    expires_at: expiresAt,
    created_by: admin.id,
    previous_invite_id: previousInviteId,
  })

  if (error) throw new Error("Não foi possível reenviar o convite.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "convite_reenviado",
    entityType: "client_account",
    entityId: clientId,
    description: `${admin.name} reenviou o convite para ${name}.`,
  })

  revalidatePath("/usuarios")
  return `/ativar-conta?token=${rawToken}`
}

export async function deleteClient(id: string, clientName: string) {
  const admin = await getCurrentAdmin()
  const db = createAdminClient()

  const { error } = await db.from("client_accounts").delete().eq("id", id)
  if (error) throw new Error("Não foi possível remover o cliente.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "cliente_removido",
    entityType: "client_account",
    entityId: id,
    description: `${admin.name} removeu o cliente ${clientName}.`,
  })

  revalidatePath("/usuarios")
}
