import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Exchanges the Supabase ?code= param for a session. Reached after the user
// clicks an invite, password-recovery, or (if ever enabled) email-confirmation
// link. `next` lets each flow choose where the now-authenticated user lands.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/redefinir-senha"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
