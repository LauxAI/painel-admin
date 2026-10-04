"use client"

import { useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"
import { Loader2, CalendarClock } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { updateClientPeriod, changeClientStatus } from "@/app/admin/usuarios/actions"
import { CLIENT_STATUS_BADGE, PLAN_PERIOD_STATUS_BADGE } from "@/lib/status-styles"
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/format"
import {
  PLAN_DURATION_SHORTCUTS,
  addDaysToDate,
  getDaysRemaining,
  getPlanPeriodStatus,
  PLAN_PERIOD_STATUS_LABELS,
  todayIsoDate,
} from "@/lib/plan-status"
import { PLAN_LABELS, CLIENT_STATUS_LABELS, type ActivityLog, type ClientAccount, type ClientPlan } from "@/lib/types"

export function ClientDetailSheet({
  client,
  logs,
  open,
  onOpenChange,
}: {
  client: ClientAccount
  logs: ActivityLog[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [plan, setPlan] = useState<ClientPlan>(client.plan)
  const [startDate, setStartDate] = useState(client.account_start_date ?? "")
  const [endDate, setEndDate] = useState(client.account_expiration_date ?? "")
  const [confirmingStatus, setConfirmingStatus] = useState<null | "suspenso" | "ativo">(null)

  const daysRemaining = getDaysRemaining(endDate || null)
  const periodStatus = getPlanPeriodStatus(endDate || null)

  function applyShortcut(days: number) {
    const base = startDate || todayIsoDate()
    setStartDate(base)
    setEndDate(addDaysToDate(base, days))
  }

  function handleSavePeriod() {
    startTransition(async () => {
      try {
        await updateClientPeriod(
          client.id,
          { plan, accountStartDate: startDate || null, accountExpirationDate: endDate || null },
          client.responsible_name,
        )
        toast.success("Plano e período atualizados.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o plano.")
      }
    })
  }

  function handleStatusConfirm() {
    if (!confirmingStatus) return
    const nextStatus = confirmingStatus
    startTransition(async () => {
      try {
        await changeClientStatus(client.id, nextStatus, client.responsible_name)
        toast.success(nextStatus === "ativo" ? "Conta reativada." : "Conta suspensa.")
      } catch {
        toast.error("Não foi possível alterar o status.")
      } finally {
        setConfirmingStatus(null)
      }
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{client.responsible_name}</SheetTitle>
            <SheetDescription>{client.companies?.name ?? client.email}</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="geral" className="flex-1 px-4 pb-4">
            <TabsList className="w-full">
              <TabsTrigger value="geral">Visão geral</TabsTrigger>
              <TabsTrigger value="plano">Plano</TabsTrigger>
              <TabsTrigger value="atividade">Atividade</TabsTrigger>
              <TabsTrigger value="suporte">Suporte</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="flex flex-col gap-4 pt-4">
              <section className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Dados da conta
                </h3>
                <DetailRow label="Nome" value={client.responsible_name} />
                <DetailRow label="E-mail" value={client.email} />
                <DetailRow label="Empresa" value={client.companies?.name ?? "—"} />
                <DetailRow
                  label="Status"
                  value={
                    <Badge variant="outline" className={CLIENT_STATUS_BADGE[client.status]}>
                      {CLIENT_STATUS_LABELS[client.status]}
                    </Badge>
                  }
                />
                <DetailRow label="Criado em" value={formatDateTime(client.created_at)} />
                <DetailRow label="Último acesso" value="Não disponível" muted />
              </section>

              <section className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Uso da conta</h3>
                <p className="text-sm text-muted-foreground">
                  Ainda não existem tabelas de usuários, leads, clientes, conversas, agentes IA ou automações
                  vinculadas a esta conta no banco atual. Nenhum número fictício é exibido aqui — esses dados
                  aparecerão quando essas funcionalidades forem implementadas.
                </p>
              </section>

              <section className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ações</h3>
                {client.status !== "ativo" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmingStatus("ativo")}
                    disabled={isPending}
                    className="self-start"
                  >
                    Reativar conta
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmingStatus("suspenso")}
                    disabled={isPending}
                    className="self-start"
                  >
                    Suspender conta
                  </Button>
                )}
              </section>
            </TabsContent>

            <TabsContent value="plano" className="flex flex-col gap-4 pt-4">
              <section className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Situação do plano
                  </h3>
                  <Badge variant="outline" className={PLAN_PERIOD_STATUS_BADGE[periodStatus]}>
                    {PLAN_PERIOD_STATUS_LABELS[periodStatus]}
                  </Badge>
                </div>
                <DetailRow label="Plano atual" value={PLAN_LABELS[client.plan]} />
                <DetailRow label="Início" value={formatDate(client.account_start_date)} />
                <DetailRow label="Vencimento" value={formatDate(client.account_expiration_date)} />
                <DetailRow
                  label="Dias restantes"
                  value={
                    daysRemaining === null
                      ? "—"
                      : daysRemaining < 0
                        ? `Vencido há ${Math.abs(daysRemaining)} dia(s)`
                        : `${daysRemaining} dia(s)`
                  }
                />
              </section>

              <section className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Alterar plano e período
                </h3>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="detail-plan">Plano</Label>
                  <Select value={plan} onValueChange={(value) => setPlan(value as ClientPlan)}>
                    <SelectTrigger id="detail-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Atalhos de duração</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLAN_DURATION_SHORTCUTS.map((shortcut) => (
                      <Button
                        key={shortcut.label}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => applyShortcut(shortcut.days)}
                      >
                        {shortcut.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="detail-start">Início</Label>
                    <Input
                      id="detail-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="detail-end">Vencimento</Label>
                    <Input id="detail-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Use os atalhos para preencher rapidamente, ou digite qualquer data personalizada diretamente nos
                  campos acima — não há limitação de período.
                </p>

                <Button onClick={handleSavePeriod} disabled={isPending} className="self-start">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
                  Salvar plano e período
                </Button>
              </section>
            </TabsContent>

            <TabsContent value="atividade" className="flex flex-col gap-2 pt-4">
              {logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
                    <p className="text-sm text-foreground">{log.description}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(log.created_at)}</p>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="suporte" className="flex flex-col gap-2 pt-4">
              <p className="py-8 text-center text-sm text-pretty text-muted-foreground">
                Nenhum ticket de suporte vinculado a este cliente. A central de tickets ainda não está conectada a
                uma tabela de dados.
              </p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmingStatus} onOpenChange={(isOpen) => !isOpen && setConfirmingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmingStatus === "ativo" ? "Reativar conta?" : "Suspender conta?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingStatus === "ativo"
                ? `${client.responsible_name} voltará a ter acesso normal ao sistema.`
                : `${client.responsible_name} perderá o acesso ao sistema até que a conta seja reativada.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DetailRow({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-xs text-muted-foreground" : "font-medium text-foreground"}>{value}</span>
    </div>
  )
}
