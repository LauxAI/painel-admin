"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateClient, type ClientFormState } from "@/app/admin/usuarios/actions"
import type { ClientAccount } from "@/lib/types"

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: ClientAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateClientWithId = updateClient.bind(null, client.id)
  const [state, formAction, isPending] = useActionState<ClientFormState, FormData>(updateClientWithId, null)
  const [successTick, setSuccessTick] = useState(0)

  useEffect(() => {
    if (state === null && successTick > 0) {
      onOpenChange(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successTick])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>{client.companies?.name ?? client.email}</DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            setSuccessTick((n) => n + 1)
            formAction(formData)
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsibleName">Nome do responsável</Label>
              <Input id="responsibleName" name="responsibleName" defaultValue={client.responsible_name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={client.whatsapp ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan">Plano</Label>
              <Select name="plan" defaultValue={client.plan}>
                <SelectTrigger id="plan">
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
              <Label htmlFor="accountExpirationDate">Expiração do acesso</Label>
              <Input
                id="accountExpirationDate"
                name="accountExpirationDate"
                type="date"
                defaultValue={client.account_expiration_date ?? ""}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={client.notes ?? ""} />
          </div>
          {state?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
