"use server"

import { createClient } from "@/lib/supabase/server"

export type ForgotPasswordState = { sent?: boolean; error?: string } | null

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    return { error: "Informe seu e-mail." }
  }

  const supabase = await createClient()
  const redirectTo =
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectTo}?next=/redefinir-senha`,
  })

  // Always report success — never reveal whether the e-mail has an account.
  return { sent: true }
}
