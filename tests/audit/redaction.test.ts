import { describe, expect, it } from "vitest"
import { collectKnownSecrets, redactString, sanitizeMetadata, sanitizeText } from "@/lib/audit/redaction"
import { FAKE_SECRETS } from "./helpers"

const serialize = (value: unknown) => JSON.stringify(value)

describe("sanitização de secrets", () => {
  it("redige chaves sensíveis pelo nome, em qualquer profundidade", () => {
    const result = sanitizeMetadata({
      password: FAKE_SECRETS.password,
      senha: FAKE_SECRETS.password,
      api_key: FAKE_SECRETS.openai,
      gemini_api_key: FAKE_SECRETS.gemini,
      SUPABASE_SERVICE_ROLE_KEY: FAKE_SECRETS.serviceRole,
      webhookSecret: FAKE_SECRETS.webhookSecret,
      client_secret: "abc",
      nested: { deep: { privateKey: "-----BEGIN PRIVATE KEY-----abc" } },
      list: [{ secret: "x" }],
    })

    expect(result.password).toBe("[REDACTED]")
    expect(result.senha).toBe("[REDACTED]")
    expect(result.api_key).toBe("[REDACTED]")
    expect(result.gemini_api_key).toBe("[REDACTED]")
    expect(result.SUPABASE_SERVICE_ROLE_KEY).toBe("[REDACTED]")
    expect(result.webhookSecret).toBe("[REDACTED]")
    expect(result.client_secret).toBe("[REDACTED]")
    expect((result.nested as { deep: { privateKey: string } }).deep.privateKey).toBe("[REDACTED]")
    expect((result.list as Array<{ secret: string }>)[0].secret).toBe("[REDACTED]")
  })

  it("nenhum secret conhecido aparece no resultado, mesmo escondido em texto livre", () => {
    const result = sanitizeMetadata({
      note: `falha ao chamar com ${FAKE_SECRETS.openai} e ${FAKE_SECRETS.gemini}`,
      url: `https://api.exemplo.com/v1?api_key=${FAKE_SECRETS.openai}&x=1`,
      error: `token ${FAKE_SECRETS.whatsapp} expirou`,
      innocuous: { detail: `chave ${FAKE_SECRETS.serviceRole}` },
    })
    const output = serialize(result)

    for (const secret of Object.values(FAKE_SECRETS)) {
      expect(output).not.toContain(secret)
    }
  })

  it("remove segredos literais fornecidos (ex.: lidos do ambiente) por correspondência exata", () => {
    const result = sanitizeMetadata({ info: `valor ${FAKE_SECRETS.serviceRole} vazou` }, { knownSecrets: [FAKE_SECRETS.serviceRole] })
    expect(serialize(result)).not.toContain(FAKE_SECRETS.serviceRole)
  })

  it("collectKnownSecrets lê segredos do ambiente e ignora variáveis NEXT_PUBLIC_", () => {
    const secrets = collectKnownSecrets({
      SUPABASE_SERVICE_ROLE_KEY: FAKE_SECRETS.serviceRole,
      GEMINI_API_KEY: FAKE_SECRETS.gemini,
      POSTGRES_PASSWORD: "postgres-password-123",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-123456",
      NODE_ENV: "production",
      SHORT_TOKEN: "abc",
    })
    expect(secrets).toEqual(expect.arrayContaining([FAKE_SECRETS.serviceRole, FAKE_SECRETS.gemini, "postgres-password-123"]))
    expect(secrets).not.toContain("public-anon-key-123456")
    expect(secrets).not.toContain("production")
    expect(secrets).not.toContain("abc")
  })
})

describe("sanitização de tokens", () => {
  it("redige JWTs, tokens de acesso/refresh e hashes longos", () => {
    const result = sanitizeMetadata({
      access_token: FAKE_SECRETS.jwt,
      refresh_token: "r-abc123",
      session_token: "s-abc",
      sessionId: "sess-1",
      token_hash: "a".repeat(64),
      detalhe: `sessão ${FAKE_SECRETS.jwt}`,
      digest: "f".repeat(64),
    })
    const output = serialize(result)

    expect(result.access_token).toBe("[REDACTED]")
    expect(result.refresh_token).toBe("[REDACTED]")
    expect(result.session_token).toBe("[REDACTED]")
    expect(result.sessionId).toBe("[REDACTED]")
    expect(result.token_hash).toBe("[REDACTED]")
    expect(output).not.toContain(FAKE_SECRETS.jwt)
    expect(output).not.toContain("f".repeat(64))
  })

  it("mantém métricas numéricas de uso de tokens de IA (não são credenciais)", () => {
    const result = sanitizeMetadata({ input_tokens: 120, output_tokens: 48, total_tokens: 168, max_tokens: 1024 })
    expect(result).toEqual({ input_tokens: 120, output_tokens: 48, total_tokens: 168, max_tokens: 1024 })
  })

  it("redige uma chave chamada token mesmo com valor numérico-like em string", () => {
    expect(sanitizeMetadata({ token: "123456" }).token).toBe("[REDACTED]")
    expect(sanitizeMetadata({ input_tokens: "secret-value" }).input_tokens).toBe("[REDACTED]")
  })
})

