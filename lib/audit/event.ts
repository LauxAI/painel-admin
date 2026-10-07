import { activityActionLabel } from "@/lib/activity-labels"
import {
  AUDIT_ACTION_DOMAINS,
  AUDIT_ACTOR_TYPES,
  AUDIT_DOMAINS,
  AUDIT_LIMITS,
  AUDIT_SEVERITIES,
  AUDIT_STATUSES,
  DEFAULT_ACTOR_NAMES,
  type AuditActorType,
  type AuditDomain,
} from "@/lib/audit/constants"
import { sanitizeMetadata, sanitizeText, type RedactionOptions } from "@/lib/audit/redaction"
import type { AuditContext, AuditEventInput, AuditEventRow } from "@/lib/audit/types"

/**
 * Criação do evento: validação + normalização. Não faz I/O.
 * Valores inválidos de campos opcionais viram NULL e geram um aviso;
 * apenas uma `action` inválida impede a criação do evento.
 */

export interface CreateAuditEventOptions extends RedactionOptions {
  context?: AuditContext
  now?: () => Date
  generateId?: () => string
}

export type CreateAuditEventResult =
  | { ok: true; row: AuditEventRow; warnings: string[] }
  | { ok: false; error: "invalid_event"; warnings: string[] }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTION_PATTERN = /^[A-Za-z0-9_]+(?:[._-][A-Za-z0-9_]+)*$/
const IDENTIFIER_PATTERN = /^[A-Za-z0-9._:\-/]+$/
const SLUG_PATTERN = /^[a-z0-9][a-z0-9_.:-]*$/i

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID_PATTERN.test(value)

function pickEnum<T extends string>(
  field: string,
  value: unknown,
  allowed: readonly T[],
  warnings: string[],
): T | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T
  warnings.push(`${field}_invalid`)
  return null
}

function pickMatching(
  field: string,
  value: unknown,
  pattern: RegExp,
  warnings: string[],
  maxLength: number = AUDIT_LIMITS.identifierMaxLength,
): string | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "string" && value.length <= maxLength && pattern.test(value)) return value
  warnings.push(`${field}_invalid`)
  return null
}

function pickUuid(field: string, value: unknown, warnings: string[]): string | null {
  if (value === null || value === undefined || value === "") return null
  if (isUuid(value)) return value
  warnings.push(`${field}_invalid`)
  return null
}

function resolveOccurredAt(value: AuditEventInput["occurredAt"], now: Date, warnings: string[]): string {
  if (value === null || value === undefined) return now.toISOString()
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    warnings.push("occurred_at_invalid")
    return now.toISOString()
  }
  return date.toISOString()
}

/** Domínio a partir do catálogo de eventos conhecidos; desconhecidos retornam null. */
export function inferDomain(action: string): AuditDomain | null {
  return AUDIT_ACTION_DOMAINS[action] ?? null
}

export function createAuditEvent(input: AuditEventInput, options: CreateAuditEventOptions = {}): CreateAuditEventResult {
  const warnings: string[] = []
  const redaction: RedactionOptions = { knownSecrets: options.knownSecrets }

  const action = typeof input.action === "string" ? input.action.trim() : ""
  if (!action || action.length > AUDIT_LIMITS.actionMaxLength || !ACTION_PATTERN.test(action)) {
    return { ok: false, error: "invalid_event", warnings: ["action_invalid"] }
  }

  const now = (options.now ?? (() => new Date()))()
  const context = options.context ?? {}

  const actorType = pickEnum<AuditActorType>("actor_type", input.actorType, AUDIT_ACTOR_TYPES, warnings)
  const metadata = sanitizeMetadata(input.metadata, redaction)

  // actor_id é uuid no banco; outros formatos (ex.: id de agente) vão para a metadata, nunca descartados em silêncio.
  let actorId: string | null = null
  if (input.actorId) {
    if (isUuid(input.actorId)) {
      actorId = input.actorId
    } else {
      metadata.actor_ref = sanitizeText(String(input.actorId), AUDIT_LIMITS.identifierMaxLength, redaction)
    }
  }

  const actorName = input.actorName?.trim()
    ? sanitizeText(input.actorName.trim(), AUDIT_LIMITS.identifierMaxLength, redaction)
    : DEFAULT_ACTOR_NAMES[actorType ?? "unknown"]

  const description = input.description?.trim()
    ? sanitizeText(input.description.trim(), AUDIT_LIMITS.descriptionMaxLength, redaction)
    : activityActionLabel(action)

  let durationMs: number | null = null
  if (input.durationMs !== null && input.durationMs !== undefined) {
    if (Number.isFinite(input.durationMs) && input.durationMs >= 0) {
      durationMs = Math.min(Math.round(input.durationMs), 2_147_483_647)
    } else {
      warnings.push("duration_ms_invalid")
    }
  }

  const domain =
    pickEnum<AuditDomain>("domain", input.domain, AUDIT_DOMAINS, warnings) ?? inferDomain(action)

  const row: AuditEventRow = {
    id: options.generateId ? options.generateId() : crypto.randomUUID(),
    occurred_at: resolveOccurredAt(input.occurredAt, now, warnings),
    company_id: pickUuid("company_id", input.companyId, warnings),
    actor_type: actorType,
    actor_id: actorId,
    actor_name: actorName,
    source: pickMatching("source", input.source ?? context.source, SLUG_PATTERN, warnings, 64),
    domain,
    provider: pickMatching("provider", input.provider, SLUG_PATTERN, warnings, 64),
    action_type: action,
    entity_type: pickMatching("resource_type", input.resourceType, SLUG_PATTERN, warnings, 64),
    entity_id: pickMatching("resource_id", input.resourceId, IDENTIFIER_PATTERN, warnings),
    status: pickEnum("status", input.status, AUDIT_STATUSES, warnings),
    severity: pickEnum("severity", input.severity, AUDIT_SEVERITIES, warnings),
    description,
    metadata,
    request_id: pickMatching("request_id", input.requestId ?? context.requestId, IDENTIFIER_PATTERN, warnings),
    correlation_id: pickMatching(
      "correlation_id",
      input.correlationId ?? context.correlationId,
      IDENTIFIER_PATTERN,
      warnings,
    ),
    parent_event_id: pickUuid("parent_event_id", input.parentEventId, warnings),
    error_code: pickMatching("error_code", input.errorCode, IDENTIFIER_PATTERN, warnings, 64),
    duration_ms: durationMs,
  }

  return { ok: true, row, warnings }
}
