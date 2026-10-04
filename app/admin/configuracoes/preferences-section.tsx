import { SlidersHorizontal } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function PreferencesSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Preferências</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferências pessoais</CardTitle>
          <CardDescription>Fuso horário, idioma e formatos de data e hora para a sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertDescription>
              Esta seção ainda não é persistida. Para salvar preferências individuais por administrador é necessário
              uma alteração de backend (nova coluna em <code className="font-mono">admin_profiles</code> ou uma
              política de RLS que permita cada administrador gerenciar sua própria preferência), que depende da sua
              aprovação.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pref-timezone">Fuso horário</Label>
              <Select disabled>
                <SelectTrigger id="pref-timezone">
                  <SelectValue placeholder="América/São Paulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="america-sao-paulo">América/São Paulo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pref-language">Idioma</Label>
              <Select disabled>
                <SelectTrigger id="pref-language">
                  <SelectValue placeholder="Português (Brasil)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pref-date-format">Formato de data</Label>
              <Select disabled>
                <SelectTrigger id="pref-date-format">
                  <SelectValue placeholder="DD/MM/AAAA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd-mm-yyyy">DD/MM/AAAA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pref-time-format">Formato de horário</Label>
              <Select disabled>
                <SelectTrigger id="pref-time-format">
                  <SelectValue placeholder="24 horas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
