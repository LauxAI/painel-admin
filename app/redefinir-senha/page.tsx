import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
  title: "Definir senha — LAUXAI CORE",
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Defina sua senha" description="Escolha uma senha para acessar o painel administrativo.">
      <ResetPasswordForm />
    </AuthShell>
  )
}
