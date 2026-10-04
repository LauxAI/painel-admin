import type { AdminStatus, ClientStatus, InviteStatus } from "@/lib/types"
import type { PlanPeriodStatus } from "@/lib/plan-status"

export const CLIENT_STATUS_BADGE: Record<ClientStatus, string> = {
  ativo: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  pendente: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  suspenso: "border-primary/40 bg-primary/10 text-primary",
  expirado: "border-border bg-muted text-muted-foreground",
  cancelado: "border-border bg-muted text-muted-foreground",
}

export const INVITE_STATUS_BADGE: Record<InviteStatus, string> = {
  pendente: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  aceito: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  cancelado: "border-border bg-muted text-muted-foreground",
  expirado: "border-border bg-muted text-muted-foreground",
}

export const ADMIN_STATUS_BADGE: Record<AdminStatus, string> = {
  ativo: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  suspenso: "border-border bg-muted text-muted-foreground",
}

export const PLAN_PERIOD_STATUS_BADGE: Record<PlanPeriodStatus, string> = {
  sem_periodo: "border-border bg-muted text-muted-foreground",
  ativo: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  proximo_vencimento: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  vencido: "border-destructive/40 bg-destructive/10 text-destructive",
}
