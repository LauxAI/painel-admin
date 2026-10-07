import type { SupabaseClient } from "@supabase/supabase-js"
import { createAuditEvent } from "@/lib/audit/event"
import { persistLegacyRow } from "@/lib/audit/persist"
import { collectKnownSecrets } from "@/lib/audit/redaction"

interface LogActivityParams {
  actorId: string | null
  actorName: string
  actionType: string
  entityType?: string
  entityId?: string
  description: string
  metadata?: Record<string, unknown>
}

/**
 * API legada usada pelos fluxos atuais do painel. Mantém a assinatura e grava
 * somente nas colunas originais de `activity_logs` (não depende da migration 001),
 * mas passa pela mesma normalização e sanitização da fundação de auditoria.
 * Falhas de log nunca interrompem a operação principal.
 */
export async function logActivity(supabase: SupabaseClient, params: LogActivityParams) {
  const created = createAuditEvent(
    {
      action: params.actionType,
      actorId: params.actorId,
      actorName: params.actorName,
      resourceType: params.entityType,
      resourceId: params.entityId,
      description: params.description,
      metadata: params.metadata,
    },
    { knownSecrets: collectKnownSecrets(process.env) },
  )
  if (!created.ok) return

  await persistLegacyRow(supabase, created.row)
}
