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
import { inviteAdmin, type AdminFormState } from "@/app/admin/administradores/actions"

export function InviteAdminDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(inviteAdmin, null)

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
            Convidar administrador
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{inviteLink ? "Convite gerado" : "Convidar novo administrador"}</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? "Compartilhe o link abaixo para que o administrador ative o acesso."
              : "O acesso é liberado assim que o convidado ativar a conta pelo link do convite."}
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Função</Label>
              <Select name="role" defaultValue="ADMIN">
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
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
