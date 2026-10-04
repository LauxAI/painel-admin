import { createClient } from "@/lib/supabase/server"
import { ClientsTable } from "@/app/admin/usuarios/clients-table"
import { InviteClientDialog } from "@/app/admin/usuarios/invite-client-dialog"
import type { ActivityLog, ClientAccount, Invite } from "@/lib/types"

export const dynamic = "force-dynamic"

const ACTIVITY_LOG_LIMIT = 300

export default async function UsuariosPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: invites }, { data: activityLogs }] = await Promise.all([
    supabase.from("client_accounts").select("*, companies(*)").order("created_at", { ascending: false }),
    supabase
      .from("invites")
      .select("*")
      .eq("type", "cliente")
      .eq("status", "pendente")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", "client_account")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LOG_LIMIT),
  ])

  const pendingInviteByClient = new Map<string, Invite>()
  for (const invite of (invites as Invite[]) ?? []) {
    if (invite.client_account_id) pendingInviteByClient.set(invite.client_account_id, invite)
  }

  const activityByClient = new Map<string, ActivityLog[]>()
  for (const log of (activityLogs as ActivityLog[]) ?? []) {
    if (!log.entity_id) continue
    const existing = activityByClient.get(log.entity_id) ?? []
    existing.push(log)
    activityByClient.set(log.entity_id, existing)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Usuários e Contas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as contas de clientes da LAUXAI.</p>
        </div>
        <InviteClientDialog />
      </div>

      <ClientsTable
        clients={(clients as ClientAccount[]) ?? []}
        pendingInviteByClient={Object.fromEntries(pendingInviteByClient)}
        activityByClient={Object.fromEntries(activityByClient)}
      />
    </div>
  )
}
