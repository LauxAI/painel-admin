import { AUDIT_LIMITS, REDACTED } from "@/lib/audit/constants"

/**
 * Política central de sanitização. Roda no servidor ANTES da persistência;
 * nada aqui depende de ocultar dados no frontend.
 */

export interface RedactionOptions {
  /** Valores literais que nunca podem aparecer (ex.: chaves lidas do ambiente). */
  knownSecrets?: readonly string[]
}

/** Fragmentos (chave normalizada: minúscula, sem separadores) que indicam credencial. */
const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "passwd",
  "senha",
  "secret",
  "token",
  "apikey",
  "authorization",
  "cookie",
  "jwt",
  "signature",
  "assinatura",
  "privatekey",
  "credential",
  "servicerole",
  "accesskey",
  "bearer",
  "sessionid",
  "cardnumber",
  "cvv",
  "otp",
  "pin",
  "cpf",
  "cnpj",
  "iban",
  "accountnumber",
]

/** Chaves que normalmente carregam conteúdo bruto (mensagens de clientes, payloads, headers). */
const CONTENT_KEYS = new Set([
  "message",
  "messages",
  "body",
  "rawbody",
  "content",
  "text",
  "payload",
  "rawpayload",
  "raw",
  "headers",
  "prompt",
  "transcript",
  "html",
  "response",
  "request",
])

/** Métricas de uso numéricas (ex.: input_tokens) não são credenciais. */
const TOKEN_COUNT_KEY =
  /^((input|output|prompt|completion|total|max|cached|reasoning)tokens?(used|count|limit|usage|budget)?|tokens?(used|count|limit|usage|budget|remaining))$/

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "")

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key)
  if (!normalized) return false
  // "pin" é curto demais para casar por fragmento (ex.: "mapping"); exige chave exata.
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    fragment === "pin" || fragment === "otp" || fragment === "cvv"
      ? normalized === fragment
      : normalized.includes(fragment),
  )
}

const VALUE_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  // JWT (header.payload.signature)
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, REDACTED],
  // Authorization / Cookie em texto livre
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, `$1 ${REDACTED}`],
  // Prefixos conhecidos de chaves (OpenAI/Stripe, Supabase, Google/Gemini, Meta/WhatsApp, Slack, GitHub, webhooks)
  [/\b(sk|rk)[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}/g, REDACTED],
  [/\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}/g, REDACTED],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, REDACTED],
  [/\bEA[A-Za-z0-9]{3,}[A-Za-z0-9]{20,}/g, REDACTED],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, REDACTED],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, REDACTED],
  [/\bwhsec_[A-Za-z0-9]{16,}/g, REDACTED],
  // key=value / key: value com nomes sensíveis (querystrings, headers colados em texto)
  [
    /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|client[_-]?secret|app[_-]?secret|password|senha|signature|authorization)(["']?\s*[=:]\s*["']?)[^&\s"',;]+/gi,
    `$1$2${REDACTED}`,
  ],
  // Credenciais em URL (https://user:pass@host)
  [/(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, `$1${REDACTED}@`],
  // Digests/assinaturas longas em hex (HMAC, token_hash)
  [/\b[A-Fa-f0-9]{40,}\b/g, REDACTED],
]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function redactString(value: string, options: RedactionOptions = {}): string {
  let result = value
  for (const secret of options.knownSecrets ?? []) {
    if (secret && secret.length >= 8) {
      result = result.replace(new RegExp(escapeRegExp(secret), "g"), REDACTED)
    }
  }
  for (const [pattern, replacement] of VALUE_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…[truncated]` : value
}

/** Sanitiza texto livre (descrição/mensagem) e limita o tamanho. */
export function sanitizeText(value: string, maxLength: number, options: RedactionOptions = {}): string {
  return truncate(redactString(value, options), maxLength)
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>, options: RedactionOptions): unknown {
  if (value === null || value === undefined) return null
  switch (typeof value) {
    case "string":
      return truncate(redactString(value, options), AUDIT_LIMITS.metadataStringMaxLength)
    case "number":
      return Number.isFinite(value) ? value : null
    case "boolean":
      return value
    case "bigint":
      return value.toString()
    case "function":
    case "symbol":
      return null
  }

  const obj = value as object
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (seen.has(obj)) return "[CIRCULAR]"
  if (depth >= AUDIT_LIMITS.metadataMaxDepth) return "[MAX_DEPTH]"
  seen.add(obj)

  try {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: truncate(redactString(value.message, options), AUDIT_LIMITS.metadataStringMaxLength),
      }
    }
    if (Array.isArray(value)) {
      return value.slice(0, AUDIT_LIMITS.metadataMaxArrayItems).map((item) => sanitizeValue(item, depth + 1, seen, options))
    }
    return sanitizeObject(value as Record<string, unknown>, depth + 1, seen, options)
  } finally {
    seen.delete(obj)
  }
}

function sanitizeObject(
  input: Record<string, unknown>,
  depth: number,
  seen: WeakSet<object>,
  options: RedactionOptions,
): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  let count = 0
  for (const [key, raw] of Object.entries(input)) {
    if (count >= AUDIT_LIMITS.metadataMaxKeys) {
      output["[truncated_keys]"] = true
      break
    }
    count += 1
    const normalized = normalizeKey(key)
    if (raw === null || raw === undefined) {
      output[key] = null
    } else if (TOKEN_COUNT_KEY.test(normalized) && typeof raw === "number") {
      output[key] = raw
    } else if (isSensitiveKey(key) || CONTENT_KEYS.has(normalized)) {
      output[key] = REDACTED
    } else {
      output[key] = sanitizeValue(raw, depth, seen, options)
    }
  }
  return output
}

/**
 * Sanitiza a metadata de um evento: remove credenciais por nome de chave e por
 * padrão de valor, omite conteúdo bruto (mensagens/payloads/headers), limita
 * profundidade/tamanho e garante JSON serializável.
 */
export function sanitizeMetadata(metadata: unknown, options: RedactionOptions = {}): Record<string, unknown> {
  if (metadata === null || metadata === undefined || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }
  const sanitized = sanitizeObject(metadata as Record<string, unknown>, 0, new WeakSet(), options)
  const size = JSON.stringify(sanitized).length
  if (size > AUDIT_LIMITS.metadataMaxBytes) {
    return { _truncated: true, keys: Object.keys(sanitized).slice(0, AUDIT_LIMITS.metadataMaxKeys) }
  }
  return sanitized
}

/**
 * Lê do ambiente os valores de segredos conhecidos (service role, chaves de IA,
 * senhas de banco...) para que nunca sejam gravados nem por acidente em texto livre.
 * Variáveis NEXT_PUBLIC_* são ignoradas por serem públicas por definição.
 */
export function collectKnownSecrets(env: Record<string, string | undefined>): string[] {
  const secrets = new Set<string>()
  for (const [name, value] of Object.entries(env)) {
    if (!value || value.length < 8 || name.startsWith("NEXT_PUBLIC_")) continue
    if (/(SECRET|SERVICE_ROLE|API_KEY|_KEY$|TOKEN|PASSWORD|JWT|POSTGRES_URL|POSTGRES_PRISMA_URL)/i.test(name)) {
      secrets.add(value)
    }
  }
  return [...secrets]
}
