import type { SupabaseClient } from "@supabase/supabase-js"
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_DOMAINS,
  AUDIT_SEVERITIES,
  AUDIT_STATUSES,
  type AuditActorType,
  type AuditDomain,
  type AuditSeverity,
  type AuditStatus,
} from "@/lib/audit/constants"
import { inferDomain, isUuid } from "@/lib/audit/event"
import type { AuditEventRow } from "@/lib/audit/types"

/**
 * Consulta centralizada de eventos para o Admin.
 * - Nunca usa `select("*")`: a listagem não traz `metadata`; o detalhe pede explicitamente.
 * - Paginação por cursor (keyset em created_at + id), estável e eficiente em tabelas grandes.
 * - O isolamento por empresa é decidido pelo `scope`, nunca pelos filtros.
 *
 * O cliente recebido deve ser o de sessão do usuário (RLS aplicada). Esta camada
 * é uma segunda barreira, não substitui a RLS.
 */

export type AuditQueryClient = Pick<SupabaseClient, "from">

/** `admin`: visão global (somente administradores autorizados via RLS). `company`: restrito a uma empresa. */
export type AuditQueryScope = { kind: "admin" } | { kind: "company"; companyId: string }

export interface AuditEventFilters {
  /** Só é considerado no escopo `admin`; no escopo `company` o filtro de empresa é imposto pelo escopo. */
  companyId?: string
  domain?: AuditDomain | AuditDomain[]
  action?: string
  resourceType?: string
  resourceId?: string
  actorType?: AuditActorType
  actorId?: string
  status?: AuditStatus
  severity?: AuditSeverity
  from?: string
  to?: string
  provider?: string
  requestId?: string
  correlationId?: string
  text?: string
}

export const AUDIT_LIST_COLUMNS = [
  "id",
  "created_at",
  "occurred_at",
  "company_id",
  "actor_type",
  "actor_id",
  "actor_name",
  "source",
  "domain",
  "provider",
  "action_type",
  "entity_type",
  "entity_id",
  "status",
  "severity",
  "description",
  "request_id",
  "correlation_id",
  "parent_event_id",
  "error_code",
  "duration_ms",
] as const

export const AUDIT_DETAIL_COLUMNS = [...AUDIT_LIST_COLUMNS, "metadata"] as const

export const AUDIT_DEFAULT_PAGE_SIZE = 25
export const AUDIT_MAX_PAGE_SIZE = 100

export type AuditListItem = Omit<AuditEventRow, "metadata" | "occurred_at"> & {
  created_at: string
  occurred_at: string | null
}
export type AuditDetail = AuditListItem & { metadata: Record<string, unknown> }

export interface AuditPage {
  items: AuditListItem[]
  nextCursor: string | null
}

export type AuditQueryResult<T> = { ok: true; data: T } | { ok: false; error: "invalid_scope" | "invalid_cursor" | "query_failed" }

interface Cursor {
  t: string
  id: string
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")
}

export function decodeCursor(value: string): Cursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>
    if (typeof parsed.t !== "string" || Number.isNaN(Date.parse(parsed.t)) || !isUuid(parsed.id)) return null
    return { t: parsed.t, id: parsed.id }
  } catch {
    return null
  }
}

/** Remove caracteres que alterariam a sintaxe de `.or()` / `ilike` do PostgREST. */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_,()*"'\\:.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
}

/** Completa o domínio de linhas legadas (NULL) a partir do catálogo de ações conhecidas. */
function withResolvedDomain<T extends { domain: AuditDomain | null; action_type: string }>(row: T): T {
  return row.domain ? row : { ...row, domain: inferDomain(row.action_type) }
}

const asArray = <T,>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value])

