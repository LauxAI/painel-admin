import { resolveCompanyNameSnapshot } from "@/lib/audit/company"
import { createAuditEvent, type CreateAuditEventOptions } from "@/lib/audit/event"
import { persistAuditRow, type AuditDbClient } from "@/lib/audit/persist"
import type { AuditEmitResult, AuditEventInput } from "@/lib/audit/types"

/**
 * Emissor central (puro, com cliente injetado): cria -> sanitiza -> persiste.
 * Nunca lança exceção e nunca devolve mensagens cruas do banco.
 * A versão ligada ao ambiente do servidor está em `lib/audit/server.ts`.
 */
export async function emitAuditEventWith(
  client: AuditDbClient,
  input: AuditEventInput,
  options: CreateAuditEventOptions = {},
): Promise<AuditEmitResult> {
  try {
    const created = createAuditEvent(input, options)
    if (!created.ok) {
      return { ok: false, error: "invalid_event", warnings: created.warnings }
    }

    let row = created.row
    if (row.company_id) {
      const snapshot = await resolveCompanyNameSnapshot(client, row.company_id, { knownSecrets: options.knownSecrets })
      if (snapshot) row = { ...row, company_name_snapshot: snapshot }
    }

    const outcome = await persistAuditRow(client, row)
    if (!outcome.ok) {
      return { ok: false, error: "persist_failed", warnings: created.warnings }
    }

    return {
      ok: true,
      id: row.id,
      correlationId: row.correlation_id,
      warnings: created.warnings,
    }
  } catch {
    return { ok: false, error: "unexpected_error", warnings: [] }
  }
}
