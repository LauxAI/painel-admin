import Link from "next/link"
import { Users, UserCheck, Clock, ShieldCheck, ArrowUpRight, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDashboardMetrics } from "@/lib/dashboard-data"
import { formatDate, formatRelativeTime } from "@/lib/format"
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/types"

export const dynamic = "force-dynamic"

const STATUS_DOT: Record<ClientStatus, string> = {
  ativo: "bg-chart-3",
  pendente: "bg-chart-2",
  suspenso: "bg-primary",
  expirado: "bg-muted-foreground",
  cancelado: "bg-muted-foreground",
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()

  const cards = [
    { label: "Total de clientes", value: metrics.totalClients, icon: Users },
    { label: "Contas ativas", value: metrics.activeClients, icon: UserCheck },
    { label: "Pendentes de ativação", value: metrics.pendingClients, icon: Clock },
    { label: "Administradores", value: metrics.totalAdmins, icon: ShieldCheck },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between py-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </span>
                <span className="font-mono text-3xl font-semibold text-foreground">{card.value}</span>
              </div>
              <div className="flex size-10 items-center justify-center rounded-md bg-accent">
                <card.icon className="size-5 text-foreground" aria-hidden />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição por status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
                  <span className="text-foreground">{CLIENT_STATUS_LABELS[status]}</span>
                </div>
                <span className="font-mono text-muted-foreground">{metrics.statusBreakdown[status]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atividade recente</CardTitle>
            <Link
              href="/logs"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver tudo
              <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {metrics.recentActivity.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            )}
            {metrics.recentActivity.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">{log.description}</span>
                  <span className="text-xs text-muted-foreground">{log.actor_name}</span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatRelativeTime(log.created_at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {metrics.expiringSoon.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="size-4 text-primary" aria-hidden />
            <CardTitle className="text-sm font-medium text-foreground">Contas expirando em breve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {metrics.expiringSoon.map((client) => (
              <div key={client.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">{client.responsible_name}</span>
                  <span className="text-xs text-muted-foreground">{client.email}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatDate(client.account_expiration_date)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
