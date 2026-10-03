import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { AdminsTable } from "@/app/administradores/admins-table"
import { InviteAdminDialog } from "@/app/administradores/invite-admin-dialog"
import type { AdminProfile, Invite } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function AdministradoresPage() {
  const currentAdmin = await getCurrentAdmin()
  const supabase = await createClient()

  const [{ data: admins }, { data: invites }] = await Promise.all([
    supabase.from("admin_profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("invites")
      .select("*")
      .eq("type", "administrador")
      .eq("status", "pendente")
      .order("created_at", { ascending: false }),
  ])

  const isOwner = currentAdmin.role === "OWNER"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Administradores</h1>
          <p className="text-sm text-muted-foreground">Gerencie quem tem acesso ao painel administrativo.</p>
        </div>
        {isOwner ? <InviteAdminDialog /> : null}
      </div>

      <AdminsTable
        admins={(admins as AdminProfile[]) ?? []}
        pendingInvites={(invites as Invite[]) ?? []}
        currentAdminId={currentAdmin.id}
        isOwner={isOwner}
      />
    </div>
  )
}
