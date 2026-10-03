import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("admin_profiles").select("role").eq("id", user.id).maybeSingle()

  if (profile && (profile.role === "OWNER" || profile.role === "ADMIN")) {
    redirect("/admin")
  }

  redirect("/login")
}
