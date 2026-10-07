import { headers } from "next/headers"
import { emitAuditEventWith } from "@/lib/audit/emit"
import { collectKnownSecrets } from "@/lib/audit/redaction"
import type { AuditContext, AuditEmitResult, AuditEventInput } from "@/lib/audit/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AuditDbClient } from "@/lib/audit/persist"

/**
 * Entrada oficial para emitir eventos a partir de Server Actions, Route Handlers
 * e jobs. Server-only: usa o cliente service-role e variáveis de ambiente.
 *
 * - Contexto da requisição (x-request-id / x-correlation-id) é lido quando disponível.
 *   Cabeçalhos sensíveis (authorization, cookie) nunca são lidos.
 * - Os segredos do ambiente são usados como lista de bloqueio na sanitização.
 * - Nunca lança exceção: falha de observabilidade não pode quebrar a operação principal.
 */

async function readRequestContext(): Promise<AuditContext> {
  try {
    const h = await headers()
    return {
      requestId: h.get("x-request-id") ?? h.get("x-vercel-id"),
      correlationId: h.get("x-correlation-id"),
    }
  } catch {
    return {}
  }
}

export async function emitAuditEvent(
  input: AuditEventInput,
  options: { client?: AuditDbClient } = {},
): Promise<AuditEmitResult> {
  try {
    const client = options.client ?? createAdminClient()
    const context = await readRequestContext()
    return await emitAuditEventWith(client, input, {
      context,
      knownSecrets: collectKnownSecrets(process.env),
    })
  } catch {
    return { ok: false, error: "unexpected_error", warnings: [] }
  }
}
