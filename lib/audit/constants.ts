/**
 * Vocabulário padronizado do sistema de auditoria.
 *
 * Os eventos legados do painel (login, cliente_*, administrador_* ...) continuam
 * válidos: o campo `action` do evento é gravado na coluna existente `action_type`.
 */

export const AUDIT_DOMAINS = [
  "auth",
  "admin",
  "client",
  "ai",
  "automation",
  "integration",
  "webhook",
  "whatsapp",
  "widget",
  "scheduling",
  "crm",
  "billing",
  "support",
  "security",
] as const
export type AuditDomain = (typeof AUDIT_DOMAINS)[number]

export const AUDIT_SEVERITIES = ["info", "notice", "warning", "error", "critical"] as const
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number]

export const AUDIT_STATUSES = ["started", "success", "failed", "blocked", "cancelled"] as const
export type AuditStatus = (typeof AUDIT_STATUSES)[number]

export const AUDIT_ACTOR_TYPES = ["admin", "client", "system", "agent", "webhook", "unknown"] as const
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number]

/** Eventos já emitidos pelo painel administrativo hoje (preservados sem alteração de significado). */
export const LEGACY_ACTION_DOMAINS = {
  login: "auth",
  "auth.logout": "auth",
  configuracao_inicial: "auth",
  senha_atualizada: "auth",
  perfil_atualizado: "admin",
  cliente_convidado: "client",
  cliente_atualizado: "client",
  cliente_status_alterado: "client",
  cliente_plano_alterado: "client",
  cliente_removido: "client",
  convite_reenviado: "admin",
  convite_aceito: "admin",
  convite_cancelado: "admin",
  administrador_convidado: "admin",
  administrador_funcao_alterada: "admin",
  administrador_status_alterado: "admin",
  administrador_removido: "admin",
  configuracoes_atualizadas: "admin",
  planos_financeiros_atualizados: "billing",
  assinatura_criada: "billing",
  assinatura_cancelada: "billing",
  assinatura_reativada: "billing",
  pagamento_registrado: "billing",
  cortesia_aplicada: "billing",
  ticket_criado: "support",
  ticket_status_alterado: "support",
  ticket_atribuido: "support",
  ticket_mensagem_enviada: "support",
} as const satisfies Record<string, AuditDomain>

/**
 * Contratos de eventos dos módulos futuros. Nenhum módulo precisa emitir
 * esses eventos agora; o catálogo apenas garante nomes e domínios estáveis.
 * Eventos `agent.*` pertencem ao domínio `ai`; `appointment.*` ao `scheduling`.
 */
export const FUTURE_ACTION_DOMAINS = {
  "agent.created": "ai",
  "agent.updated": "ai",
  "agent.activated": "ai",
  "agent.deactivated": "ai",
  "agent.execution.started": "ai",
  "agent.execution.completed": "ai",
  "agent.execution.failed": "ai",

  "ai.request.started": "ai",
  "ai.request.completed": "ai",
  "ai.request.failed": "ai",
  "ai.quota.exhausted": "ai",

  "automation.created": "automation",
  "automation.updated": "automation",
  "automation.activated": "automation",
  "automation.paused": "automation",
  "automation.execution.started": "automation",
  "automation.execution.completed": "automation",
  "automation.execution.failed": "automation",

  "whatsapp.connection.created": "whatsapp",
  "whatsapp.connection.connected": "whatsapp",
  "whatsapp.connection.disconnected": "whatsapp",
  "whatsapp.webhook.received": "whatsapp",
  "whatsapp.message.received": "whatsapp",
  "whatsapp.message.sent": "whatsapp",
  "whatsapp.message.failed": "whatsapp",
  "whatsapp.agent.reply.started": "whatsapp",
  "whatsapp.agent.reply.completed": "whatsapp",
  "whatsapp.agent.reply.failed": "whatsapp",

  "integration.connected": "integration",
  "integration.disconnected": "integration",
  "integration.connection_failed": "integration",
  "integration.tested": "integration",
  "integration.error": "integration",

  "webhook.received": "webhook",
  "webhook.delivered": "webhook",
  "webhook.failed": "webhook",
  "webhook.retry": "webhook",

  "widget.created": "widget",
  "widget.updated": "widget",
  "widget.activated": "widget",
  "widget.session.started": "widget",
  "widget.message.received": "widget",
  "widget.message.sent": "widget",
  "widget.error": "widget",

  "appointment.created": "scheduling",
  "appointment.confirmed": "scheduling",
  "appointment.cancelled": "scheduling",
  "appointment.completed": "scheduling",
  "appointment.failed": "scheduling",

  "crm.sync.started": "crm",
  "crm.sync.completed": "crm",
  "crm.sync.failed": "crm",
} as const satisfies Record<string, AuditDomain>

export const AUDIT_ACTION_DOMAINS: Readonly<Record<string, AuditDomain>> = {
  ...LEGACY_ACTION_DOMAINS,
  ...FUTURE_ACTION_DOMAINS,
}

export type KnownAuditAction = keyof typeof LEGACY_ACTION_DOMAINS | keyof typeof FUTURE_ACTION_DOMAINS

/** Nome exibido quando o ator não é informado (a coluna `actor_name` é NOT NULL). */
export const DEFAULT_ACTOR_NAMES: Readonly<Record<AuditActorType, string>> = {
  admin: "Administrador",
  client: "Cliente",
  system: "Sistema",
  agent: "Agente",
  webhook: "Webhook",
  unknown: "Desconhecido",
}

export const AUDIT_LIMITS = {
  actionMaxLength: 120,
  descriptionMaxLength: 500,
  identifierMaxLength: 128,
  companyNameMaxLength: 200,
  companyLookupTimeoutMs: 2000,
  metadataMaxBytes: 8192,
  metadataMaxDepth: 5,
  metadataMaxKeys: 50,
  metadataMaxArrayItems: 50,
  metadataStringMaxLength: 500,
} as const

export const REDACTED = "[REDACTED]"
