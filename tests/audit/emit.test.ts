import { describe, expect, it, vi } from "vitest"
import { AUDIT_ACTION_DOMAINS, AUDIT_DOMAINS, AUDIT_SEVERITIES, AUDIT_STATUSES, FUTURE_ACTION_DOMAINS } from "@/lib/audit/constants"
import { childOf, newCorrelationId } from "@/lib/audit/correlation"
import { emitAuditEventWith } from "@/lib/audit/emit"
import { createAuditEvent } from "@/lib/audit/event"
import { ADMIN_ID, COMPANY_A, FAKE_SECRETS, createInsertClient } from "./helpers"

const fixedNow = () => new Date("2026-07-10T12:00:00.000Z")

describe("criação de evento", () => {
  it("normaliza um evento completo para as colunas de activity_logs", () => {
    const created = createAuditEvent(
      {
        action: "ai.request.completed",
        description: "Gemini respondeu",
        companyId: COMPANY_A,
        actorType: "agent",
        actorId: ADMIN_ID,
        actorName: "Agente Atendimento",
        source: "whatsapp_webhook",
        provider: "gemini",
        resourceType: "conversation",
        resourceId: "conv_123",
        status: "success",
        severity: "info",
        requestId: "req-1",
        correlationId: "corr-1",
        errorCode: null,
        durationMs: 812.6,
        metadata: { input_tokens: 10 },
      },
      { now: fixedNow, generateId: () => "44444444-4444-4444-8444-444444444444" },
    )

    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.row).toEqual({
      id: "44444444-4444-4444-8444-444444444444",
      occurred_at: "2026-07-10T12:00:00.000Z",
      company_id: COMPANY_A,
      actor_type: "agent",
      actor_id: ADMIN_ID,
      actor_name: "Agente Atendimento",
      source: "whatsapp_webhook",
      domain: "ai",
      provider: "gemini",
      action_type: "ai.request.completed",
      entity_type: "conversation",
      entity_id: "conv_123",
      status: "success",
      severity: "info",
      description: "Gemini respondeu",
      metadata: { input_tokens: 10 },
      request_id: "req-1",
      correlation_id: "corr-1",
      parent_event_id: null,
      error_code: null,
      duration_ms: 813,
    })
    expect(created.warnings).toEqual([])
  })

  it("campos indeterminados permanecem NULL (nada é inventado)", () => {
    const created = createAuditEvent({ action: "evento.desconhecido" }, { now: fixedNow })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.row).toMatchObject({
      company_id: null,
      actor_type: null,
      actor_id: null,
      source: null,
      domain: null,
      provider: null,
      entity_type: null,
      entity_id: null,
      status: null,
      severity: null,
      request_id: null,
      correlation_id: null,
      parent_event_id: null,
      error_code: null,
      duration_ms: null,
      metadata: {},
    })
  })

  it("actor_name é NOT NULL no banco: usa rótulo do tipo de ator quando ausente", () => {
    const system = createAuditEvent({ action: "webhook.received", actorType: "webhook" })
    const unknown = createAuditEvent({ action: "webhook.received" })
    expect(system.ok && system.row.actor_name).toBe("Webhook")
    expect(unknown.ok && unknown.row.actor_name).toBe("Desconhecido")
  })

  it("actor_id que não é uuid vai para a metadata em vez de quebrar o insert", () => {
    const created = createAuditEvent({ action: "agent.created", actorType: "agent", actorId: "agent_abc" })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.row.actor_id).toBeNull()
    expect(created.row.metadata).toEqual({ actor_ref: "agent_abc" })
  })

  it("rejeita action inválida sem lançar exceção", () => {
    for (const action of ["", "   ", "tem espaço", "x".repeat(200), "<script>"]) {
      expect(createAuditEvent({ action })).toMatchObject({ ok: false, error: "invalid_event" })
    }
  })

  it("infere o domínio de eventos conhecidos e respeita o domínio explícito", () => {
    const inferred = createAuditEvent({ action: "appointment.created" })
    const explicit = createAuditEvent({ action: "appointment.created", domain: "crm" })
    expect(inferred.ok && inferred.row.domain).toBe("scheduling")
    expect(explicit.ok && explicit.row.domain).toBe("crm")
  })

  it("sanitiza descrição, actor_name e metadata na criação", () => {
    const created = createAuditEvent({
      action: "integration.error",
      actorName: `Fulano ${FAKE_SECRETS.openai}`,
      description: `Falha: Authorization: Bearer ${FAKE_SECRETS.jwt}`,
      metadata: { api_key: FAKE_SECRETS.openai },
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(JSON.stringify(created.row)).not.toContain(FAKE_SECRETS.openai)
    expect(JSON.stringify(created.row)).not.toContain(FAKE_SECRETS.jwt)
  })

  it("usa o contexto da requisição apenas quando o evento não informa o campo", () => {
    const fromContext = createAuditEvent({ action: "login" }, { context: { requestId: "ctx-req", correlationId: "ctx-corr" } })
    const explicit = createAuditEvent(
      { action: "login", requestId: "own-req" },
      { context: { requestId: "ctx-req", correlationId: "ctx-corr" } },
    )
    expect(fromContext.ok && [fromContext.row.request_id, fromContext.row.correlation_id]).toEqual(["ctx-req", "ctx-corr"])
    expect(explicit.ok && [explicit.row.request_id, explicit.row.correlation_id]).toEqual(["own-req", "ctx-corr"])
  })
})

