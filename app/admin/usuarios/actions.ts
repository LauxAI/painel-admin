/**
 * Substitui integralmente: painel-admin/app/admin/usuarios/actions.ts
 *
 * Mudanças em relação ao original:
 *  - inviteClient: grava `plan` também em `companies` (hoje só ia para
 *    `client_accounts`), para o Client Dashboard exibir o plano correto.
 *    Se qualquer etapa posterior à criação da `company` falhar, a
 *    `company` (e, se já criado, o `client_account`) é revertida para
 *    evitar registro órfão.
 *  - updateClient: se o cliente já tiver `auth_user_id` (conta ativada),
 *    sincroniza `profiles.full_name`/`profiles.phone` — sem isso o admin
 *    edita o cadastro e o Client Dashboard continua com o nome antigo.
 *    O erro dessa sincronização é verificado e logado explicitamente,
 *    nunca silenciado.
 *  - updateClientPeriod: sincroniza `companies.plan` quando o admin troca
 *    o plano do cliente. O erro dessa sincronização é verificado e
 *    logado explicitamente.
 *  - deleteClient: remove a linha correspondente em `company_members`
 *    antes de excluir `client_accounts`, evitando um vínculo "fantasma"
 *    de equipe no Client Dashboard. O resultado dessa exclusão é
 *    verificado e logado. Em seguida remove o usuário do Supabase Auth
 *    (cascata em `profiles`/sessões), exceto se ele também for admin.
 *    `companies` é preservada para histórico.
 *  - Proteção do Owner Principal: o cliente cujo e-mail é
 *    OWNER_PRINCIPAL_EMAIL não pode ser removido, suspenso/alterado de
 *    status, ou ter seu vínculo de equipe removido, independentemente
 *    de qual admin executa a ação. A verificação é feita no servidor
 *    (nesta action), não depende de nenhuma validação de UI.
 *
 * Requer o schema criado por sql/001_schema_bootstrap_cliente.sql.
 */
"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { generateInviteToken } from "@/lib/invites"
import { logActivity } from "@/lib/log-activity"
import { PLAN_LABELS, type ClientPlan, type ClientStatus } from "@/lib/types"

export type ClientFormState = { error?: string; inviteUrl?: string } | null

const INVITE_TTL_DAYS = 7

/**
 * E-mail do Owner Principal do sistema. Este cliente não pode ser
 * removido, suspenso/ter o status alterado, nem perder seu vínculo de
 * equipe — por nenhum admin, independentemente de papel. A verificação é
 * hardcoded e server-side de propósito: não deve ser configurável via UI
 * ou banco, para que nenhum admin (incluindo outros owners) possa
 * remover essa proteção.
 */
const OWNER_PRINCIPAL_EMAIL = "vladmirbtc@gmail.com"

function isOwnerPrincipalEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_PRINCIPAL_EMAIL
}

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
    .insert({ name: companyName, plan })
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
    // Rollback: a company já foi criada, mas sem um client_account ela
    // fica órfã (nenhum cliente a referencia). Remove para não acumular
    // empresas fantasma.
    const { error: rollbackCompanyError } = await db.from("companies").delete().eq("id", company.id)
    if (rollbackCompanyError) {
      console.error(
        `[inviteClient] Falha ao reverter company órfã ${company.id} após erro em client_accounts:`,
        rollbackCompanyError,
      )
    }
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
    // Rollback: sem convite, o client_account criado é inutilizável (o
    // cliente nunca receberá um link de ativação). Reverte client_account
    // e company para não deixar nenhum dos dois órfão.
    const { error: rollbackClientError } = await db.from("client_accounts").delete().eq("id", client.id)
    if (rollbackClientError) {
      console.error(
        `[inviteClient] Falha ao reverter client_account ${client.id} após erro em invites:`,
        rollbackClientError,
      )
    }
    const { error: rollbackCompanyError } = await db.from("companies").delete().eq("id", company.id)
    if (rollbackCompanyError) {
      console.error(
        `[inviteClient] Falha ao reverter company ${company.id} após erro em invites:`,
        rollbackCompanyError,
      )
    }
    return { error: "Não foi possível gerar o convite. A operação foi revertida — tente novamente." }
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

  const { data: clientAccount } = await db
    .from("client_accounts")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle()

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

  // Mantém o Client Dashboard em dia com o cadastro. Se a conta ainda não
  // foi ativada (auth_user_id nulo), não há `profiles` para atualizar — a
  // sincronização acontece naturalmente na ativação.
  if (clientAccount?.auth_user_id) {
    const { error: profileSyncError } = await db
      .from("profiles")
      .update({ full_name: responsibleName, phone: whatsapp })
      .eq("id", clientAccount.auth_user_id)

    if (profileSyncError) {
      console.error(
        `[updateClient] client_accounts ${id} atualizado, mas falha ao sincronizar profiles ${clientAccount.auth_user_id}:`,
        profileSyncError,
      )
      return {
        error:
          "Dados do cliente salvos, mas houve falha ao sincronizar com o Client Dashboard. Tente novamente ou contate o suporte técnico.",
      }
    }
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

  const { data: before } = await db.from("client_accounts").select("status, email").eq("id", id).maybeSingle()

  if (status !== "ativo" && isOwnerPrincipalEmail(before?.email)) {
    throw new Error("O Owner Principal do sistema não pode ser suspenso ou ter o status alterado.")
  }

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
    metadata: { before: before?.status ?? null, after: status },
  })

  revalidatePath("/usuarios")
}

