export type AdminRole = "OWNER" | "ADMIN"
export type AdminStatus = "ativo" | "suspenso"

export type ClientPlan = "starter" | "pro" | "enterprise"
export type ClientStatus = "pendente" | "ativo" | "suspenso" | "expirado" | "cancelado"

export type InviteType = "cliente" | "administrador"
export type InviteStatus = "pendente" | "aceito" | "cancelado" | "expirado"

export interface AdminProfile {
  id: string
  name: string
  email: string
  role: AdminRole
  status: AdminStatus
  created_by: string | null
  created_at: string
  last_sign_in_at: string | null
}

export interface Company {
  id: string
  name: string
  created_at: string
}

export interface ClientAccount {
  id: string
  company_id: string | null
  auth_user_id: string | null
  responsible_name: string
  email: string
  whatsapp: string | null
  plan: ClientPlan
  status: ClientStatus
  account_start_date: string | null
  account_expiration_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  companies?: Company | null
}

export interface Invite {
  id: string
  type: InviteType
  email: string
  name: string
  role: AdminRole | null
  client_account_id: string | null
  token_hash: string
  status: InviteStatus
  expires_at: string | null
  created_by: string | null
  accepted_at: string | null
  previous_invite_id: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  actor_id: string | null
  actor_name: string
  action_type: string
  entity_type: string | null
  entity_id: string | null
  description: string
  metadata: Record<string, unknown>
  created_at: string
  /**
   * Campos da fundação de auditoria (migration 001). São NULL em logs legados e
   * podem estar ausentes enquanto a migration não for aplicada no Supabase.
   */
  occurred_at?: string | null
  company_id?: string | null
  actor_type?: "admin" | "client" | "system" | "agent" | "webhook" | "unknown" | null
  source?: string | null
  domain?: string | null
  provider?: string | null
  status?: "started" | "success" | "failed" | "blocked" | "cancelled" | null
  severity?: "info" | "notice" | "warning" | "error" | "critical" | null
  request_id?: string | null
  correlation_id?: string | null
  parent_event_id?: string | null
  error_code?: string | null
  duration_ms?: number | null
}

export const PLAN_LABELS: Record<ClientPlan, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  suspenso: "Suspenso",
  expirado: "Expirado",
  cancelado: "Cancelado",
}

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  cancelado: "Cancelado",
  expirado: "Expirado",
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "Owner",
  ADMIN: "Administrador",
}

/**
 * Forward-looking union types for the Financeiro and Suporte modules.
 * There is no `subscriptions`, `payments`, or `support_tickets` table yet
 * (see v0_plans/strategic-guide.md, section C, for the proposed schema) —
 * these types exist only so UI components have a stable shape to build
 * against today and require no changes once the tables are created.
 */
export type SubscriptionStatus = "ativa" | "pendente" | "em_atraso" | "cancelada" | "expirada"
export type PaymentStatus = "aprovado" | "pendente" | "recusado" | "estornado" | "cancelado"
export type TicketStatus = "aberto" | "em_atendimento" | "aguardando_cliente" | "resolvido" | "fechado"
export type TicketPriority = "baixa" | "normal" | "alta" | "urgente"
export type TicketCategory =
  | "conta"
  | "pagamento"
  | "plano"
  | "integracao"
  | "automacao"
  | "ia"
  | "whatsapp"
  | "erro_tecnico"
  | "duvida"
  | "outro"

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ativa: "Ativa",
  pendente: "Pendente",
  em_atraso: "Em atraso",
  cancelada: "Cancelada",
  expirada: "Expirada",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  aprovado: "Aprovado",
  pendente: "Pendente",
  recusado: "Recusado",
  estornado: "Estornado",
  cancelado: "Cancelado",
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  conta: "Conta",
  pagamento: "Pagamento",
  plano: "Plano",
  integracao: "Integração",
  automacao: "Automação",
  ia: "IA",
  whatsapp: "WhatsApp",
  erro_tecnico: "Erro técnico",
  duvida: "Dúvida",
  outro: "Outro",
}
