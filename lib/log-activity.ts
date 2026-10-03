import type { SupabaseClient } from "@supabase/supabase-js"

interface LogActivityParams {
  actorId: string | null
  actorName: string
  actionType: string
  entityType?: string
  entityId?: string
  description: string
  metadata?: Record<string, unknown>
}

export async function logActivity(supabase: SupabaseClient, params: LogActivityParams) {
  await supabase.from("activity_logs").insert({
    actor_id: params.actorId,
    actor_name: params.actorName,
    action_type: params.actionType,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    description: params.description,
    metadata: params.metadata ?? {},
  })
}
