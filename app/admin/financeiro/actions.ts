"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentAdmin } from "@/lib/get-current-admin"
import { logActivity } from "@/lib/log-activity"
import { DEFAULT_PLANOS_FINANCEIROS_SETTINGS, type PlanosFinanceirosSettings } from "@/app/admin/financeiro/types"
import type { ClientPlan } from "@/lib/types"

async function readPlanosFinanceirosSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<PlanosFinanceirosSettings> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "planos_financeiros").maybeSingle()
  return { ...DEFAULT_PLANOS_FINANCEIROS_SETTINGS, ...(data?.value as Partial<PlanosFinanceirosSettings> | undefined) }
}

export async function updatePlanoFinanceiro(plan: ClientPlan, formData: FormData) {
  const admin = await getCurrentAdmin()
  if (admin.role !== "OWNER") throw new Error("Apenas o Owner pode configurar preços dos planos.")

  const priceInput = String(formData.get("price") ?? "").trim()
  const billingCycle = String(formData.get("billingCycle") ?? "").trim()

  let priceCents: number | null = null
  if (priceInput) {
    const normalized = priceInput.replace(/\./g, "").replace(",", ".")
    const parsed = Number.parseFloat(normalized)
    if (Number.isNaN(parsed) || parsed < 0) throw new Error("Informe um preço válido.")
    priceCents = Math.round(parsed * 100)
  }

  const supabase = await createClient()
  const current = await readPlanosFinanceirosSettings(supabase)

  const next: PlanosFinanceirosSettings = {
    ...current,
    [plan]: {
      price_cents: priceCents,
      billing_cycle: billingCycle === "mensal" || billingCycle === "anual" ? billingCycle : null,
    },
  }

  const { error } = await supabase.from("app_settings").upsert({
    key: "planos_financeiros",
    value: next,
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
  })

  if (error) throw new Error("Não foi possível salvar a configuração do plano.")

  await logActivity(supabase, {
    actorId: admin.id,
    actorName: admin.name,
    actionType: "planos_financeiros_atualizados",
    entityType: "app_settings",
    entityId: `planos_financeiros.${plan}`,
    description: `${admin.name} atualizou a configuração financeira do plano "${plan}".`,
  })

  revalidatePath("/admin/financeiro/planos")
}

/**
 * The actions below are intentionally unimplemented. They require a
 * `subscriptions` / `payments` data model that does not exist in the
 * database yet (see the proposed schema in v0_plans/strategic-guide.md).
 * They throw a clear, user-facing error instead of silently no-op'ing or
 * writing fake data, so the UI can surface the real blocker via toast.
 */
export async function cancelSubscription(): Promise<never> {
  throw new Error("Indisponível: esta função requer a tabela 'subscriptions', ainda não implementada.")
}

export async function reactivateSubscription(): Promise<never> {
  throw new Error("Indisponível: esta função requer a tabela 'subscriptions', ainda não implementada.")
}

export async function applyCourtesy(): Promise<never> {
  throw new Error(
    "Indisponível: esta função requer as tabelas 'subscriptions' e 'payments', ainda não implementadas.",
  )
}
