import { createClient } from "@/lib/supabase/server"
import { LogsFilters } from "@/app/admin/logs/logs-filters"
import { LogsTable } from "@/app/admin/logs/logs-table"
import type { ActivityLog } from "@/lib/types"

export const dynamic = "force-dynamic"

export const LOGS_PAGE_SIZE = 25

interface LogsPageSearchParams {
  q?: string
  admin?: string
  conta?: string
  acao?: string
  de?: string
  ate?: string
  ordem?: string
  pagina?: string
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<LogsPageSearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const page = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1)
  const ascending = params.ordem === "antigos"
  const rangeFrom = (page - 1) * LOGS_PAGE_SIZE
  const rangeTo = rangeFrom + LOGS_PAGE_SIZE - 1

  let logsQuery = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending })

  const search = params.q?.trim()
  if (search) {
    const term = search.replace(/[%,()]/g, " ").trim()
    if (term) {
      logsQuery = logsQuery.or(`description.ilike.%${term}%,actor_name.ilike.%${term}%`)
    }
  }
  if (params.admin) {
    logsQuery = logsQuery.eq("actor_id", params.admin)
  }
  if (params.conta) {
    logsQuery = logsQuery.eq("entity_type", "client_account").eq("entity_id", params.conta)
  }
  if (params.acao) {
    logsQuery = logsQuery.eq("action_type", params.acao)
  }
  if (params.de) {
    logsQuery = logsQuery.gte("created_at", `${params.de}T00:00:00`)
  }
  if (params.ate) {
    logsQuery = logsQuery.lte("created_at", `${params.ate}T23:59:59.999`)
  }

  const [{ data: logs, count, error }, { data: admins }, { data: clients }] = await Promise.all([
    logsQuery.range(rangeFrom, rangeTo),
    supabase.from("admin_profiles").select("id, name").order("name"),
    supabase.from("client_accounts").select("id, responsible_name, companies(name)").order("responsible_name"),
  ])

  const clientLabelById = new Map<string, string>()
  for (const client of clients ?? []) {
    const companies = (client as { companies?: { name: string }[] | { name: string } | null }).companies
    const companyName = Array.isArray(companies) ? companies[0]?.name : companies?.name
    clientLabelById.set(client.id, companyName ? `${client.responsible_name} (${companyName})` : client.responsible_name)
  }

  const adminNameById = new Map<string, string>()
  for (const admin of admins ?? []) {
    adminNameById.set(admin.id, admin.name)
  }

  const enrichedLogs = ((logs as ActivityLog[]) ?? []).map((log) => {
    let relatedLabel: string | null = null
    if (log.entity_type === "client_account" && log.entity_id) {
      relatedLabel = clientLabelById.get(log.entity_id) ?? "Cliente removido"
    } else if (log.entity_type === "admin_profile" && log.entity_id && log.entity_id !== log.actor_id) {
      relatedLabel = adminNameById.get(log.entity_id) ?? "Administrador removido"
    }
    return { ...log, relatedLabel }
  })

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / LOGS_PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Logs e Atividades</h1>
        <p className="text-sm text-muted-foreground">
          Central de auditoria das ações realizadas no painel administrativo da LAUXAI.
        </p>
      </div>

      <LogsFilters
        admins={(admins ?? []).map((admin) => ({ id: admin.id, name: admin.name }))}
        clients={(clients ?? []).map((client) => ({ id: client.id, label: clientLabelById.get(client.id) ?? client.responsible_name }))}
      />

      <LogsTable
        logs={enrichedLogs}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        pageSize={LOGS_PAGE_SIZE}
        error={error ? error.message : null}
      />
    </div>
  )
}
