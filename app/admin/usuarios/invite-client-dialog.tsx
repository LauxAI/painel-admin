"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, Plus, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteClient, type ClientFormState } from "@/app/usuarios/actions"

export function InviteClientDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [state, formAction, isPending] = useActionState<ClientFormState, FormData>(inviteClient, null)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const inviteLink = state?.inviteUrl ? `${window.location.origin}${state.inviteUrl}` : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Convidar cliente
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{inviteLink ? "Convite gerado" : "Convidar novo cliente"}</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? "Compartilhe o link abaixo com o cliente para que ele ative a conta."
              : "A conta é criada como pendente até o cliente ativar o acesso pelo link do convite."}
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
              <code className="flex-1 truncate text-xs text-foreground">{inviteLink}</code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  setCopied(true)
                }}
              >
                {copied ? <Check className="size-4 text-chart-3" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="responsibleName">Nome do responsável</Label>
                <Input id="responsibleName" name="responsibleName" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="companyName">Empresa</Label>
                <Input id="companyName" name="companyName" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" placeholder="(11) 90000-0000" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan">Plano</Label>
              <Select name="plan" defaultValue="starter">
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
            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Gerar convite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
