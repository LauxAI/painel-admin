-- LAUXAI CORE — Admin Dashboard
-- Schema for public (shared Supabase project)

create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'ADMIN' check (role in ('OWNER', 'ADMIN')),
  status text not null default 'ativo' check (status in ('ativo', 'suspenso')),
  created_by uuid references public.admin_profiles (id),
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  responsible_name text not null,
  email text not null unique,
  whatsapp text,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  status text not null default 'pendente' check (status in ('pendente', 'ativo', 'suspenso', 'expirado', 'cancelado')),
  account_start_date date,
  account_expiration_date date,
  notes text,
  created_by uuid references public.admin_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('cliente', 'administrador')),
  email text not null,
  name text not null,
  role text check (role in ('OWNER', 'ADMIN')),
  client_account_id uuid references public.client_accounts (id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'cancelado', 'expirado')),
  expires_at timestamptz,
  created_by uuid references public.admin_profiles (id),
  accepted_at timestamptz,
  previous_invite_id uuid references public.invites (id),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text not null,
  action_type text not null,
  entity_type text,
  entity_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles (id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_client_accounts_status on public.client_accounts (status);
create index if not exists idx_client_accounts_company on public.client_accounts (company_id);
create index if not exists idx_invites_status on public.invites (status);
create index if not exists idx_invites_email on public.invites (email);
create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_action_type on public.activity_logs (action_type);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER, no params, safe for public)
-- ============================================================

create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and status = 'ativo'
  );
$$;

create or replace function public.is_active_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and status = 'ativo' and role = 'OWNER'
  );
$$;

create or replace function public.has_any_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_profiles);
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.companies enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.client_accounts enable row level security;
alter table public.invites enable row level security;
alter table public.activity_logs enable row level security;
alter table public.app_settings enable row level security;

-- companies
drop policy if exists "admins can read companies" on public.companies;
create policy "admins can read companies" on public.companies
  for select to authenticated using (public.is_active_admin());
drop policy if exists "admins can manage companies" on public.companies;
create policy "admins can manage companies" on public.companies
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

-- admin_profiles
drop policy if exists "self can read own profile" on public.admin_profiles;
create policy "self can read own profile" on public.admin_profiles
  for select to authenticated using (id = auth.uid() or public.is_active_admin());
drop policy if exists "owner can manage admin profiles" on public.admin_profiles;
create policy "owner can manage admin profiles" on public.admin_profiles
  for update to authenticated using (public.is_active_owner()) with check (public.is_active_owner());
drop policy if exists "owner can delete admin profiles" on public.admin_profiles;
create policy "owner can delete admin profiles" on public.admin_profiles
  for delete to authenticated using (public.is_active_owner());

-- client_accounts
drop policy if exists "admins can read clients" on public.client_accounts;
create policy "admins can read clients" on public.client_accounts
  for select to authenticated using (public.is_active_admin());
drop policy if exists "admins can manage clients" on public.client_accounts;
create policy "admins can manage clients" on public.client_accounts
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

-- invites
drop policy if exists "admins can read invites" on public.invites;
create policy "admins can read invites" on public.invites
  for select to authenticated using (public.is_active_admin());
drop policy if exists "admins can manage invites" on public.invites;
create policy "admins can manage invites" on public.invites
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

-- activity_logs
drop policy if exists "admins can read logs" on public.activity_logs;
create policy "admins can read logs" on public.activity_logs
  for select to authenticated using (public.is_active_admin());
drop policy if exists "admins can insert logs" on public.activity_logs;
create policy "admins can insert logs" on public.activity_logs
  for insert to authenticated with check (public.is_active_admin());

-- app_settings
drop policy if exists "admins can read settings" on public.app_settings;
create policy "admins can read settings" on public.app_settings
  for select to authenticated using (public.is_active_admin());
drop policy if exists "owner can manage settings" on public.app_settings;
create policy "owner can manage settings" on public.app_settings
  for all to authenticated using (public.is_active_owner()) with check (public.is_active_owner());
