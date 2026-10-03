import type { Metadata } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashInviteToken, isInviteExpired } from "@/lib/invites"
import { AuthShell } from "@/components/auth/auth-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActivateForm } from "./activate-form"

export const metadata: Metadata = {
  title: "Ativar conta — LAUXAI CORE",
}

export default async function AtivarContaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <AuthShell title="Convite inválido" description="O link de ativação está incompleto.">
        <Alert variant="destructive">
          <AlertDescription>Verifique se você copiou o link completo recebido no convite.</AlertDescription>
        </Alert>
      </AuthShell>
    )
  }

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("invites")
    .select("status, expires_at, name, type")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle()

  if (!invite || invite.status === "cancelado" || invite.status === "aceito") {
    return (
      <AuthShell title="Convite indisponível" description="Este convite não está mais disponível para uso.">
        <Alert variant="destructive">
          <AlertDescription>
            {!invite
              ? "Convite não encontrado."
              : invite.status === "aceito"
                ? "Este convite já foi utilizado."
                : "Este convite foi cancelado."}
          </AlertDescription>
        </Alert>
      </AuthShell>
    )
  }

  if (invite.status === "expirado" || isInviteExpired(invite.expires_at)) {
    return (
      <AuthShell title="Convite expirado" description="Solicite um novo convite ao administrador responsável.">
        <Alert variant="destructive">
          <AlertDescription>O prazo para ativação deste convite expirou.</AlertDescription>
        </Alert>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={`Olá, ${invite.name.split(" ")[0]}`} description="Crie sua senha para ativar o acesso.">
      <ActivateForm token={token} />
    </AuthShell>
  )
}
