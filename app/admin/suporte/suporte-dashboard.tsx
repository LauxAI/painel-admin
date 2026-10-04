import { Inbox, Clock, Timer, CheckCircle2, Users2 } from "lucide-react"
import { MetricPlaceholderCard } from "@/components/dashboard/metric-placeholder-card"
import { ChartPlaceholderCard } from "@/components/dashboard/chart-placeholder-card"

const METRICS = [
  { label: "Tickets abertos", icon: Inbox },
  { label: "Tempo médio de 1ª resposta", icon: Clock },
  { label: "Tempo médio de resolução", icon: Timer },
  { label: "Tickets resolvidos (30 dias)", icon: CheckCircle2 },
  { label: "Tickets por administrador", icon: Users2 },
] as const

export function SuporteDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-xl text-sm text-pretty text-muted-foreground">
        Os indicadores de atendimento ficam disponíveis assim que a central de tickets for utilizada.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric) => (
          <MetricPlaceholderCard key={metric.label} label={metric.label} icon={metric.icon} />
        ))}
      </div>

      <ChartPlaceholderCard
        title="Volume de tickets por categoria"
        description="Exibirá a distribuição de tickets por categoria assim que houver chamados registrados."
      />
    </div>
  )
}
