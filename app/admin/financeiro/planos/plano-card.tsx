"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { updatePlanoFinanceiro } from "@/app/admin/financeiro/actions"
import type { PlanoFinanceiroConfig } from "@/app/admin/financeiro/types"
import type { ClientPlan } from "@/lib/types"

function formatCentsAsInput(cents: number | null) {
  if (cents === null) return ""
  return (cents / 100).toFixed(2).replace(".", ",")
}

export function PlanoCard({
  plan,
  label,
  total,
  active,
  pending,
  inactive,
  config,
  canEdit,
}: {
  plan: ClientPlan
  label: string
  total: number
  active: number
  pending: number
  inactive: number
  config: PlanoFinanceiroConfig
  canEdit: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updatePlanoFinanceiro(plan, formData)
        toast.success(`Configuração do plano ${label} salva.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Clientes neste plano</span>
          <span className="font-mono text-2xl font-semibold text-foreground">{total}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-sm font-medium text-foreground">{active}</span>
            <span>Ativos</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-sm font-medium text-foreground">{pending}</span>
            <span>Pendentes</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-sm font-medium text-foreground">{inactive}</span>
            <span>Suspensos/expirados</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
          <span className="text-muted-foreground">Receita gerada</span>
          <span className="text-muted-foreground">Dados ainda não disponíveis</span>
        </div>

        {canEdit ? (
          <form action={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`price-${plan}`}>Preço (R$)</Label>
              <Input
                id={`price-${plan}`}
                name="price"
                placeholder="0,00"
                defaultValue={formatCentsAsInput(config.price_cents)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`cycle-${plan}`}>Ciclo de cobrança</Label>
              <Select name="billingCycle" defaultValue={config.billing_cycle ?? undefined}>
                <SelectTrigger id={`cycle-${plan}`} className="w-full">
                  <SelectValue placeholder="Selecionar ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" disabled={isPending} className="self-start">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
