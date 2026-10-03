import { createClient } from "@/lib/supabase/server"
import { LogsTable } from "@/app/admin/logs/logs-table"
import type { ActivityLog } from "@/lib/types"

export const dynamic = "force-dynamic"

const LOG_LIMIT = 200

export default async function LogsPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LOG_LIMIT)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Logs e Atividades</h1>
        <p className="text-sm text-muted-foreground">
          Histórico das últimas {LOG_LIMIT} ações realizadas no painel administrativo.
        </p>
      </div>

      <LogsTable logs={(logs as ActivityLog[]) ?? []} />
    </div>
  )
}
