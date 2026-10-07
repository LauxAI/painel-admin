import type { Metadata } from "next"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Entrar — LAUXAI CORE",
}

export default async function LoginPage() {
  const admin = createAdminClient()
  const { data: hasAdmin } = await admin.rpc("has_any_admin")

  return (
    <AuthShell eyebrow="" title="Acessar o painel" description="Painel administrativo interno da LAUXAI CORE.">
      <LoginForm />
      {!hasAdmin ? (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Primeiro acesso?{" "}
          <Link href="/configuracao-inicial" className="font-medium text-foreground underline underline-offset-4">
            Configure a conta Owner
          </Link>
        </p>
      ) : null}
    </AuthShell>
  )
}
