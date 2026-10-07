import { AUDIT_LIMITS } from "@/lib/audit/constants"
import type { AuditDbClient } from "@/lib/audit/persist"
import { sanitizeText, type RedactionOptions } from "@/lib/audit/redaction"

/**
 * Resolve o nome atual da empresa para gravar em `company_name_snapshot`.
 *
 * Retorna NULL (nunca lança) quando: a empresa não existe, a consulta falha ou
 * excede o tempo limite, ou o nome está ausente/vazio. Nada é inventado e uma
 * falha aqui jamais deve interromper a operação principal.
 */
export async function resolveCompanyNameSnapshot(
  client: AuditDbClient,
  companyId: string,
  redaction: RedactionOptions = {},
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const lookup = Promise.resolve(client.from("companies").select("name").eq("id", companyId).maybeSingle())
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), AUDIT_LIMITS.companyLookupTimeoutMs)
    })

    const result = (await Promise.race([lookup, timeout])) as {
      data: { name?: unknown } | null
      error: unknown
    } | null
    if (!result || result.error) return null

    const name = result.data?.name
    if (typeof name !== "string") return null
    const trimmed = name.trim()
    if (!trimmed) return null

    return sanitizeText(trimmed, AUDIT_LIMITS.companyNameMaxLength, redaction)
  } catch {
    console.warn("[audit] company_name_snapshot não resolvido", { reason: "lookup_failed" })
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
