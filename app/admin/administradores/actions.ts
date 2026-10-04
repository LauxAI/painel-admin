"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { generateInviteToken } from "@/lib/invites"
import { logActivity } from "@/lib/log-activity"
import { ADMIN_ROLE_LABELS } from "@/lib/types"
import type { AdminRole, AdminStatus } from "@/lib/types"

export type AdminFormState = { error?: string; inviteUrl?: string } | null

const INVITE_TTL_DAYS = 7
const ROLE_LABEL = ADMIN_ROLE_LABELS

function assertOwner(role: AdminRole) {
  if (role !== "OWNER") {
    throw new Error("Apenas o Owner pode gerenciar administradores.")
  }
}

export async function inviteAdmin(_prevState: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await getCurrentAdmin()
  if (admin.role !== "OWNER") {
    return { error: "Apenas o Owner pode convidar novos administradores." }
  }
  const db = createAdminClient()

  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const role = String(formData.get("role") ?? "ADMIN") as AdminRole

  if (!name || !email) {
    return { error: "Preencha nome e e-mail." }
  }

  const { data: existingAdmin } = await db.from("admin_profiles").select("id").eq("email", email).maybeSingle()
  if (existingAdmin) {
    return { error: "Já existe um administrador com este e-mail." }
  }

  const { data: existingInvite } = await db
    .from("invites")
    .select("id")
    .eq("email", email)
    .eq("type", "administrador")
    .eq("status", "pendente")
    .maybeSingle()
  if (existingInvite) {
    return { error: "Já existe um convite pendente para este e-mail." }
  }

  const { rawToken, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await db.from("invites").insert({
    type: "administrador",
    email,
    name,
    role,
    token_hash: tokenHash,
    status: "pendente",
    expires_at: expiresAt,
    created_by: admin.id,
  })

  if (inviteError) {
    return { error: "Não foi possível gerar o convite." }
  }

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "administrador_convidado",
    entityType: "invite",
    description: `${admin.name} convidou ${name} como ${role === "OWNER" ? "Owner" : "Administrador"}.`,
  })

  revalidatePath("/administradores")
  return { inviteUrl: `/ativar-conta?token=${rawToken}` }
}

export async function resendAdminInvite(previousInviteId: string, email: string, name: string, role: AdminRole) {
  const admin = await getCurrentAdmin()
  assertOwner(admin.role)
  const db = createAdminClient()

  await db.from("invites").update({ status: "cancelado" }).eq("id", previousInviteId)

  const { rawToken, tokenHash } = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await db.from("invites").insert({
    type: "administrador",
    email,
    name,
    role,
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
    entityType: "invite",
    description: `${admin.name} reenviou o convite de administrador para ${name}.`,
  })

  revalidatePath("/administradores")
  return `/ativar-conta?token=${rawToken}`
}

export async function cancelAdminInvite(inviteId: string, name: string) {
  const admin = await getCurrentAdmin()
  assertOwner(admin.role)
  const db = createAdminClient()

  const { error } = await db.from("invites").update({ status: "cancelado" }).eq("id", inviteId)
  if (error) throw new Error("Não foi possível cancelar o convite.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "convite_cancelado",
    entityType: "invite",
    description: `${admin.name} cancelou o convite pendente de ${name}.`,
  })

  revalidatePath("/administradores")
}

async function countActiveOwners(db: ReturnType<typeof createAdminClient>) {
  const { count } = await db
    .from("admin_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "OWNER")
    .eq("status", "ativo")
  return count ?? 0
}

export async function changeAdminRole(id: string, role: AdminRole, targetName: string) {
  const admin = await getCurrentAdmin()
  assertOwner(admin.role)
  if (id === admin.id) {
    throw new Error("Você não pode alterar sua própria função.")
  }
  const db = createAdminClient()

  const { data: before } = await db.from("admin_profiles").select("role, status").eq("id", id).maybeSingle()
  if (!before) {
    throw new Error("Administrador não encontrado.")
  }

  if (before.role === "OWNER" && role === "ADMIN") {
    const activeOwners = await countActiveOwners(db)
    if (before.status === "ativo" && activeOwners <= 1) {
      throw new Error("Não é possível rebaixar o único Owner ativo da conta.")
    }
  }

  const { error } = await db.from("admin_profiles").update({ role }).eq("id", id)
  if (error) throw new Error("Não foi possível alterar a função.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "administrador_funcao_alterada",
    entityType: "admin_profile",
    entityId: id,
    description: `${admin.name} alterou a função de ${targetName} de "${ROLE_LABEL[before.role as AdminRole]}" para "${ROLE_LABEL[role]}".`,
    metadata: { before: before.role, after: role },
  })

  revalidatePath("/administradores")
}

export async function changeAdminStatus(id: string, status: AdminStatus, targetName: string) {
  const admin = await getCurrentAdmin()
  assertOwner(admin.role)
  if (id === admin.id) {
    throw new Error("Você não pode alterar seu próprio status.")
  }
  const db = createAdminClient()

  const { data: before } = await db.from("admin_profiles").select("role, status").eq("id", id).maybeSingle()
  if (!before) {
    throw new Error("Administrador não encontrado.")
  }

  if (status === "suspenso" && before.role === "OWNER" && before.status === "ativo") {
    const activeOwners = await countActiveOwners(db)
    if (activeOwners <= 1) {
      throw new Error("Não é possível suspender o único Owner ativo da conta.")
    }
  }

  const { error } = await db.from("admin_profiles").update({ status }).eq("id", id)
  if (error) throw new Error("Não foi possível alterar o status.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "administrador_status_alterado",
    entityType: "admin_profile",
    entityId: id,
    description:
      status === "suspenso"
        ? `${admin.name} suspendeu o acesso do administrador ${targetName}.`
        : `${admin.name} reativou o acesso do administrador ${targetName}.`,
    metadata: { before: before.status, after: status },
  })

  revalidatePath("/administradores")
}

export async function removeAdmin(id: string, targetName: string) {
  const admin = await getCurrentAdmin()
  assertOwner(admin.role)
  if (id === admin.id) {
    throw new Error("Você não pode remover a si mesmo.")
  }
  const db = createAdminClient()

  const { data: target } = await db.from("admin_profiles").select("role, status").eq("id", id).maybeSingle()
  if (!target) {
    throw new Error("Administrador não encontrado.")
  }

  if (target.role === "OWNER" && target.status === "ativo") {
    const activeOwners = await countActiveOwners(db)
    if (activeOwners <= 1) {
      throw new Error("Não é possível remover o único Owner ativo da conta.")
    }
  }

  // Revoke admin access only. The underlying auth.users record is preserved
  // (not deleted) so login history, other associations, and activity_logs
  // attribution remain intact — this user simply stops being an administrator.
  const { error } = await db.from("admin_profiles").delete().eq("id", id)
  if (error) throw new Error("Não foi possível remover o administrador.")

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "administrador_removido",
    entityType: "admin_profile",
    entityId: id,
    description: `${admin.name} removeu o acesso administrativo de ${targetName}.`,
    metadata: { role: target.role },
  })

  revalidatePath("/administradores")
}
