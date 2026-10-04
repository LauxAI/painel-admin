"use server"

/**
 * The support ticket system has no backing data model yet (no
 * `support_tickets` / `support_messages` tables — see the proposed schema
 * in v0_plans/strategic-guide.md). These actions throw a clear, user-facing
 * error instead of silently no-op'ing or writing fake data, so the UI can
 * surface the real blocker via toast once wired up.
 */
export async function createTicket(): Promise<never> {
  throw new Error("Indisponível: esta função requer a tabela 'support_tickets', ainda não implementada.")
}

export async function updateTicketStatus(): Promise<never> {
  throw new Error("Indisponível: esta função requer a tabela 'support_tickets', ainda não implementada.")
}

export async function assignTicket(): Promise<never> {
  throw new Error("Indisponível: esta função requer a tabela 'support_tickets', ainda não implementada.")
}

export async function sendTicketMessage(): Promise<never> {
  throw new Error("Indisponível: esta função requer a tabela 'support_messages', ainda não implementada.")
}