describe("sanitização de authorization headers e cookies", () => {
  it("redige o objeto headers inteiro e chaves authorization/cookie", () => {
    const result = sanitizeMetadata({
      headers: { authorization: `Bearer ${FAKE_SECRETS.jwt}`, cookie: "sb-access-token=abc" },
      authorization: `Bearer ${FAKE_SECRETS.jwt}`,
      "set-cookie": "sid=abc; HttpOnly",
      "x-hub-signature-256": "sha256=deadbeef",
      proxyAuthorization: "Basic dXNlcjpwYXNz",
    })

    expect(result.headers).toBe("[REDACTED]")
    expect(result.authorization).toBe("[REDACTED]")
    expect(result["set-cookie"]).toBe("[REDACTED]")
    expect(result["x-hub-signature-256"]).toBe("[REDACTED]")
    expect(result.proxyAuthorization).toBe("[REDACTED]")
  })

  it("redige 'Authorization: Bearer ...' e 'Basic ...' dentro de texto livre", () => {
    const text = redactString(`GET falhou. Authorization: Bearer ${FAKE_SECRETS.openai} / Basic dXNlcjpwYXNzd29yZA==`)
    expect(text).not.toContain(FAKE_SECRETS.openai)
    expect(text).not.toContain("dXNlcjpwYXNzd29yZA==")
  })

  it("redige credenciais embutidas em URLs", () => {
    expect(redactString("postgres://admin:s3cr3t@db.exemplo.com:5432/app")).not.toContain("s3cr3t")
  })
})

describe("metadata segura", () => {
  it("omite conteúdo bruto de mensagens e payloads de webhook", () => {
    const result = sanitizeMetadata({
      message: "Olá, meu CPF é 123.456.789-00 e quero remarcar",
      body: { entry: [{ changes: [] }] },
      payload: { qualquer: "coisa" },
      prompt: "texto longo do cliente",
      messageId: "wamid.123",
      provider: "meta",
    })

    expect(result.message).toBe("[REDACTED]")
    expect(result.body).toBe("[REDACTED]")
    expect(result.payload).toBe("[REDACTED]")
    expect(result.prompt).toBe("[REDACTED]")
    expect(result.messageId).toBe("wamid.123")
    expect(result.provider).toBe("meta")
  })

  it("redige dados financeiros sensíveis", () => {
    const result = sanitizeMetadata({ cardNumber: "4111111111111111", cvv: "123", iban: "BR1500000000000010932840814P2" })
    expect(result).toEqual({ cardNumber: "[REDACTED]", cvv: "[REDACTED]", iban: "[REDACTED]" })
  })

  it("preserva a metadata legada do painel sem alterações", () => {
    const legacy = {
      before: "ADMIN",
      after: "OWNER",
      role: "ADMIN",
      authUserId: "33333333-3333-4333-8333-333333333333",
      authUserRemoved: true,
      plan: "pro",
      accountStartDate: "2025-01-01",
    }
    expect(sanitizeMetadata(legacy)).toEqual(legacy)
    expect(sanitizeMetadata({ before: null, after: "ativo" })).toEqual({ before: null, after: "ativo" })
  })

  it("é sempre JSON serializável: circular, bigint, Date, Error, funções e profundidade", () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    let deep: Record<string, unknown> = { fim: true }
    for (let i = 0; i < 10; i += 1) deep = { child: deep }

    const result = sanitizeMetadata({
      circular,
      big: BigInt(10),
      when: new Date("2025-01-01T00:00:00.000Z"),
      err: new Error(`falhou com ${FAKE_SECRETS.openai}`),
      fn: () => 1,
      deep,
    })

    expect(() => JSON.stringify(result)).not.toThrow()
    expect((result.circular as Record<string, unknown>).self).toBe("[CIRCULAR]")
    expect(result.big).toBe("10")
    expect(result.when).toBe("2025-01-01T00:00:00.000Z")
    expect(serialize(result.err)).not.toContain(FAKE_SECRETS.openai)
    expect(result.fn).toBeNull()
    expect(serialize(result.deep)).toContain("[MAX_DEPTH]")
  })

  it("limita strings, quantidade de chaves e tamanho total", () => {
    const long = sanitizeMetadata({ note: "x".repeat(5000) })
    expect((long.note as string).length).toBeLessThan(600)

    const many = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]))
    expect(Object.keys(sanitizeMetadata(many)).length).toBeLessThanOrEqual(51)

    const bulky = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, "y".repeat(400)]))
    expect(sanitizeMetadata(bulky)).toMatchObject({ _truncated: true })
  })

  it("entradas que não são objeto viram {}", () => {
    expect(sanitizeMetadata(null)).toEqual({})
    expect(sanitizeMetadata(undefined)).toEqual({})
    expect(sanitizeMetadata("texto")).toEqual({})
    expect(sanitizeMetadata([1, 2])).toEqual({})
  })

  it("sanitizeText redige e trunca descrições", () => {
    const text = sanitizeText(`erro com ${FAKE_SECRETS.openai} ${"z".repeat(1000)}`, 100)
    expect(text).not.toContain(FAKE_SECRETS.openai)
    expect(text.length).toBeLessThanOrEqual(100 + "…[truncated]".length)
  })
})