describe("evento sem company_id", () => {
  it("é válido e fica global (NULL)", async () => {
    const { client, calls } = createInsertClient()
    const result = await emitAuditEventWith(client, { action: "configuracoes_atualizadas", actorType: "admin" })
    expect(result.ok).toBe(true)
    expect(calls[0].values.company_id).toBeNull()
  })

  it("company_id inválido não é gravado e gera aviso", () => {
    const created = createAuditEvent({ action: "login", companyId: "nao-e-uuid" })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.row.company_id).toBeNull()
    expect(created.warnings).toContain("company_id_invalid")
  })
})

describe("status", () => {
  it.each(AUDIT_STATUSES)("aceita status %s", (status) => {
    const created = createAuditEvent({ action: "webhook.received", status })
    expect(created.ok && created.row.status).toBe(status)
  })

  it("status inválido vira NULL com aviso; ausente permanece NULL", () => {
    const invalid = createAuditEvent({ action: "webhook.received", status: "ok" as never })
    const absent = createAuditEvent({ action: "webhook.received" })
    expect(invalid.ok && invalid.row.status).toBeNull()
    expect(invalid.warnings).toContain("status_invalid")
    expect(absent.ok && absent.row.status).toBeNull()
  })
})

describe("severity", () => {
  it.each(AUDIT_SEVERITIES)("aceita severity %s", (severity) => {
    const created = createAuditEvent({ action: "integration.error", severity })
    expect(created.ok && created.row.severity).toBe(severity)
  })

  it("severity inválida vira NULL com aviso", () => {
    const created = createAuditEvent({ action: "integration.error", severity: "fatal" as never })
    expect(created.ok && created.row.severity).toBeNull()
    expect(created.warnings).toContain("severity_invalid")
  })

  it("duration_ms negativo ou inválido vira NULL", () => {
    expect(createAuditEvent({ action: "login", durationMs: -5 }).warnings).toContain("duration_ms_invalid")
    expect(createAuditEvent({ action: "login", durationMs: Number.NaN }).warnings).toContain("duration_ms_invalid")
  })
})

describe("catálogo de eventos", () => {
  it("todo evento futuro usa um domínio padronizado", () => {
    for (const domain of Object.values(AUDIT_ACTION_DOMAINS)) {
      expect(AUDIT_DOMAINS).toContain(domain)
    }
    expect(Object.keys(FUTURE_ACTION_DOMAINS)).toHaveLength(52)
  })
})

