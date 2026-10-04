"use client"

import {
  TrendingUp,
  DollarSign,
  Wallet,
  CalendarClock,
  AlertTriangle,
  Users,
  UserX,
  BadgeCheck,
  Ban,
} from "lucide-react"
import { MetricPlaceholderCard } from "@/components/dashboard/metric-placeholder-card"
import { ChartPlaceholderCard } from "@/components/dashboard/chart-placeholder-card"
import { PeriodFilter } from "@/app/admin/financeiro/period-filter"

const METRICS = [
  { label: "MRR (receita recorrente mensal)", icon: TrendingUp },
  { label: "ARR (receita recorrente anual)", icon: DollarSign },
  { label: "Receita recebida", icon: Wallet },
  { label: "Receita pendente", icon: CalendarClock },
  { label: "Receita em atraso", icon: AlertTriangle },
  { label: "Clientes pagantes", icon: Users },
  { label: "Clientes inadimplentes", icon: UserX },
  { label: "Assinaturas ativas", icon: BadgeCheck },
  { label: "Assinaturas canceladas", icon: Ban },
] as const

export function FinanceiroDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-pretty text-muted-foreground">
          Os indicadores abaixo ficam disponíveis assim que uma integração de cobrança recorrente for conectada ao
          sistema.
        </p>
        <PeriodFilter />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric) => (
          <MetricPlaceholderCard key={metric.label} label={metric.label} icon={metric.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPlaceholderCard
          title="Receita ao longo do tempo"
          description="Este gráfico será preenchido automaticamente quando a cobrança recorrente for conectada."
        />
        <ChartPlaceholderCard
          title="Assinaturas por status"
          description="Exibirá a distribuição de assinaturas ativas, em atraso e canceladas assim que houver dados."
        />
      </div>
    </div>
  )
}
