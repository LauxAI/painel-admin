"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOrganizationSettings } from "@/app/admin/configuracoes/actions"

export function OrganizationSettingsForm({
  organization,
  isOwner,
}: {
  organization: { name: string; support_email: string | null }
  isOwner: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOrganizationSettings(formData)
        toast.success("Dados da organização atualizados.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Dados da organização</CardTitle>
        </div>
        <CardDescription>Informações exibidas no painel e usadas em comunicações.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">Nome da organização</Label>
            <Input
              id="org-name"
              name="name"
              defaultValue={organization.name}
              placeholder="LAUXAI CORE"
              disabled={!isOwner}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="org-support-email">E-mail de suporte</Label>
            <Input
              id="org-support-email"
              name="supportEmail"
              type="email"
              defaultValue={organization.support_email ?? ""}
              placeholder="suporte@empresa.com"
              disabled={!isOwner}
            />
          </div>
          {isOwner ? (
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Apenas o Owner pode alterar estes dados.</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
