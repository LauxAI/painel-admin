"use client"

import { useRef, useTransition } from "react"
import { toast } from "sonner"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOwnPassword } from "@/app/admin/configuracoes/actions"

export function PasswordSettingsForm() {
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOwnPassword(formData)
        toast.success("Senha atualizada.")
        formRef.current?.reset()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Senha de acesso</CardTitle>
        </div>
        <CardDescription>Use pelo menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input id="new-password" name="password" type="password" minLength={8} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input id="confirm-password" name="confirmPassword" type="password" minLength={8} required />
          </div>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Salvando..." : "Atualizar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