// Tipagem do query builder é propositalmente frouxa: a lista de colunas é dinâmica.
/* eslint-disable @typescript-eslint/no-explicit-any */
function applyFilters(query: any, scope: AuditQueryScope, filters: AuditEventFilters): any {
  let q = query

  const companyId = scope.kind === "company" ? scope.companyId : filters.companyId
  if (companyId) q = q.eq("company_id", companyId)

  const domains = asArray(filters.domain).filter((d) => (AUDIT_DOMAINS as readonly string[]).includes(d))
  if (domains.length === 1) q = q.eq("domain", domains[0])
  else if (domains.length > 1) q = q.in("domain", domains)

  if (filters.action) q = q.eq("action_type", filters.action)
  if (filters.resourceType) q = q.eq("entity_type", filters.resourceType)
  if (filters.resourceId) q = q.eq("entity_id", filters.resourceId)
  if (filters.actorType && (AUDIT_ACTOR_TYPES as readonly string[]).includes(filters.actorType)) {
    q = q.eq("actor_type", filters.actorType)
  }
  if (filters.actorId && isUuid(filters.actorId)) q = q.eq("actor_id", filters.actorId)
  if (filters.status && (AUDIT_STATUSES as readonly string[]).includes(filters.status)) q = q.eq("status", filters.status)
  if (filters.severity && (AUDIT_SEVERITIES as readonly string[]).includes(filters.severity)) {
    q = q.eq("severity", filters.severity)
  }
  if (filters.provider) q = q.eq("provider", filters.provider)
  if (filters.requestId) q = q.eq("request_id", filters.requestId)
  if (filters.correlationId) q = q.eq("correlation_id", filters.correlationId)
  if (filters.from) q = q.gte("created_at", filters.from)
  if (filters.to) q = q.lte("created_at", filters.to)

  const term = filters.text ? sanitizeSearchTerm(filters.text) : ""
  if (term) q = q.or(`description.ilike.%${term}%,actor_name.ilike.%${term}%,action_type.ilike.%${term}%`)

  return q
}

function scopeIsValid(scope: AuditQueryScope): boolean {
  return scope.kind === "admin" || (scope.kind === "company" && isUuid(scope.companyId))
}

export async function listAuditEvents(
  client: AuditQueryClient,
  scope: AuditQueryScope,
  options: { filters?: AuditEventFilters; cursor?: string | null; limit?: number } = {},
): Promise<AuditQueryResult<AuditPage>> {
  if (!scopeIsValid(scope)) return { ok: false, error: "invalid_scope" }

  const limit = Math.min(Math.max(Math.trunc(options.limit ?? AUDIT_DEFAULT_PAGE_SIZE) || AUDIT_DEFAULT_PAGE_SIZE, 1), AUDIT_MAX_PAGE_SIZE)

  let query: any = client.from("activity_logs").select(AUDIT_LIST_COLUMNS.join(","))
  query = applyFilters(query, scope, options.filters ?? {})

  if (options.cursor) {
    const cursor = decodeCursor(options.cursor)
    if (!cursor) return { ok: false, error: "invalid_cursor" }
    query = query.or(`created_at.lt.${cursor.t},and(created_at.eq.${cursor.t},id.lt.${cursor.id})`)
  }

  // Busca limit + 1 para saber se existe próxima página sem fazer count(*).
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1)

  if (error || !Array.isArray(data)) return { ok: false, error: "query_failed" }

  const rows = data as AuditListItem[]
  const pageRows = rows.slice(0, limit)
  const last = pageRows[pageRows.length - 1]
  const nextCursor = rows.length > limit && last ? encodeCursor({ t: last.created_at, id: last.id }) : null

  return { ok: true, data: { items: pageRows.map(withResolvedDomain), nextCursor } }
}

/** Detalhe de um evento, incluindo a metadata (já sanitizada na gravação). */
export async function getAuditEvent(
  client: AuditQueryClient,
  scope: AuditQueryScope,
  id: string,
): Promise<AuditQueryResult<AuditDetail | null>> {
  if (!scopeIsValid(scope)) return { ok: false, error: "invalid_scope" }
  if (!isUuid(id)) return { ok: true, data: null }

  let query: any = client.from("activity_logs").select(AUDIT_DETAIL_COLUMNS.join(",")).eq("id", id)
  query = applyFilters(query, scope, {})
  const { data, error } = await query.maybeSingle()

  if (error) return { ok: false, error: "query_failed" }
  return { ok: true, data: data ? withResolvedDomain(data as AuditDetail) : null }
}

/** Todos os eventos de um fluxo correlacionado, em ordem cronológica. */
export async function listCorrelatedAuditEvents(
  client: AuditQueryClient,
  scope: AuditQueryScope,
  correlationId: string,
  limit = AUDIT_MAX_PAGE_SIZE,
): Promise<AuditQueryResult<AuditListItem[]>> {
  if (!scopeIsValid(scope)) return { ok: false, error: "invalid_scope" }

  let query: any = client.from("activity_logs").select(AUDIT_LIST_COLUMNS.join(","))
  query = applyFilters(query, scope, { correlationId })
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), AUDIT_MAX_PAGE_SIZE))

  if (error || !Array.isArray(data)) return { ok: false, error: "query_failed" }
  return { ok: true, data: (data as AuditListItem[]).map(withResolvedDomain) }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
