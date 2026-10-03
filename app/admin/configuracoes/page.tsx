import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { OrganizationSettingsForm } from "@/app/configuracoes/organization-settings-form"
import { ProfileSettingsForm } from "@/app/configuracoes/profile-settings-form"
import { PasswordSettingsForm } from "@/app/configuracoes/password-settings-form"

export const dynamic = "force-dynamic"

interface OrganizationSettings {
  name: string
  support_email: string | null
}

export default async function SettingsPage() {
  const admin = await getCurrentAdmin()
  const supabase = await createClient()

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "organizacao")
    .maybeSingle()

  const organization = (settingsRow?.value as OrganizationSettings | undefined) ?? {
    name: "",
    support_email: null,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie os dados da organização e sua conta de acesso.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrganizationSettingsForm organization={organization} isOwner={admin.role === "OWNER"} />
        <div className="flex flex-col gap-6">
          <ProfileSettingsForm name={admin.name} email={admin.email} />
          <PasswordSettingsForm />
        </div>
      </div>
    </div>
  )
}
