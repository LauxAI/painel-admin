import { describe, expect, it } from "vitest"
import {
  AUDIT_DETAIL_COLUMNS,
  AUDIT_LIST_COLUMNS,
  decodeCursor,
  encodeCursor,
  getAuditEvent,
  listAuditEvents,
  listCorrelatedAuditEvents,
  sanitizeSearchTerm,
} from "@/lib/audit/query"
import { COMPANY_A, COMPANY_B, createQueryClient } from "./helpers"

const opsOf = (queries: ReturnType<typeof createQueryClient>["queries"]) => queries[0].ops

describe("consulta: isolamento multi-tenant", () => {
  it("escopo de empresa impõe company_id da empresa", async () => {
    const { client, queries } = createQueryClient()
    await listAuditEvents(client, { kind: "company", companyId: COMPANY_A })
    expect(opsOf(queries)).toContainEqual(["eq", "company_id", COMPANY_A])
  })

  it("filtro companyId não consegue sobrescrever o escopo de empresa", async () => {
    const { client, queries } = createQueryClient()
    await listAuditEvents(client, { kind: "company", companyId: COMPANY_A }, { filters: { companyId: COMPANY_B } })

    const companyFilters = opsOf(queries).filter(([op, column]) => op === "eq" && column === "company_id")
    expect(companyFilters).toEqual([["eq", "company_id", COMPANY_A]])
  })

  it("o mesmo vale para detalhe e fluxo correlacionado", async () => {
    const detail = createQueryClient({ data: [], error: null })
    await getAuditEvent(detail.client, { kind: "company", companyId: COMPANY_A }, "44444444-4444-4444-8444-444444444444")
    expect(opsOf(detail.queries)).toContainEqual(["eq", "company_id", COMPANY_A])

    const flow = createQueryClient()
    await listCorrelatedAuditEvents(flow.client, { kind: "company", companyId: COMPANY_A }, "corr-1")
    expect(opsOf(flow.queries)).toContainEqual(["eq", "company_id", COMPANY_A])
    expect(opsOf(flow.queries)).toContainEqual(["eq", "correlation_id", "corr-1"])
  })

  it("escopo de empresa com id inválido é recusado sem consultar o banco", async () => {
    const { client, queries } = createQueryClient()
    expect(await listAuditEvents(client, { kind: "company", companyId: "" })).toEqual({ ok: false, error: "invalid_scope" })
    expect(await listAuditEvents(client, { kind: "company", companyId: "abc" })).toEqual({ ok: false, error: "invalid_scope" })
    expect(queries).toHaveLength(0)
  })

  it("escopo admin sem filtro de empresa não restringe; com filtro, restringe", async () => {
    const all = createQueryClient()
    await listAuditEvents(all.client, { kind: "admin" })
    expect(opsOf(all.queries).some(([op, column]) => op === "eq" && column === "company_id")).toBe(false)

    const filtered = createQueryClient()
    await listAuditEvents(filtered.client, { kind: "admin" }, { filters: { companyId: COMPANY_B } })
    expect(opsOf(filtered.queries)).toContainEqual(["eq", "company_id", COMPANY_B])
  })
})

