import { BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ChartPlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-56 flex-col items-center justify-center gap-2 text-center">
        <BarChart3 className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="max-w-xs text-sm text-pretty text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
