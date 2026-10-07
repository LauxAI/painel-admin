import type { AuditEmitResult, AuditEventInput } from "@/lib/audit/types"

/**
 * Helpers de correlação. Um fluxo (ex.: WhatsApp inbound -> agente -> Gemini -> outbound)
 * compartilha um `correlationId`; cada passo aponta para o evento anterior via `parentEventId`.
 */

export function newCorrelationId(): string {
  return crypto.randomUUID()
}

type CorrelationFields = Pick<AuditEventInput, "correlationId" | "parentEventId" | "requestId">

/**
 * Campos de correlação para um evento filho. Se o evento pai não foi persistido
 * (resultado `ok: false`), preserva o `correlationId` do fluxo e omite o `parentEventId`.
 */
export function childOf(
  parent: AuditEmitResult | { id: string; correlationId: string | null },
  fallbackCorrelationId?: string | null,
): CorrelationFields {
  if ("ok" in parent && !parent.ok) {
    return { correlationId: fallbackCorrelationId ?? null, parentEventId: null }
  }
  const resolved = parent as { id: string; correlationId: string | null }
  return {
    correlationId: resolved.correlationId ?? fallbackCorrelationId ?? null,
    parentEventId: resolved.id,
  }
}
