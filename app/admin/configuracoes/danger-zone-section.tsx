import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const DANGER_ACTIONS = [
  {
    title: "Desativar organização",
    description: "Suspende temporariamente o acesso de todos os administradores e clientes.",
  },
  {
    title: "Encerrar organização",
    description: "Encerra permanentemente a organização e todos os dados associados.",
  },
]

export function DangerZoneSection() {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-destructive" />
          <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
        </div>
        <CardDescription>Ações nesta área podem afetar permanentemente a organização.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {DANGER_ACTIONS.map((action) => (
          <div
            key={action.title}
            className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
            <Button type="button" variant="destructive" disabled className="w-fit shrink-0">
              Indisponível
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Essas ações estão desabilitadas até que exista uma especificação completa e um backend seguro para
          executá-las (confirmação em duas etapas, janela de reversão e auditoria).
        </p>
      </CardContent>
    </Card>
  )
}
