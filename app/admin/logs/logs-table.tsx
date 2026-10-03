"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { activityActionLabel, activityActionTone, ACTIVITY_TONE_CLASSES } from "@/lib/activity-labels"
import { formatDateTime } from "@/lib/format"
import type { ActivityLog } from "@/lib/types"

export function LogsTable({ logs }: { logs: ActivityLog[] }) {
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("todos")

  const actionOptions = useMemo(() => {
    const unique = new Set(logs.map((log) => log.action_type))
    return Array.from(unique).sort()
  }, [logs])

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return logs.filter((log) => {
      if (actionFilter !== "todos" && log.action_type !== actionFilter) return false
      if (!query) return true
      return (
        log.actor_name.toLowerCase().includes(query) ||
        log.description.toLowerCase().includes(query) ||
        activityActionLabel(log.action_type).toLowerCase().includes(query)
      )
    })
  }, [logs, search, actionFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por responsável ou descrição..."
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filtrar por ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as ações</SelectItem>
            {actionOptions.map((action) => (
              <SelectItem key={action} value={action}>
                {activityActionLabel(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{log.actor_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ACTIVITY_TONE_CLASSES[activityActionTone(log.action_type)]}>
                      {activityActionLabel(log.action_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
