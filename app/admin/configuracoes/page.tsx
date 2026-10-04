import { ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { OrganizationSettingsForm } from "@/app/admin/configuracoes/organization-settings-form"
import { ProfileSettingsForm } from "@/app/admin/configuracoes/profile-settings-form"
import { SecuritySection } from "@/app/admin/configuracoes/security-section"
import { PreferencesSection } from "@/app/admin/configuracoes/preferences-section"
import { NotificationsSection } from "@/app/admin/configuracoes/notifications-section"
import { OrganizationPreferencesForm } from "@/app/admin/configuracoes/organization-preferences-form"
import { DangerZoneSection } from "@/app/admin/configuracoes/danger-zone-section"
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from "@/app/admin/configuracoes/types"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const admin = await getCurrentAdmin()
  const supabase = await createClient()
  const isOwner = admin.role === "OWNER"

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "organizacao")
    .maybeSingle()

  const organization: OrganizationSettings = {
    ...DEFAULT_ORGANIZATION_SETTINGS,
    ...(settingsRow?.value as Partial<OrganizationSettings> | undefined),
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie os dados da organização e sua conta de acesso.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OrganizationSettingsForm organization={organization} isOwner={isOwner} />
        <ProfileSettingsForm name={admin.name} email={admin.email} role={admin.role} status={admin.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecuritySection lastSignInAt={admin.last_sign_in_at} />
        <div className="flex flex-col gap-6">
          <PreferencesSection />
          <NotificationsSection />
        </div>
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Configurações da organização</h2>
              <p className="text-sm text-muted-foreground">
                Gerencie configurações gerais que afetam toda a organização. Disponível apenas para o Owner. A gestão
                de administradores continua em{" "}
                <span className="font-medium text-foreground">Administradores</span>.
              </p>
            </div>
          </div>

          <OrganizationPreferencesForm organization={organization} />

          <DangerZoneSection />
        </div>
      ) : null}
    </div>
  )
}
