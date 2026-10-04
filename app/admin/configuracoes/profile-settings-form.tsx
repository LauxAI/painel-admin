"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOwnProfile } from "@/app/admin/configuracoes/actions"
import { ADMIN_ROLE_LABELS, type AdminRole, type AdminStatus } from "@/lib/types"

export function ProfileSettingsForm({
  name,
  email,
  role,
  status,
}: {
  name: string
  email: string
  role: AdminRole
  status: AdminStatus
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOwnProfile(formData)
        toast.success("Perfil atualizado.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Minha conta</CardTitle>
        </div>
        <CardDescription>Seus dados de identificação no painel.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" name="name" defaultValue={name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input id="profile-email" value={email} disabled />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label>Cargo</Label>
              <div>
                <Badge variant={role === "OWNER" ? "default" : "secondary"}>{ADMIN_ROLE_LABELS[role]}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status da conta</Label>
              <div>
                <Badge variant={status === "ativo" ? "default" : "destructive"}>
                  {status === "ativo" ? "Ativo" : "Suspenso"}
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Seu cargo e status são gerenciados em{" "}
            <span className="font-medium text-foreground">Administradores</span> e não podem ser alterados por aqui.
          </p>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
