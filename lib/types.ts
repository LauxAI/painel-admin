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
