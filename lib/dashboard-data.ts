import { createClient } from "@/lib/supabase/server"
import { getDaysRemaining, getPlanPeriodStatus, PLAN_EXPIRING_SOON_THRESHOLD_DAYS } from "@/lib/plan-status"
import type { ActivityLog, ClientAccount, ClientStatus } from "@/lib/types"

const RECENT_ACCOUNTS_LIMIT = 5
const UPCOMING_EXPIRATIONS_LIMIT = 5
const RECENT_ACTIVITY_LIMIT = 8
const RECENTLY_CREATED_WINDOW_DAYS = 7

export interface AttentionItem {
  id: string
  tone: "destructive" | "warning"
  message: string
  href: string
}

export interface DashboardMetrics {
  totalClients: number
  activeClients: number
  pendingClients: number
  suspendedClients: number
  expiredClients: number
  cancelledClients: number
  statusBreakdown: Record<ClientStatus, number>
  totalAdmins: number
  recentActivity: ActivityLog[]
  /** Clients with status "ativo" — surfaced as a plan-level indicator. */
  activePlansCount: number
  /** Active clients whose plan period falls within the short-term window. */
  expiringSoonCount: number
  recentlyCreatedCount: number
  attentionItems: AttentionItem[]
  recentAccounts: ClientAccount[]
  upcomingExpirations: ClientAccount[]
}

/**
 * Loads every metric the admin dashboard needs from a single pass over
 * `client_accounts` (plus two lightweight aggregate queries), so the page
 * never issues a query per card. All numbers are derived from real rows —
 * nothing here is hardcoded or mocked. RLS (via the request-scoped client)
 * governs what each admin can see; no service role bypass.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()

  const [{ data: clients }, { count: totalAdmins }, { data: recentActivity }] = await Promise.all([
    supabase.from("client_accounts").select("*, companies(*)").order("created_at", { ascending: false }),
    supabase.from("admin_profiles").select("*", { count: "exact", head: true }),
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(RECENT_ACTIVITY_LIMIT),
  ])

  const allClients = (clients as ClientAccount[]) ?? []

  const statusBreakdown: Record<ClientStatus, number> = {
    pendente: 0,
    ativo: 0,
    suspenso: 0,
    expirado: 0,
    cancelado: 0,
  }

  const recentCreatedCutoff = new Date()
  recentCreatedCutoff.setDate(recentCreatedCutoff.getDate() - RECENTLY_CREATED_WINDOW_DAYS)

  let expiringSoonCount = 0
  let recentlyCreatedCount = 0
  const upcomingExpirations: ClientAccount[] = []

  for (const client of allClients) {
    statusBreakdown[client.status] += 1

    if (client.status === "ativo") {
      const periodStatus = getPlanPeriodStatus(client.account_expiration_date)
      if (periodStatus === "proximo_vencimento" || periodStatus === "vencido") {
        upcomingExpirations.push(client)
      }
      if (periodStatus === "proximo_vencimento") {
        expiringSoonCount += 1
      }
    }

    if (new Date(client.created_at) >= recentCreatedCutoff) {
      recentlyCreatedCount += 1
    }
  }

  upcomingExpirations.sort((a, b) => {
    const aDays = getDaysRemaining(a.account_expiration_date) ?? Number.POSITIVE_INFINITY
    const bDays = getDaysRemaining(b.account_expiration_date) ?? Number.POSITIVE_INFINITY
    return aDays - bDays
  })

  const attentionItems: AttentionItem[] = []
  if (expiringSoonCount > 0) {
    attentionItems.push({
      id: "expiring",
      tone: "destructive",
      message: `${expiringSoonCount} ${expiringSoonCount === 1 ? "conta expira" : "contas expiram"} nos próximos ${PLAN_EXPIRING_SOON_THRESHOLD_DAYS} dias`,
      href: "/admin/usuarios",
    })
  }
  if (statusBreakdown.pendente > 0) {
    attentionItems.push({
      id: "pending",
      tone: "warning",
      message: `${statusBreakdown.pendente} ${statusBreakdown.pendente === 1 ? "conta aguardando" : "contas aguardando"} ativação`,
      href: "/admin/usuarios",
    })
  }
  if (statusBreakdown.suspenso > 0) {
    attentionItems.push({
      id: "suspended",
      tone: "destructive",
      message: `${statusBreakdown.suspenso} ${statusBreakdown.suspenso === 1 ? "conta suspensa" : "contas suspensas"}`,
      href: "/admin/usuarios",
    })
  }
  if (statusBreakdown.expirado > 0) {
    attentionItems.push({
      id: "expired",
      tone: "destructive",
      message: `${statusBreakdown.expirado} ${statusBreakdown.expirado === 1 ? "conta com plano expirado" : "contas com plano expirado"}`,
      href: "/admin/usuarios",
    })
  }

  return {
    totalClients: allClients.length,
    activeClients: statusBreakdown.ativo,
    pendingClients: statusBreakdown.pendente,
    suspendedClients: statusBreakdown.suspenso,
    expiredClients: statusBreakdown.expirado,
    cancelledClients: statusBreakdown.cancelado,
    statusBreakdown,
    totalAdmins: totalAdmins ?? 0,
    recentActivity: (recentActivity as ActivityLog[]) ?? [],
    activePlansCount: statusBreakdown.ativo,
    expiringSoonCount,
    recentlyCreatedCount,
    attentionItems,
    recentAccounts: allClients.slice(0, RECENT_ACCOUNTS_LIMIT),
    upcomingExpirations: upcomingExpirations.slice(0, UPCOMING_EXPIRATIONS_LIMIT),
  }
}
