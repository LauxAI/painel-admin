import { readFileSync, existsSync } from "fs"
import { Client } from "pg"

function loadEnvFile(path) {
  if (!existsSync(path)) return
  const content = readFileSync(path, "utf8")
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(match[1] in process.env)) process.env[match[1]] = value
  }
}

loadEnvFile(new URL("../.env.development.local", import.meta.url))

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8")

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL

if (!rawConnectionString) {
  console.error("Missing POSTGRES_URL / POSTGRES_URL_NON_POOLING env var")
  process.exit(1)
}

const url = new URL(rawConnectionString)
url.searchParams.delete("sslmode")
url.searchParams.delete("channel_binding")

const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  console.log("[v0] Schema applied successfully.")
} catch (err) {
  console.error("[v0] Failed to apply schema:", err.message)
  process.exit(1)
} finally {
  await client.end()
}
