import type { SupabaseClient } from "@supabase/supabase-js"
import type { AuditEventRow, LegacyColumn } from "@/lib/audit/types"
import { LEGACY_COLUMNS } from "@/lib/audit/types"

/**
 * Persistência: único ponto que grava em `activity_logs`.
 * Recebe linhas já normalizadas e sanitizadas (ver event.ts / redaction.ts).
 */

export type AuditDbClient = Pick<SupabaseClient, "from">

export type PersistOutcome = { ok: true; usedLegacyShape: boolean } | { ok: false }

/** Códigos que indicam coluna inexistente (migration da fundação ainda não aplicada). */
const MISSING_COLUMN_CODES = new Set(["PGRST204", "42703"])

function toLegacyShape(row: AuditEventRow): Pick<AuditEventRow, LegacyColumn> {
  const legacy = Object.fromEntries(LEGACY_COLUMNS.map((column) => [column, row[column]])) as Pick<
    AuditEventRow,
    LegacyColumn
  >

  // Campos novos não são descartados: ficam sob `_audit` na metadata até a migration ser aplicada.
  const extended = {
    occurred_at: row.occurred_at,
    company_id: row.company_id,
    actor_type: row.actor_type,
    source: row.source,
    domain: row.domain,
    provider: row.provider,
    status: row.status,
    severity: row.severity,
    request_id: row.request_id,
    correlation_id: row.correlation_id,
    parent_event_id: row.parent_event_id,
    error_code: row.error_code,
    duration_ms: row.duration_ms,
  }
  const defined = Object.fromEntries(Object.entries(extended).filter(([, value]) => value !== null))
  return {
    ...legacy,
    metadata: Object.keys(defined).length > 0 ? { ...row.metadata, _audit: defined } : row.metadata,
  }
}

/** Grava no formato completo; se as colunas novas ainda não existem, grava no formato legado. */
export async function persistAuditRow(client: AuditDbClient, row: AuditEventRow): Promise<PersistOutcome> {
  try {
    const { error } = await client.from("activity_logs").insert(row)
    if (!error) return { ok: true, usedLegacyShape: false }

    if (error.code && MISSING_COLUMN_CODES.has(error.code)) {
      const { error: legacyError } = await client.from("activity_logs").insert(toLegacyShape(row))
      if (!legacyError) return { ok: true, usedLegacyShape: true }
      console.error("[audit] persist failed", { action: row.action_type, code: legacyError.code ?? null })
      return { ok: false }
    }

    console.error("[audit] persist failed", { action: row.action_type, code: error.code ?? null })
    return { ok: false }
  } catch {
    console.error("[audit] persist threw", { action: row.action_type })
    return { ok: false }
  }
}

/**
 * Grava usando somente as colunas que existiam antes da fundação.
 * Usado por `logActivity`, para que os fluxos atuais do painel não dependam da migration.
 */
export async function persistLegacyRow(client: AuditDbClient, row: Omit<AuditEventRow, "id"> & { id?: string }): Promise<PersistOutcome> {
  try {
    const { error } = await client.from("activity_logs").insert({
      actor_id: row.actor_id,
      actor_name: row.actor_name,
      action_type: row.action_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      description: row.description,
      metadata: row.metadata,
    })
    if (error) {
      console.error("[audit] legacy persist failed", { action: row.action_type, code: error.code ?? null })
      return { ok: false }
    }
    return { ok: true, usedLegacyShape: true }
  } catch {
    console.error("[audit] legacy persist threw", { action: row.action_type })
    return { ok: false }
  }
}
