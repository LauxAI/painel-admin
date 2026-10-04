"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { activityActionLabel, activityActionTone, ACTIVITY_TONE_CLASSES } from "@/lib/activity-labels"
import { formatDateTime } from "@/lib/format"
import { LogDetailSheet } from "@/app/admin/logs/log-detail-sheet"
import type { ActivityLog } from "@/lib/types"

type EnrichedLog = ActivityLog & { relatedLabel: string | null }

export function LogsTable({
  logs,
  totalCount,
  page,
  totalPages,
  pageSize,
  error,
}: {
  logs: EnrichedLog[]
  totalCount: number
  page: number
  totalPages: number
  pageSize: number
  error: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [viewing, setViewing] = useState<EnrichedLog | null>(null)

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("pagina", String(nextPage))
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar os registros: {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Administrador</TableHead>
              <TableHead>Empresa/conta</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer"
                  onClick={() => setViewing(log)}
                >
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{log.actor_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.relatedLabel ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ACTIVITY_TONE_CLASSES[activityActionTone(log.action_type)]}>
                      {activityActionLabel(log.action_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                    {log.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "Nenhum registro"
            : `Mostrando ${rangeStart}–${rangeEnd} de ${totalCount} registro(s)`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="gap-1"
          >
            Próxima
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <LogDetailSheet log={viewing} open={!!viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </div>
  )
}
