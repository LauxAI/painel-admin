import type {
  AuditActorType,
  AuditDomain,
  AuditSeverity,
  AuditStatus,
  KnownAuditAction,
} from "@/lib/audit/constants"

/**
 * Evento de auditoria como recebido pelos módulos. Tudo é opcional, exceto
 * `action`: o que não puder ser determinado fica NULL (nada é inventado).
 */
export interface AuditEventInput {
  /** Nome do evento. Eventos conhecidos têm autocomplete; outros nomes são aceitos se válidos. */
  action: KnownAuditAction | (string & {})
  description?: string | null
  occurredAt?: Date | string | null
  companyId?: string | null

  actorType?: AuditActorType | null
  actorId?: string | null
  actorName?: string | null

  /** Origem técnica do evento (ex.: "admin_panel", "whatsapp_webhook"). */
  source?: string | null
  domain?: AuditDomain | null
  /** Provedor externo envolvido (ex.: "gemini", "meta", "make"). */
  provider?: string | null

  resourceType?: string | null
  resourceId?: string | null

  status?: AuditStatus | null
  severity?: AuditSeverity | null

  requestId?: string | null
  correlationId?: string | null
  parentEventId?: string | null

  errorCode?: string | null
  durationMs?: number | null

  /** Metadata livre; sempre sanitizada no servidor antes de gravar. */
  metadata?: Record<string, unknown> | null
}

/** Linha da tabela `activity_logs` já normalizada e pronta para persistir. */
export interface AuditEventRow {
  id: string
  occurred_at: string
  company_id: string | null
  actor_type: AuditActorType | null
  actor_id: string | null
  actor_name: string
  source: string | null
  domain: AuditDomain | null
  provider: string | null
  action_type: string
  entity_type: string | null
  entity_id: string | null
  status: AuditStatus | null
  severity: AuditSeverity | null
  description: string
  metadata: Record<string, unknown>
  request_id: string | null
  correlation_id: string | null
  parent_event_id: string | null
  error_code: string | null
  duration_ms: number | null
}

/** Colunas que já existiam antes da fundação (compatíveis com o schema original). */
export const LEGACY_COLUMNS = [
  "id",
  "actor_id",
  "actor_name",
  "action_type",
  "entity_type",
  "entity_id",
  "description",
  "metadata",
] as const
export type LegacyColumn = (typeof LEGACY_COLUMNS)[number]

export type AuditFailureCode = "invalid_event" | "persist_failed" | "unexpected_error"

/** Resultado seguro: nunca contém mensagens cruas do banco nem segredos. */
export type AuditEmitResult =
  | { ok: true; id: string; correlationId: string | null; warnings: string[] }
  | { ok: false; error: AuditFailureCode; warnings: string[] }

/** Contexto ambiente (ex.: cabeçalhos da requisição) usado como fallback para campos não informados. */
export interface AuditContext {
  requestId?: string | null
  correlationId?: string | null
  source?: string | null
}
