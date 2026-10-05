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
    // Busca os dados do cliente ANTES de ativar — precisamos de
    // responsible_name/whatsapp/company_id para sincronizar o Client Dashboard.
    const { data: clientAccount, error: clientFetchError } = await admin
      .from("client_accounts")
      .select("id, company_id, whatsapp, responsible_name, email")
      .eq("id", invite.client_account_id)
      .maybeSingle()

    if (clientFetchError || !clientAccount) {
      await admin.auth.admin.deleteUser(created.user.id)
      return { error: "Não foi possível localizar a conta de cliente associada a este convite." }
    }

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

    // --- Sincronização com o Client Dashboard ---
    // dashboard-laux lê `profiles` (usuário logado) e `company_members`
    // (vínculo usuário <-> empresa + papel) diretamente via Supabase/RLS.
    // Sem estas duas gravações, a ativação "funciona" no Auth mas o Client
    // Dashboard fica sem nome, sem empresa e sem equipe.
    const revertClientActivation = async () => {
      const { error: revertClientError } = await admin
        .from("client_accounts")
        .update({ auth_user_id: null, status: "pendente", account_start_date: null, updated_at: new Date().toISOString() })
        .eq("id", invite.client_account_id)
      if (revertClientError) {
        // Não silenciar: se o client_account não puder ser revertido para
        // "pendente", fica um auth_user_id apontando para um usuário que
        // estamos prestes a excluir. Registra para investigação manual.
        console.error(
          `[ativar-conta] Falha ao revalidar client_accounts (id=${invite.client_account_id}) durante rollback:`,
          revertClientError.message,
        )
      }

      const { error: revertAuthError } = await admin.auth.admin.deleteUser(created.user.id)
      if (revertAuthError) {
        // Se o usuário Auth não puder ser excluído, ele fica "órfão": existe
        // no Auth mas (se o revert acima funcionou) sem client_account ativo
        // e sem profile/company_members consistentes. Registra para
        // investigação manual — não há como recuperar automaticamente aqui.
        console.error(
          `[ativar-conta] Falha ao excluir usuário Auth (id=${created.user.id}) durante rollback:`,
          revertAuthError.message,
        )
      }
    }

    const { error: profileSyncError } = await admin.from("profiles").upsert({
      id: created.user.id,
      email: clientAccount.email,
      full_name: clientAccount.responsible_name,
      phone: clientAccount.whatsapp,
    })

    if (profileSyncError) {
      await revertClientActivation()
      return { error: "Não foi possível sincronizar o perfil do cliente." }
    }

    if (!clientAccount.company_id) {
      // Sem company_id não há como vincular o cliente a nenhuma empresa no
      // Client Dashboard: ativar mesmo assim reproduziria o bug original
      // (login funciona, painel fica vazio) de forma silenciosa. Trata como
      // erro explícito e desfaz a ativação.
      await revertClientActivation()
      return {
        error: "Esta conta de cliente não está vinculada a nenhuma empresa. Associe uma empresa antes de enviar o convite.",
      }
    }

    const { error: memberSyncError } = await admin.from("company_members").upsert(
      {
        company_id: clientAccount.company_id,
        user_id: created.user.id,
        // Primeiro usuário ativado da empresa = administrador da conta
        // no Client Dashboard. Revisar esta regra se o Admin passar a
        // convidar múltiplos usuários para a mesma empresa.
        role: "administrador",
      },
      { onConflict: "company_id,user_id" },
    )

    if (memberSyncError) {
      await revertClientActivation()
      return { error: "Não foi possível vincular o cliente à empresa." }
    }
  }

  const { error: inviteUpdateError } = await admin
    .from("invites")
    .update({ status: "aceito", accepted_at: new Date().toISOString() })
    .eq("id", invite.id)

  if (inviteUpdateError) {
    // A conta já está totalmente ativa e sincronizada (client_accounts,
    // profiles, company_members) neste ponto — não revertemos mais nada.
    // Apenas registra: o convite pode ficar com status desatualizado
    // ("pendente"/"enviado") mesmo com o usuário já ativo, o que é
    // cosmético, não destrutivo, mas precisa ser investigado.
    console.error(`[ativar-conta] Falha ao marcar invite ${invite.id} como aceito:`, inviteUpdateError.message)
  }

  await logActivity(admin, {
    actorId: created.user.id,
    actorName: invite.name,
    actionType: "convite_aceito",
    entityType: invite.type === "administrador" ? "admin_profile" : "client_account",
    entityId: invite.type === "administrador" ? created.user.id : invite.client_account_id,
    description: `${invite.name} ativou a conta via convite (${invite.type}).`,
  })

  redirect("https://lauxai.vercel.app/login?ativado=1")
}
