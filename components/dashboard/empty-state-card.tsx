import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-accent">
          <Icon className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
