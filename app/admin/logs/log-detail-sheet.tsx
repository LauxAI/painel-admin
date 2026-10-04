"use client"

import type { ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { activityActionLabel, activityActionTone, ACTIVITY_TONE_CLASSES } from "@/lib/activity-labels"
import { formatDateTime } from "@/lib/format"
import type { ActivityLog } from "@/lib/types"

type EnrichedLog = ActivityLog & { relatedLabel: string | null }

export function LogDetailSheet({
  log,
  open,
  onOpenChange,
}: {
  log: EnrichedLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!log) return null

  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{activityActionLabel(log.action_type)}</SheetTitle>
          <SheetDescription>{formatDateTime(log.created_at)}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <section className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Resumo</h3>
            <DetailRow label="Administrador" value={log.actor_name} />
            <DetailRow label="Empresa/conta" value={log.relatedLabel ?? "—"} />
            <DetailRow
              label="Tipo de ação"
              value={
                <Badge variant="outline" className={ACTIVITY_TONE_CLASSES[activityActionTone(log.action_type)]}>
                  {activityActionLabel(log.action_type)}
                </Badge>
              }
            />
            <DetailRow label="Data/hora" value={formatDateTime(log.created_at)} />
            <DetailRow
              label="Resultado"
              value={
                <span className="flex items-center gap-1.5 text-chart-3">
                  <CheckCircle2 className="size-3.5" />
                  Sucesso
                </span>
              }
            />
          </section>

          <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Descrição</h3>
            <p className="text-sm text-foreground">{log.description}</p>
          </section>

          {hasMetadata ? (
            <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Antes / Depois</h3>
              <MetadataView metadata={log.metadata} />
            </section>
          ) : null}

          <p className="text-xs text-muted-foreground">
            O status &quot;Sucesso&quot; é exibido porque o sistema só registra ações que foram concluídas; falhas de
            execução (ex.: erro de validação ou permissão negada) não geram um registro aqui.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MetadataView({ metadata }: { metadata: Record<string, unknown> }) {
  if ("before" in metadata || "after" in metadata) {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Antes</span>
          <MetadataValue value={metadata.before} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Depois</span>
          <MetadataValue value={metadata.after} />
        </div>
      </div>
    )
  }
  return <MetadataValue value={metadata} />
}

function MetadataValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  if (typeof value === "object") {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs text-foreground">{JSON.stringify(value, null, 2)}</pre>
    )
  }
  return <span className="text-sm font-medium text-foreground">{String(value)}</span>
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
