import { createClient } from "@/lib/supabase/server"
import type { ActivityLog, ClientAccount, ClientStatus } from "@/lib/types"

export interface DashboardMetrics {
  totalClients: number
  activeClients: number
  pendingClients: number
  expiringSoon: ClientAccount[]
  statusBreakdown: Record<ClientStatus, number>
  totalAdmins: number
  recentActivity: ActivityLog[]
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()

  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)

  const [{ data: clients }, { count: totalAdmins }, { data: recentActivity }, { data: expiringSoon }] =
    await Promise.all([
      supabase.from("client_accounts").select("status"),
      supabase.from("admin_profiles").select("*", { count: "exact", head: true }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
      supabase
        .from("client_accounts")
        .select("*, companies(*)")
        .eq("status", "ativo")
        .not("account_expiration_date", "is", null)
        .lte("account_expiration_date", in7Days.toISOString().slice(0, 10))
        .order("account_expiration_date", { ascending: true })
        .limit(5),
    ])

  const statusBreakdown: Record<ClientStatus, number> = {
    pendente: 0,
    ativo: 0,
    suspenso: 0,
    expirado: 0,
    cancelado: 0,
  }

  for (const client of clients ?? []) {
    statusBreakdown[client.status as ClientStatus] += 1
  }

  return {
    totalClients: clients?.length ?? 0,
    activeClients: statusBreakdown.ativo,
    pendingClients: statusBreakdown.pendente,
    expiringSoon: (expiringSoon as ClientAccount[]) ?? [],
    statusBreakdown,
    totalAdmins: totalAdmins ?? 0,
    recentActivity: (recentActivity as ActivityLog[]) ?? [],
  }
}
