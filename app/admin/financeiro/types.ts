import type { ClientPlan } from "@/lib/types"

export interface PlanoFinanceiroConfig {
  price_cents: number | null
  billing_cycle: "mensal" | "anual" | null
}

export type PlanosFinanceirosSettings = Record<ClientPlan, PlanoFinanceiroConfig>

export const DEFAULT_PLANOS_FINANCEIROS_SETTINGS: PlanosFinanceirosSettings = {
  starter: { price_cents: null, billing_cycle: null },
  pro: { price_cents: null, billing_cycle: null },
  enterprise: { price_cents: null, billing_cycle: null },
}
