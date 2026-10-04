"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateOrganizationPreferences } from "@/app/admin/configuracoes/actions"
import type { OrganizationSettings } from "@/app/admin/configuracoes/types"

export function OrganizationPreferencesForm({ organization }: { organization: OrganizationSettings }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOrganizationPreferences(formData)
        toast.success("Preferências da organização atualizadas.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Preferências gerais</CardTitle>
        </div>
        <CardDescription>
          Valores padrão aplicados para toda a organização, como fuso horário e idioma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-timezone">Fuso horário padrão</Label>
              <Select name="timezone" defaultValue={organization.timezone ?? "America/Sao_Paulo"}>
                <SelectTrigger id="org-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">América/São Paulo (GMT-3)</SelectItem>
                  <SelectItem value="America/Manaus">América/Manaus (GMT-4)</SelectItem>
                  <SelectItem value="America/Rio_Branco">América/Rio Branco (GMT-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-language">Idioma padrão</Label>
              <Select name="language" defaultValue={organization.language ?? "pt-BR"}>
                <SelectTrigger id="org-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-date-format">Formato de data</Label>
              <Select name="dateFormat" defaultValue={organization.date_format ?? "DD/MM/YYYY"}>
                <SelectTrigger id="org-date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                  <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-time-format">Formato de horário</Label>
              <Select name="timeFormat" defaultValue={organization.time_format ?? "24h"}>
                <SelectTrigger id="org-time-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas</SelectItem>
                  <SelectItem value="12h">12 horas (AM/PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Salvando..." : "Salvar preferências"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
