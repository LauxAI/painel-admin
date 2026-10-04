import { Laptop, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordSettingsForm } from "@/app/admin/configuracoes/password-settings-form"
import { formatDateTime } from "@/lib/format"

export function SecuritySection({ lastSignInAt }: { lastSignInAt: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Segurança</h2>
      </div>
      <PasswordSettingsForm />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Laptop className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Sessões</CardTitle>
          </div>
          <CardDescription>Informações do seu acesso atual.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-foreground">
            Último login: <span className="font-medium">{formatDateTime(lastSignInAt)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            A listagem de sessões/dispositivos ativos e o encerramento remoto de sessões ainda não estão disponíveis.
            Isso exige integração com a API administrativa de autenticação, que não está configurada neste projeto.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
