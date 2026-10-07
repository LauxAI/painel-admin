import type { AuditDbClient } from "@/lib/audit/persist"
import type { AuditQueryClient } from "@/lib/audit/query"

export interface InsertCall {
  table: string
  values: Record<string, unknown>
}

type DbError = { code?: string; message?: string } | null

export interface CompanyLookupOptions {
  /** id -> nome. Ids ausentes simulam empresa inexistente (maybeSingle devolve data: null). */
  companies?: Record<string, string | null>
  /** Simula erro devolvido pelo banco na consulta da empresa. */
  lookupError?: DbError
  /** Simula exceção na consulta da empresa. */
  lookupThrows?: boolean
  /** Simula consulta que nunca responde (para testar o tempo limite). */
  lookupHangs?: boolean
}

/**
 * Cliente falso que registra inserts. `errors` é consumido na ordem, uma entrada por insert.
 * A tabela `companies` responde a `select("name").eq("id", x).maybeSingle()` conforme `lookup`.
 */
export function createInsertClient(errors: DbError[] = [], lookup: CompanyLookupOptions = {}) {
  const calls: InsertCall[] = []
  const lookups: string[] = []
  const client = {
    from(table: string) {
      if (table === "companies") {
        let id = ""
        const chain = {
          select: () => chain,
          eq: (_column: string, value: string) => {
            id = value
            return chain
          },
          maybeSingle: () => {
            lookups.push(id)
            if (lookup.lookupThrows) throw new Error("falha ao consultar empresa")
            if (lookup.lookupHangs) return new Promise(() => {})
            if (lookup.lookupError) return Promise.resolve({ data: null, error: lookup.lookupError })
            const name = lookup.companies?.[id]
            return Promise.resolve({ data: name === undefined ? null : { name }, error: null })
          },
        }
        return chain
      }
      return {
        insert(values: Record<string, unknown>) {
          calls.push({ table, values })
          const error = errors.length > 0 ? (errors.shift() ?? null) : null
          return Promise.resolve({ error })
        },
      }
    },
  } as unknown as AuditDbClient
  return { client, calls, lookups }
}

export interface RecordedQuery {
  table: string
  select: string | null
  ops: Array<[string, ...unknown[]]>
}

/** Query builder falso: registra a cadeia de chamadas e resolve com `result`. */
export function createQueryClient(result: { data: unknown; error: DbError } = { data: [], error: null }) {
  const queries: RecordedQuery[] = []
  const client = {
    from(table: string) {
      const recorded: RecordedQuery = { table, select: null, ops: [] }
      queries.push(recorded)
      const builder: Record<string, unknown> = {}
      for (const op of ["eq", "in", "gte", "lte", "or", "order", "limit"]) {
        builder[op] = (...args: unknown[]) => {
          recorded.ops.push([op, ...args])
          return builder
        }
      }
      builder.select = (columns: string) => {
        recorded.select = columns
        return builder
      }
      builder.maybeSingle = () => Promise.resolve({ data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data, error: result.error })
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
      return builder
    },
  } as unknown as AuditQueryClient
  return { client, queries }
}

export const COMPANY_A = "11111111-1111-4111-8111-111111111111"
export const COMPANY_B = "22222222-2222-4222-8222-222222222222"
export const ADMIN_ID = "33333333-3333-4333-8333-333333333333"

/** Segredos fictícios (formato realista, valores inexistentes) usados apenas para provar a redaction. */
export const FAKE_SECRETS = {
  serviceRole: "sb_secret_9f8e7d6c5b4a39281706f5e4d3c2b1a0",
  openai: "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz012345",
  gemini: "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q",
  whatsapp: "EAAGm0PX4ZCpsBAKZB1c2d3e4f5g6h7i8j9k0l1m2n3o",
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
  webhookSecret: "whsec_a1b2c3d4e5f6g7h8i9j0k1l2",
  password: "S3nh@Super-Secreta!",
}
