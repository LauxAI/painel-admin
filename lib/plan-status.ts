/**
 * Computed (not stored) plan-period status for a client account, derived
 * purely from account_start_date / account_expiration_date. This never
 * writes to the database and never changes the stored `status` field —
 * it is informational only, per the existing account-status logic.
 */
export type PlanPeriodStatus = "sem_periodo" | "ativo" | "proximo_vencimento" | "vencido"

/** Days-remaining threshold below which a plan is considered "próximo do vencimento". */
export const PLAN_EXPIRING_SOON_THRESHOLD_DAYS = 7

export function getDaysRemaining(expirationDate: string | null | undefined): number | null {
  if (!expirationDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${expirationDate}T00:00:00`)
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
}

export function getPlanPeriodStatus(expirationDate: string | null | undefined): PlanPeriodStatus {
  const days = getDaysRemaining(expirationDate)
  if (days === null) return "sem_periodo"
  if (days < 0) return "vencido"
  if (days <= PLAN_EXPIRING_SOON_THRESHOLD_DAYS) return "proximo_vencimento"
  return "ativo"
}

export const PLAN_PERIOD_STATUS_LABELS: Record<PlanPeriodStatus, string> = {
  sem_periodo: "Sem período definido",
  ativo: "Ativo",
  proximo_vencimento: "Próximo do vencimento",
  vencido: "Vencido",
}

export interface PlanDurationShortcut {
  label: string
  days: number
}

export const PLAN_DURATION_SHORTCUTS: PlanDurationShortcut[] = [
  { label: "1 dia", days: 1 },
  { label: "3 dias", days: 3 },
  { label: "7 dias", days: 7 },
  { label: "10 dias", days: 10 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 ano", days: 365 },
]

/** Returns an ISO date (YYYY-MM-DD) `days` days after `fromDate` (or today if omitted). */
export function addDaysToDate(fromDate: string | null | undefined, days: number): string {
  const base = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
