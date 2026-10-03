import type { Metadata } from "next"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { AuthShell } from "@/components/auth/auth-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SetupForm } from "./setup-form"

export const metadata: Metadata = {
  title: "Configuração inicial — LAUXAI CORE",
}

export default async function ConfiguracaoInicialPage() {
  const admin = createAdminClient()
  const { data: hasAdmin } = await admin.rpc("has_any_admin")

  if (hasAdmin) {
    return (
      <AuthShell title="Configuração já concluída" description="O painel já possui um Owner cadastrado.">
        <Alert>
          <AlertDescription>
            Esta etapa já foi realizada anteriormente.{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Ir para o login
            </Link>
          </AlertDescription>
        </Alert>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Configuração inicial"
      description="Crie a primeira conta Owner para começar a administrar o painel LAUXAI CORE."
    >
      <SetupForm />
    </AuthShell>
  )
}
