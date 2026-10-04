import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { FinanceiroNav } from "@/app/admin/financeiro/financeiro-nav"
import { PlanoCard } from "@/app/admin/financeiro/planos/plano-card"
import { DEFAULT_PLANOS_FINANCEIROS_SETTINGS, type PlanosFinanceirosSettings } from "@/app/admin/financeiro/types"
import { PLAN_LABELS, type ClientAccount, type ClientPlan } from "@/lib/types"

export const dynamic = "force-dynamic"

const PLANS: ClientPlan[] = ["starter", "pro", "enterprise"]

export default async function PlanosPage() {
  const supabase = await createClient()
  const admin = await getCurrentAdmin()

  const [{ data: clients }, { data: settingsRow }] = await Promise.all([
    supabase.from("client_accounts").select("id, plan, status"),
    supabase.from("app_settings").select("value").eq("key", "planos_financeiros").maybeSingle(),
  ])

  const settings: PlanosFinanceirosSettings = {
    ...DEFAULT_PLANOS_FINANCEIROS_SETTINGS,
    ...(settingsRow?.value as Partial<PlanosFinanceirosSettings> | undefined),
  }

  const allClients = (clients as Pick<ClientAccount, "id" | "plan" | "status">[]) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Planos</h1>
        <p className="text-sm text-muted-foreground">
          Distribuição real de clientes por plano e configuração de preços para a cobrança recorrente futura.
        </p>
      </div>
      <FinanceiroNav />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const planClients = allClients.filter((client) => client.plan === plan)
          const active = planClients.filter((client) => client.status === "ativo").length
          const pending = planClients.filter((client) => client.status === "pendente").length
          const inactive = planClients.length - active - pending

          return (
            <PlanoCard
              key={plan}
              plan={plan}
              label={PLAN_LABELS[plan]}
              total={planClients.length}
              active={active}
              pending={pending}
              inactive={inactive}
              config={settings[plan]}
              canEdit={admin.role === "OWNER"}
            />
          )
        })}
      </div>
    </div>
  )
}
