import Link from "next/link"
import {
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  BadgeCheck,
  CalendarClock,
  XCircle,
  UserPlus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getDashboardMetrics } from "@/lib/dashboard-data"
import { formatDate, formatRelativeTime } from "@/lib/format"
import { getDaysRemaining } from "@/lib/plan-status"
import { CLIENT_STATUS_LABELS, PLAN_LABELS, type ClientStatus } from "@/lib/types"
import { CLIENT_STATUS_BADGE } from "@/lib/status-styles"

export const dynamic = "force-dynamic"

const STATUS_DOT: Record<ClientStatus, string> = {
  ativo: "bg-chart-3",
  pendente: "bg-chart-2",
  suspenso: "bg-primary",
  expirado: "bg-muted-foreground",
  cancelado: "bg-muted-foreground",
}

const ATTENTION_TONE_CLASSES: Record<"destructive" | "warning", string> = {
  destructive: "text-destructive",
  warning: "text-chart-2",
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()

  const cards = [
    { label: "Total de clientes", value: metrics.totalClients, icon: Users, href: "/admin/usuarios" },
    { label: "Contas ativas", value: metrics.activeClients, icon: UserCheck, href: "/admin/usuarios" },
    { label: "Pendentes de ativação", value: metrics.pendingClients, icon: Clock, href: "/admin/usuarios" },
    { label: "Administradores", value: metrics.totalAdmins, icon: ShieldCheck, href: "/admin/administradores" },
  ]

  const indicators = [
    { label: "Planos ativos", value: metrics.activePlansCount, icon: BadgeCheck },
    { label: "Expirando em breve", value: metrics.expiringSoonCount, icon: CalendarClock },
    { label: "Contas expiradas", value: metrics.expiredClients, icon: XCircle },
    { label: "Criadas recentemente", value: metrics.recentlyCreatedCount, icon: UserPlus },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-colors hover:border-foreground/20">
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
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Indicadores administrativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {indicators.map((indicator) => (
              <div key={indicator.label} className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent">
                  <indicator.icon className="size-4 text-foreground" aria-hidden />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-xl font-semibold text-foreground">{indicator.value}</span>
                  <span className="text-xs text-muted-foreground text-balance">{indicator.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              href="/admin/logs"
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
                  <span className="text-sm text-foreground text-pretty">{log.description}</span>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Requer atenção</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {metrics.attentionItems.length === 0 ? (
            <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-chart-3" aria-hidden />
              Tudo em ordem
            </div>
          ) : (
            metrics.attentionItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`size-4 shrink-0 ${ATTENTION_TONE_CLASSES[item.tone]}`} aria-hidden />
                  <span className="text-sm text-foreground">{item.message}</span>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas recentes</CardTitle>
            <Link
              href="/admin/usuarios"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver todas
              <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {metrics.recentAccounts.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
            )}
            {metrics.recentAccounts.map((client) => (
              <Link
                key={client.id}
                href="/admin/usuarios"
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {client.companies?.name ?? client.responsible_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {PLAN_LABELS[client.plan]} • {formatDate(client.created_at)}
                  </span>
                </div>
                <Badge variant="outline" className={CLIENT_STATUS_BADGE[client.status]}>
                  {CLIENT_STATUS_LABELS[client.status]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {metrics.upcomingExpirations.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nenhum vencimento próximo.</p>
            )}
            {metrics.upcomingExpirations.map((client) => {
              const daysRemaining = getDaysRemaining(client.account_expiration_date)
              return (
                <Link
                  key={client.id}
                  href="/admin/usuarios"
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {client.companies?.name ?? client.responsible_name}
                    </span>
                    <span className="text-xs text-muted-foreground">{PLAN_LABELS[client.plan]}</span>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap text-xs font-medium ${
                      daysRemaining !== null && daysRemaining < 0 ? "text-destructive" : "text-chart-2"
                    }`}
                  >
                    {daysRemaining !== null && daysRemaining < 0
                      ? `Venceu há ${Math.abs(daysRemaining)}d`
                      : daysRemaining === 0
                        ? "Vence hoje"
                        : `Vence em ${daysRemaining}d`}
                  </span>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
