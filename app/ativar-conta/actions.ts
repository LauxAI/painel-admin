"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { hashInviteToken, isInviteExpired } from "@/lib/invites"
import { logActivity } from "@/lib/log-activity"
import { redirect } from "next/navigation"

export type ActivateState = { error?: string } | null

export async function activateAccount(_prevState: ActivateState, formData: FormData): Promise<ActivateState> {
  const rawToken = String(formData.get("token") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!rawToken) return { error: "Convite inválido." }
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." }
  if (password !== confirmPassword) return { error: "As senhas não coincidem." }

  const admin = createAdminClient()
  const tokenHash = hashInviteToken(rawToken)

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (inviteError || !invite) return { error: "Convite inválido ou não encontrado." }
  if (invite.status === "cancelado") return { error: "Este convite foi cancelado." }
  if (invite.status === "aceito") return { error: "Este convite já foi utilizado." }
  if (invite.status === "expirado" || isInviteExpired(invite.expires_at)) {
    await admin.from("invites").update({ status: "expirado" }).eq("id", invite.id)
    return { error: "Este convite expirou. Solicite um novo convite." }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return { error: createError?.message ?? "Não foi possível criar a conta." }
  }

  if (invite.type === "administrador") {
    const { error: profileError } = await admin.from("admin_profiles").insert({
      id: created.user.id,
      name: invite.name,
      email: invite.email,
      role: invite.role ?? "ADMIN",
      status: "ativo",
      created_by: invite.created_by,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return { error: "Não foi possível criar o perfil administrativo." }
    }
  } else {
    const { error: clientError } = await admin
      .from("client_accounts")
      .update({
        auth_user_id: created.user.id,
        status: "ativo",
        account_start_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.client_account_id)
    if (clientError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return { error: "Não foi possível ativar a conta de cliente." }
    }
  }

  await admin
    .from("invites")
    .update({ status: "aceito", accepted_at: new Date().toISOString() })
    .eq("id", invite.id)

  await logActivity(admin, {
    actorId: created.user.id,
    actorName: invite.name,
    actionType: "convite_aceito",
    entityType: invite.type === "administrador" ? "admin_profile" : "client_account",
    entityId: invite.type === "administrador" ? created.user.id : invite.client_account_id,
    description: `${invite.name} ativou a conta via convite (${invite.type}).`,
  })

  redirect("/login?ativado=1")
}