describe("correlação", () => {
  it("encadeia eventos com o mesmo correlation_id e parent_event_id", async () => {
    const { client, calls } = createInsertClient()
    const correlationId = newCorrelationId()

    const inbound = await emitAuditEventWith(client, {
      action: "whatsapp.message.received",
      companyId: COMPANY_A,
      correlationId,
      requestId: "req-9",
    })
    expect(inbound.ok).toBe(true)
    if (!inbound.ok) return

    const reply = await emitAuditEventWith(client, {
      action: "whatsapp.agent.reply.started",
      companyId: COMPANY_A,
      ...childOf(inbound),
    })
    expect(reply.ok).toBe(true)
    if (!reply.ok) return

    const ai = await emitAuditEventWith(client, { action: "ai.request.started", ...childOf(reply) })

    expect(calls).toHaveLength(3)
    expect(calls.map((c) => c.values.correlation_id)).toEqual([correlationId, correlationId, correlationId])
    expect(calls[0].values.parent_event_id).toBeNull()
    expect(calls[1].values.parent_event_id).toBe(calls[0].values.id)
    expect(calls[2].values.parent_event_id).toBe(calls[1].values.id)
    expect(ai.ok).toBe(true)
  })

  it("se o evento pai falhou, o filho preserva o correlation_id e não aponta para pai inexistente", () => {
    expect(childOf({ ok: false, error: "persist_failed", warnings: [] }, "corr-x")).toEqual({
      correlationId: "corr-x",
      parentEventId: null,
    })
  })

  it("parent_event_id inválido é descartado com aviso", () => {
    const created = createAuditEvent({ action: "login", parentEventId: "x" })
    expect(created.ok && created.row.parent_event_id).toBeNull()
    expect(created.warnings).toContain("parent_event_id_invalid")
  })
})

describe("persistência", () => {
  it("devolve resultado seguro quando o banco falha (sem vazar a mensagem do banco)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { client } = createInsertClient([{ code: "23505", message: `duplicate key value ${FAKE_SECRETS.serviceRole}` }])

    const result = await emitAuditEventWith(client, { action: "login" })

    expect(result).toEqual({ ok: false, error: "persist_failed", warnings: [] })
    expect(JSON.stringify(result)).not.toContain(FAKE_SECRETS.serviceRole)
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(FAKE_SECRETS.serviceRole)
    errorSpy.mockRestore()
  })

  it("não lança exceção quando o cliente lança", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const client = {
      from() {
        throw new Error("rede indisponível")
      },
    } as never

    await expect(emitAuditEventWith(client, { action: "login" })).resolves.toMatchObject({ ok: false, error: "persist_failed" })
    errorSpy.mockRestore()
  })

  it("não lança com entrada inválida", async () => {
    const { client, calls } = createInsertClient()
    await expect(emitAuditEventWith(client, { action: "" })).resolves.toMatchObject({ ok: false, error: "invalid_event" })
    await expect(emitAuditEventWith(client, null as never)).resolves.toMatchObject({ ok: false })
    expect(calls).toHaveLength(0)
  })

  it("sem a migration (coluna inexistente) regrava no formato legado sem perder os campos novos", async () => {
    const { client, calls } = createInsertClient([{ code: "PGRST204", message: "column not found" }])

    const result = await emitAuditEventWith(client, {
      action: "whatsapp.message.failed",
      companyId: COMPANY_A,
      status: "failed",
      severity: "error",
      metadata: { reason: "timeout" },
    })

    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(2)
    const legacy = calls[1].values
    expect(Object.keys(legacy).sort()).toEqual(
      ["action_type", "actor_id", "actor_name", "description", "entity_id", "entity_type", "id", "metadata"].sort(),
    )
    expect(legacy.metadata).toMatchObject({
      reason: "timeout",
      _audit: { company_id: COMPANY_A, status: "failed", severity: "error", domain: "whatsapp" },
    })
  })

  it("o resultado persistido nunca contém secrets conhecidos", async () => {
    const { client, calls } = createInsertClient()
    await emitAuditEventWith(
      client,
      {
        action: "integration.connection_failed",
        description: `Falha com ${FAKE_SECRETS.gemini}`,
        actorName: FAKE_SECRETS.openai,
        metadata: {
          token: FAKE_SECRETS.whatsapp,
          headers: { authorization: `Bearer ${FAKE_SECRETS.jwt}` },
          detalhe: `${FAKE_SECRETS.serviceRole} ${FAKE_SECRETS.webhookSecret} ${FAKE_SECRETS.password}`,
        },
      },
      { knownSecrets: [FAKE_SECRETS.serviceRole, FAKE_SECRETS.password] },
    )

    const persisted = JSON.stringify(calls)
    for (const secret of Object.values(FAKE_SECRETS)) {
      expect(persisted).not.toContain(secret)
    }
  })
})
