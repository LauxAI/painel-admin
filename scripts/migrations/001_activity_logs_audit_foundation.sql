-- ============================================================================
-- 001_activity_logs_audit_foundation.sql
--
-- Evolução INCREMENTAL de public.activity_logs para a fundação de auditoria.
-- Base comprovada: scripts/schema.sql (colunas id, actor_id, actor_name,
-- action_type, entity_type, entity_id, description, metadata, created_at).
--
-- O que esta migration FAZ
--   * Adiciona colunas NULLABLE (nenhuma linha existente é alterada ou apagada).
--   * Adiciona CHECK constraints que aceitam NULL (linhas legadas continuam válidas).
--   * Adiciona índices para as consultas do Admin (empresa, domínio, correlação...).
--
-- O que esta migration NÃO faz
--   * Não remove, renomeia nem altera colunas existentes.
--   * Não altera RLS nem policies ("admins can read logs" / "admins can insert logs"
--     permanecem exatamente como estão). Não há policy de leitura por cliente/empresa:
--     o isolamento multi-tenant hoje é "somente administradores ativos leem".
--   * Não apaga logs e não cria rotina de retenção (ver "Retenção" abaixo).
--
-- Mapeamento evento -> coluna (nomes legados preservados)
--   action -> action_type | resource_type -> entity_type | resource_id -> entity_id
--   message -> description | metadata -> metadata (sanitizada no servidor)
--
-- Idempotente: pode ser executada mais de uma vez com segurança.
-- Aplicação MANUAL (não há migrations automáticas neste repositório).
-- ============================================================================

begin;

alter table public.activity_logs
  add column if not exists occurred_at      timestamptz,
  add column if not exists company_id       uuid references public.companies (id) on delete set null,
  add column if not exists actor_type       text,
  add column if not exists source           text,
  add column if not exists domain           text,
  add column if not exists provider         text,
  add column if not exists status           text,
  add column if not exists severity         text,
  add column if not exists request_id       text,
  add column if not exists correlation_id   text,
  add column if not exists parent_event_id  uuid references public.activity_logs (id) on delete set null,
  add column if not exists error_code       text,
  add column if not exists duration_ms      integer;

-- Valores padronizados (NULL permitido: eventos legados não possuem estes campos).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'activity_logs_actor_type_check') then
    alter table public.activity_logs add constraint activity_logs_actor_type_check
      check (actor_type is null or actor_type in ('admin','client','system','agent','webhook','unknown'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_logs_domain_check') then
    alter table public.activity_logs add constraint activity_logs_domain_check
      check (domain is null or domain in (
        'auth','admin','client','ai','automation','integration','webhook',
        'whatsapp','widget','scheduling','crm','billing','support','security'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_logs_status_check') then
    alter table public.activity_logs add constraint activity_logs_status_check
      check (status is null or status in ('started','success','failed','blocked','cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_logs_severity_check') then
    alter table public.activity_logs add constraint activity_logs_severity_check
      check (severity is null or severity in ('info','notice','warning','error','critical'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_logs_duration_ms_check') then
    alter table public.activity_logs add constraint activity_logs_duration_ms_check
      check (duration_ms is null or duration_ms >= 0);
  end if;
end $$;

-- Índices. O índice existente idx_activity_logs_created_at e idx_activity_logs_action_type permanecem.
-- Paginação por cursor (created_at desc, id desc).
create index if not exists idx_activity_logs_created_at_id
  on public.activity_logs (created_at desc, id desc);

-- Filtros do Admin. Parciais onde a coluna é majoritariamente NULL, para manter o índice pequeno.
create index if not exists idx_activity_logs_company_created
  on public.activity_logs (company_id, created_at desc, id desc) where company_id is not null;
create index if not exists idx_activity_logs_domain_created
  on public.activity_logs (domain, created_at desc, id desc) where domain is not null;
create index if not exists idx_activity_logs_entity
  on public.activity_logs (entity_type, entity_id, created_at desc);
create index if not exists idx_activity_logs_correlation
  on public.activity_logs (correlation_id) where correlation_id is not null;
create index if not exists idx_activity_logs_request
  on public.activity_logs (request_id) where request_id is not null;
create index if not exists idx_activity_logs_parent_event
  on public.activity_logs (parent_event_id) where parent_event_id is not null;
create index if not exists idx_activity_logs_severity_created
  on public.activity_logs (severity, created_at desc) where severity in ('warning','error','critical');

comment on column public.activity_logs.occurred_at     is 'Momento em que o evento ocorreu (created_at é o momento da gravação).';
comment on column public.activity_logs.company_id      is 'Empresa dona do evento. NULL = evento global/administrativo.';
comment on column public.activity_logs.actor_type      is 'admin | client | system | agent | webhook | unknown';
comment on column public.activity_logs.domain          is 'Domínio padronizado do evento (auth, admin, client, ai, ...).';
comment on column public.activity_logs.correlation_id  is 'Compartilhado por todos os eventos de um mesmo fluxo.';
comment on column public.activity_logs.parent_event_id is 'Evento que originou este (cadeia causal dentro de um correlation_id).';

-- ----------------------------------------------------------------------------
-- Retenção (PREPARADO, NÃO IMPLEMENTADO)
-- Uma futura política poderá filtrar por created_at/domain/severity usando os
-- índices acima. Nenhuma exclusão automática é criada aqui.
-- ----------------------------------------------------------------------------

commit;
