export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  login: "Login",
  "auth.logout": "Logout",
  configuracao_inicial: "Configuração inicial",
  convite_aceito: "Convite aceito",
  convite_reenviado: "Convite reenviado",
  convite_cancelado: "Convite cancelado",
  cliente_convidado: "Cliente convidado",
  cliente_atualizado: "Cliente atualizado",
  cliente_status_alterado: "Status de cliente alterado",
  cliente_removido: "Cliente removido",
  administrador_convidado: "Administrador convidado",
  administrador_funcao_alterada: "Função de administrador alterada",
  administrador_status_alterado: "Status de administrador alterado",
  administrador_removido: "Administrador removido",
}

export function activityActionLabel(actionType: string) {
  return (
    ACTIVITY_ACTION_LABELS[actionType] ??
    actionType
      .replace(/[._]/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase())
  )
}

export function activityActionTone(actionType: string): "default" | "destructive" | "warning" {
  if (actionType.includes("removido") || actionType === "auth.logout" || actionType.includes("cancelado")) {
    return "destructive"
  }
  if (actionType.includes("status_alterado") || actionType.includes("funcao_alterada")) {
    return "warning"
  }
  return "default"
}

export const ACTIVITY_TONE_CLASSES: Record<"default" | "destructive" | "warning", string> = {
  default: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  warning: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  destructive: "border-primary/40 bg-primary/10 text-primary",
}