describe("consulta: colunas, filtros e paginação", () => {
  it("nunca usa select('*') e a listagem não traz metadata", async () => {
    const { client, queries } = createQueryClient()
    await listAuditEvents(client, { kind: "admin" })
    expect(queries[0].select).not.toBe("*")
    expect(queries[0].select?.split(",")).not.toContain("metadata")
    expect(AUDIT_LIST_COLUMNS).not.toContain("metadata")
    expect(AUDIT_DETAIL_COLUMNS).toContain("metadata")
  })

  it("aplica todos os filtros suportados", async () => {
    const { client, queries } = createQueryClient()
    await listAuditEvents(
      client,
      { kind: "admin" },
      {
        filters: {
          domain: "whatsapp",
          action: "whatsapp.message.failed",
          resourceType: "conversation",
          resourceId: "conv_1",
          actorType: "agent",
          status: "failed",
          severity: "error",
          provider: "meta",
          requestId: "req-1",
          correlationId: "corr-1",
          from: "2026-07-01T00:00:00Z",
          to: "2026-07-10T00:00:00Z",
          text: "falha",
        },
      },
    )
    const ops = opsOf(queries)
    for (const expected of [
      ["eq", "domain", "whatsapp"],
      ["eq", "action_type", "whatsapp.message.failed"],
      ["eq", "entity_type", "conversation"],
      ["eq", "entity_id", "conv_1"],
      ["eq", "actor_type", "agent"],
      ["eq", "status", "failed"],
      ["eq", "severity", "error"],
      ["eq", "provider", "meta"],
      ["eq", "request_id", "req-1"],
      ["eq", "correlation_id", "corr-1"],
      ["gte", "created_at", "2026-07-01T00:00:00Z"],
      ["lte", "created_at", "2026-07-10T00:00:00Z"],
    ]) {
      expect(ops).toContainEqual(expected)
    }
    expect(ops.some(([op, expr]) => op === "or" && String(expr).includes("description.ilike.%falha%"))).toBe(true)
  })

  it("ignora valores de enum inválidos em vez de montar filtros arbitrários", async () => {
    const { client, queries } = createQueryClient()
    await listAuditEvents(client, { kind: "admin" }, { filters: { status: "x" as never, severity: "y" as never, domain: "z" as never } })
    const columns = opsOf(queries).map(([, column]) => column)
    expect(columns).not.toContain("status")
    expect(columns).not.toContain("severity")
    expect(columns).not.toContain("domain")
  })

  it("neutraliza caracteres que alterariam a sintaxe do filtro de texto", () => {
    expect(sanitizeSearchTerm("a,b)(c%d*e\"f'g")).toBe("a b c d e f g")
    expect(sanitizeSearchTerm("description.eq.x")).not.toContain(".")
  })

  it("pagina por cursor: pede limit+1, ordena por (created_at, id) e devolve nextCursor", async () => {
    const rows = [3, 2, 1].map((n) => ({
      id: `00000000-0000-4000-8000-00000000000${n}`,
      created_at: `2026-07-0${n}T00:00:00.000Z`,
      action_type: "login",
      domain: null,
    }))
    const { client, queries } = createQueryClient({ data: rows, error: null })

    const result = await listAuditEvents(client, { kind: "admin" }, { limit: 2 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.items).toHaveLength(2)
    expect(result.data.nextCursor).not.toBeNull()
    expect(decodeCursor(result.data.nextCursor!)).toEqual({ t: rows[1].created_at, id: rows[1].id })
    expect(opsOf(queries)).toContainEqual(["limit", 3])
    expect(opsOf(queries)).toContainEqual(["order", "created_at", { ascending: false }])
    expect(opsOf(queries)).toContainEqual(["order", "id", { ascending: false }])
    // domínio de linhas legadas é resolvido pelo catálogo
    expect(result.data.items[0].domain).toBe("auth")
  })

  it("última página não devolve cursor; cursor é aplicado como keyset", async () => {
    const { client, queries } = createQueryClient({ data: [], error: null })
    const cursor = encodeCursor({ t: "2026-07-02T00:00:00.000Z", id: "00000000-0000-4000-8000-000000000002" })
    const result = await listAuditEvents(client, { kind: "admin" }, { cursor })

    expect(result).toMatchObject({ ok: true, data: { nextCursor: null } })
    expect(
      opsOf(queries).some(([op, expr]) => op === "or" && String(expr).startsWith("created_at.lt.2026-07-02T00:00:00.000Z,and(")),
    ).toBe(true)
  })

  it("cursor adulterado é recusado e limite é limitado ao máximo", async () => {
    const bad = createQueryClient()
    expect(await listAuditEvents(bad.client, { kind: "admin" }, { cursor: "lixo" })).toEqual({ ok: false, error: "invalid_cursor" })
    const forged = encodeCursor({ t: "2026-07-02", id: "x),or(company_id.neq.null" })
    expect(await listAuditEvents(bad.client, { kind: "admin" }, { cursor: forged })).toEqual({ ok: false, error: "invalid_cursor" })

    const big = createQueryClient()
    await listAuditEvents(big.client, { kind: "admin" }, { limit: 10_000 })
    expect(opsOf(big.queries)).toContainEqual(["limit", 101])
  })

  it("erro do banco vira resultado seguro sem a mensagem original", async () => {
    const { client } = createQueryClient({ data: null, error: { code: "42501", message: "permission denied for table activity_logs" } })
    const result = await listAuditEvents(client, { kind: "admin" })
    expect(result).toEqual({ ok: false, error: "query_failed" })
  })
})
