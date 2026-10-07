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

    const outcome = await persistAuditRow(client, created.row)
    if (!outcome.ok) {
      return { ok: false, error: "persist_failed", warnings: created.warnings }
    }

    return {
      ok: true,
      id: created.row.id,
      correlationId: created.row.correlation_id,
      warnings: created.warnings,
    }
  } catch {
    return { ok: false, error: "unexpected_error", warnings: [] }
  }
}
