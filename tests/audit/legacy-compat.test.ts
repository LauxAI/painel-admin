import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ACTIVITY_ACTION_LABELS } from "@/lib/activity-labels"
import { AUDIT_DOMAINS, LEGACY_ACTION_DOMAINS } from "@/lib/audit/constants"
import { logActivity } from "@/lib/log-activity"
import { ADMIN_ID, FAKE_SECRETS, createInsertClient } from "./helpers"

/** Eventos administrativos que o painel emite hoje e que devem continuar funcionando. */
const EXISTING_ACTIONS = [
  "login",
  "auth.logout",
  "configuracao_inicial",
  "senha_atualizada",
  "perfil_atualizado",
  "cliente_convidado",
  "cliente_atualizado",
  "cliente_status_alterado",
  "cliente_plano_alterado",
  "cliente_removido",
  "convite_reenviado",
  "convite_aceito",
  "administrador_convidado",
  "administrador_funcao_alterada",
  "administrador_status_alterado",
  "administrador_removido",
  "convite_cancelado",
  "configuracoes_atualizadas",
  "planos_financeiros_atualizados",
]

const LEGACY_COLUMNS = ["action_type", "actor_id", "actor_name", "description", "entity_id", "entity_type", "metadata"]

describe("compatibilidade com logs administrativos existentes", () => {
  it.each(EXISTING_ACTIONS)("logActivity('%s') grava somente as colunas originais, com os mesmos valores", async (actionType) => {
    const { client, calls } = createInsertClient()

    await logActivity(client as unknown as SupabaseClient, {
      actorId: ADMIN_ID,
      actorName: "Maria Admin",
      actionType,
      entityType: "client_account",
      entityId: ADMIN_ID,
      description: "Descrição legada",
      metadata: { before: "ativo", after: "suspenso" },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe("activity_logs")
    expect(Object.keys(calls[0].values).sort()).toEqual(LEGACY_COLUMNS)
    expect(calls[0].values).toEqual({
      actor_id: ADMIN_ID,
      actor_name: "Maria Admin",
      action_type: actionType,
      entity_type: "client_account",
      entity_id: ADMIN_ID,
      description: "Descrição legada",
      metadata: { before: "ativo", after: "suspenso" },
    })
  })

  it("campos opcionais ausentes continuam NULL e metadata padrão é {}", async () => {
    const { client, calls } = createInsertClient()
    await logActivity(client as unknown as SupabaseClient, {
      actorId: null,
      actorName: "Sistema",
      actionType: "login",
      description: "Login realizado",
    })
    expect(calls[0].values).toMatchObject({ actor_id: null, entity_type: null, entity_id: null, metadata: {} })
  })

  it("todos os eventos existentes têm domínio padronizado e rótulo preservado", () => {
    for (const action of EXISTING_ACTIONS) {
      expect(AUDIT_DOMAINS).toContain(LEGACY_ACTION_DOMAINS[action as keyof typeof LEGACY_ACTION_DOMAINS])
      expect(ACTIVITY_ACTION_LABELS[action]).toBeTruthy()
    }
    expect(ACTIVITY_ACTION_LABELS.login).toBe("Login")
    expect(ACTIVITY_ACTION_LABELS["auth.logout"]).toBe("Logout")
  })

  it("passa a sanitizar a metadata legada sem afetar chaves existentes", async () => {
    const { client, calls } = createInsertClient()
    await logActivity(client as unknown as SupabaseClient, {
      actorId: ADMIN_ID,
      actorName: "Maria Admin",
      actionType: "configuracoes_atualizadas",
      description: "Atualizou configurações",
      metadata: { before: "a", after: "b", api_key: FAKE_SECRETS.openai },
    })
    expect(calls[0].values.metadata).toEqual({ before: "a", after: "b", api_key: "[REDACTED]" })
  })

  it("falha de gravação do log não lança nem interrompe a operação principal", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const failing = createInsertClient([{ code: "42501", message: "permission denied" }])
    await expect(
      logActivity(failing.client as unknown as SupabaseClient, {
        actorId: ADMIN_ID,
        actorName: "Maria Admin",
        actionType: "login",
        description: "Login",
      }),
    ).resolves.toBeUndefined()

    const throwing = {
      from() {
        throw new Error("rede")
      },
    } as unknown as SupabaseClient
    await expect(
      logActivity(throwing, { actorId: null, actorName: "x", actionType: "login", description: "Login" }),
    ).resolves.toBeUndefined()

    errorSpy.mockRestore()
  })
})
