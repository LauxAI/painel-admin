"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Search, MoreHorizontal, RotateCcw, Ban, CheckCircle2, Trash2, Pencil, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditClientDialog } from "@/app/admin/usuarios/edit-client-dialog"
import { ClientDetailSheet } from "@/app/admin/usuarios/client-detail-sheet"
import { changeClientStatus, deleteClient, resendClientInvite } from "@/app/admin/usuarios/actions"
import { CLIENT_STATUS_BADGE, PLAN_PERIOD_STATUS_BADGE } from "@/lib/status-styles"
import { formatDate } from "@/lib/format"
import { getDaysRemaining, getPlanPeriodStatus, PLAN_PERIOD_STATUS_LABELS } from "@/lib/plan-status"
import type { ActivityLog, ClientAccount, ClientPlan, ClientStatus, Invite } from "@/lib/types"

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  suspenso: "Suspenso",
  expirado: "Expirado",
  cancelado: "Cancelado",
}

const PLAN_LABEL: Record<ClientPlan, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" }

type SortOption = "recentes" | "antigos" | "vencimento_proximo" | "vencimento_distante"

const SORT_LABEL: Record<SortOption, string> = {
  recentes: "Mais recentes",
  antigos: "Mais antigos",
  vencimento_proximo: "Vencimento mais próximo",
  vencimento_distante: "Vencimento mais distante",
}

export function ClientsTable({
  clients,
  pendingInviteByClient,
  activityByClient,
}: {
  clients: ClientAccount[]
  pendingInviteByClient: Record<string, Invite>
  activityByClient: Record<string, ActivityLog[]>
}) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [planFilter, setPlanFilter] = useState<string>("todos")
  const [sortBy, setSortBy] = useState<SortOption>("recentes")
  const [editing, setEditing] = useState<ClientAccount | null>(null)
  const [viewing, setViewing] = useState<ClientAccount | null>(null)
  const [deleting, setDeleting] = useState<ClientAccount | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const result = clients.filter((client) => {
      const matchesStatus = statusFilter === "todos" || client.status === statusFilter
      const matchesPlan = planFilter === "todos" || client.plan === planFilter
      const haystack = `${client.responsible_name} ${client.email} ${client.companies?.name ?? ""}`.toLowerCase()
      const matchesQuery = haystack.includes(query.toLowerCase())
      return matchesStatus && matchesPlan && matchesQuery
    })

    const sorted = [...result]
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "antigos":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "vencimento_proximo":
        case "vencimento_distante": {
          const aDays = getDaysRemaining(a.account_expiration_date)
          const bDays = getDaysRemaining(b.account_expiration_date)
          if (aDays === null) return 1
          if (bDays === null) return -1
          return sortBy === "vencimento_proximo" ? aDays - bDays : bDays - aDays
        }
        case "recentes":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    return sorted
  }, [clients, statusFilter, planFilter, query, sortBy])

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}${token}`
    navigator.clipboard.writeText(url)
    toast.success("Link do convite copiado.")
  }

  function handleResend(client: ClientAccount, invite: Invite) {
    startTransition(async () => {
      try {
        const path = await resendClientInvite(client.id, invite.id, client.email, client.responsible_name)
        copyInviteLink(path)
      } catch {
        toast.error("Não foi possível reenviar o convite.")
      }
    })
  }

  function handleStatusChange(client: ClientAccount, status: ClientStatus) {
    startTransition(async () => {
      try {
        await changeClientStatus(client.id, status, client.responsible_name)
        toast.success(`Status atualizado para "${STATUS_LABEL[status]}".`)
      } catch {
        toast.error("Não foi possível alterar o status.")
      }
    })
  }

  function handleDelete() {
    if (!deleting) return
    const client = deleting
    startTransition(async () => {
      try {
        await deleteClient(client.id, client.responsible_name)
        toast.success("Cliente removido.")
      } catch {
        toast.error("Não foi possível remover o cliente.")
      } finally {
        setDeleting(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "todos")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(value) => setPlanFilter(value ?? "todos")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os planos</SelectItem>
            {Object.entries(PLAN_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy((value as SortOption) ?? "recentes")}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiração</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => {
                const invite = pendingInviteByClient[client.id]
                const periodStatus = getPlanPeriodStatus(client.account_expiration_date)
                const daysRemaining = getDaysRemaining(client.account_expiration_date)
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{client.responsible_name}</span>
                        <span className="text-xs text-muted-foreground">{client.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{client.companies?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{PLAN_LABEL[client.plan]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={CLIENT_STATUS_BADGE[client.status]}>
                        {STATUS_LABEL[client.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span>{formatDate(client.account_expiration_date)}</span>
                        {periodStatus !== "sem_periodo" ? (
                          <span
                            className={`text-xs ${
                              periodStatus === "vencido"
                                ? "text-destructive"
                                : periodStatus === "proximo_vencimento"
                                  ? "text-chart-2"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {daysRemaining !== null && daysRemaining < 0
                              ? `Vencido há ${Math.abs(daysRemaining)}d`
                              : daysRemaining !== null
                                ? `${daysRemaining}d restantes`
                                : PLAN_PERIOD_STATUS_LABELS[periodStatus]}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewing(client)}>
                            <Eye className="size-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(client)}>
                            <Pencil className="size-4" />
                            Editar dados
                          </DropdownMenuItem>
                          {invite ? (
                            <DropdownMenuItem onClick={() => handleResend(client, invite)}>
                              <RotateCcw className="size-4" />
                              Reenviar convite (gera novo link)
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          {client.status !== "ativo" ? (
                            <DropdownMenuItem onClick={() => handleStatusChange(client, "ativo")}>
                              <CheckCircle2 className="size-4" />
                              Reativar conta
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleStatusChange(client, "suspenso")}>
                              <Ban className="size-4" />
                              Suspender conta
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(client)}
                          >
                            <Trash2 className="size-4" />
                            Remover cliente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <EditClientDialog client={editing} open={!!editing} onOpenChange={(open) => !open && setEditing(null)} />
      ) : null}

      {viewing ? (
        <ClientDetailSheet
          client={viewing}
          logs={activityByClient[viewing.id] ?? []}
          open={!!viewing}
          onOpenChange={(open) => !open && setViewing(null)}
        />
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente {deleting?.responsible_name} e seus convites associados. Não é
              possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
