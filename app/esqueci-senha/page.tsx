import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = {
  title: "Esqueci minha senha — LAUXAI CORE",
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Redefinir senha" description="Informe o e-mail da sua conta administrativa.">
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Voltar para o login
        </Link>
      </p>
    </AuthShell>
  )
}
