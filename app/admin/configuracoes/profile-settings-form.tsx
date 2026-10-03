"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOwnProfile } from "@/app/admin/configuracoes/actions"

export function ProfileSettingsForm({ name, email }: { name: string; email: string }) {
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
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
