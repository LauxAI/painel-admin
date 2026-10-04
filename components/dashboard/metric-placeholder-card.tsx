import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Shows a metric card that is honest about missing data: instead of a
 * fabricated zero, it states plainly that the underlying integration
 * (billing, support tickets, etc.) does not exist yet.
 */
export function MetricPlaceholderCard({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="text-sm text-muted-foreground">Dados ainda não disponíveis</span>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
