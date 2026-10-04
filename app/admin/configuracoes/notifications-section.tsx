import { Bell } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const NOTIFICATION_OPTIONS = [
  { id: "novas-contas", label: "Novas contas de clientes" },
  { id: "convites", label: "Convites enviados e aceitos" },
  { id: "alteracoes-importantes", label: "Alterações importantes em contas" },
  { id: "alertas-seguranca", label: "Alertas de segurança" },
  { id: "falhas-plataforma", label: "Falhas importantes da plataforma" },
]

export function NotificationsSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Notificações</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferências de notificação</CardTitle>
          <CardDescription>Escolha sobre quais eventos você quer ser avisado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertDescription>
              Esta seção ainda não está conectada a um sistema de notificações real. Os controles abaixo estão
              desabilitados até que exista uma tabela de preferências e um canal de envio (e-mail, push, etc.)
              aprovados e implementados.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-4">
            {NOTIFICATION_OPTIONS.map((option) => (
              <div key={option.id} className="flex items-center justify-between gap-4">
                <Label htmlFor={`notif-${option.id}`} className="font-normal text-foreground">
                  {option.label}
                </Label>
                <Switch id={`notif-${option.id}`} disabled />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