/**
 * Updates the client's plan and/or billing period (start/expiration dates).
 * Any valid date combination is accepted — there are no fixed-length
 * restrictions. Reuses the existing `client_accounts` columns; no schema
 * change required for this table. Also syncs `companies.plan`, que o Client
 * Dashboard lê (lib/data/adapters.ts -> toCompany).
 */
export async function updateClientPeriod(
  id: string,
  input: {
    plan: ClientPlan
    accountStartDate: string | null
    accountExpirationDate: string | null
  },
  clientName: string,
) {
  const admin = await getCurrentAdmin()
  const db = createAdminClient()

  if (input.accountStartDate && input.accountExpirationDate && input.accountStartDate > input.accountExpirationDate) {
    throw new Error("A data de início não pode ser depois da data de vencimento.")
  }

  const { data: before } = await db
    .from("client_accounts")
    .select("plan, account_start_date, account_expiration_date, company_id")
    .eq("id", id)
    .maybeSingle()

  const { error } = await db
    .from("client_accounts")
    .update({
      plan: input.plan,
      account_start_date: input.accountStartDate,
      account_expiration_date: input.accountExpirationDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error("Não foi possível atualizar o plano/período.")

  if (before?.company_id) {
    const { error: companySyncError } = await db
      .from("companies")
      .update({ plan: input.plan })
      .eq("id", before.company_id)

    if (companySyncError) {
      console.error(
        `[updateClientPeriod] client_accounts ${id} atualizado, mas falha ao sincronizar companies ${before.company_id}:`,
        companySyncError,
      )
      throw new Error(
        "Plano/período salvos, mas houve falha ao sincronizar com o Client Dashboard. Tente novamente ou contate o suporte técnico.",
      )
    }
  }

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "cliente_plano_alterado",
    entityType: "client_account",
    entityId: id,
    description: `${admin.name} alterou o plano de ${clientName} para "${PLAN_LABELS[input.plan]}" (${input.accountStartDate ?? "sem início"} → ${input.accountExpirationDate ?? "sem vencimento"}).`,
    metadata: {
      before: {
        plan: before?.plan ?? null,
        accountStartDate: before?.account_start_date ?? null,
        accountExpirationDate: before?.account_expiration_date ?? null,
      },
      after: {
        plan: input.plan,
        accountStartDate: input.accountStartDate,
        accountExpirationDate: input.accountExpirationDate,
      },
    },
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

  const { data: clientAccount } = await db
    .from("client_accounts")
    .select("company_id, auth_user_id, email")
    .eq("id", id)
    .maybeSingle()

  if (isOwnerPrincipalEmail(clientAccount?.email)) {
    throw new Error("O Owner Principal do sistema não pode ser removido.")
  }

  const { error } = await db.from("client_accounts").delete().eq("id", id)
  if (error) throw new Error("Não foi possível remover o cliente.")

  // A exclusão de `client_accounts` já corta o acesso imediatamente: o RLS e
  // o guard do Client Dashboard dependem de `current_client_company_id()`,
  // que exige uma linha ativa. Abaixo limpamos o restante do vínculo.
  if (clientAccount?.company_id && clientAccount?.auth_user_id) {
    const { error: memberDeleteError } = await db
      .from("company_members")
      .delete()
      .eq("company_id", clientAccount.company_id)
      .eq("user_id", clientAccount.auth_user_id)

    if (memberDeleteError) {
      console.error(
        `[deleteClient] client_accounts ${id} removido, mas falha ao remover vínculo em company_members (company ${clientAccount.company_id}, user ${clientAccount.auth_user_id}):`,
        memberDeleteError,
      )
    }
  }

  // Remove o login do cliente no Supabase Auth (cascata em `profiles`,
  // `company_members` e sessões/refresh tokens). `companies` e seus dados
  // operacionais são preservados para histórico. Se o mesmo usuário também
  // for administrador do painel, o login é mantido — apenas o vínculo de
  // cliente é removido, o que já bloqueia o Client Dashboard.
  let authUserRemoved = false
  if (clientAccount?.auth_user_id) {
    const { data: adminProfile } = await db
      .from("admin_profiles")
      .select("id")
      .eq("id", clientAccount.auth_user_id)
      .maybeSingle()

    if (!adminProfile) {
      const { error: authDeleteError } = await db.auth.admin.deleteUser(clientAccount.auth_user_id)
      if (authDeleteError) {
        console.error(
          `[deleteClient] client_accounts ${id} removido, mas falha ao remover usuário Auth ${clientAccount.auth_user_id}:`,
          authDeleteError,
        )
      } else {
        authUserRemoved = true
      }
    }
  }

  await logActivity(db, {
    actorId: admin.id,
    actorName: admin.name,
    metadata: { authUserId: clientAccount?.auth_user_id ?? null, authUserRemoved },
    actionType: "cliente_removido",
    entityType: "client_account",
    entityId: id,
    description: `${admin.name} removeu o cliente ${clientName}.`,
  })

  revalidatePath("/usuarios")
}
