-- Stage 5 Migration (retry): Global Filters, Alerts, Cache, RBAC, Scheduler
-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- A) Global filters state
create table if not exists public.user_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
create unique index if not exists user_prefs_uk on public.user_prefs(user_id, key);
alter table public.user_prefs enable row level security;
drop policy if exists "prefs owner" on public.user_prefs;
create policy "prefs owner" on public.user_prefs
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- B) Alerts
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid(),
  name text not null,
  source text not null check (source in ('dataset','monday')),
  ref_id text not null,
  metric text not null,
  dimension text,
  condition jsonb not null default '{}'::jsonb,
  channels jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.alert_rules(id) on delete cascade,
  happened_at timestamptz default now(),
  payload jsonb not null
);
alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;
drop policy if exists "alerts owner" on public.alert_rules;
create policy "alerts owner" on public.alert_rules
for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "events owner" on public.alert_events;
create policy "events owner" on public.alert_events
for select to authenticated using (
  exists(select 1 from public.alert_rules r where r.id = alert_events.rule_id and r.created_by = auth.uid())
);

-- C) Query Cache
create table if not exists public.aggregate_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  signature text not null,
  rows jsonb not null,
  sql text,
  ttl_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists aggregate_cache_sig_idx on public.aggregate_cache(user_id, signature);
alter table public.aggregate_cache enable row level security;
drop policy if exists "cache owner" on public.aggregate_cache;
create policy "cache owner" on public.aggregate_cache
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- D) Basic RBAC table (owner-visible)
create table if not exists public.user_roles (
  user_id uuid primary key,
  role text not null check (role in ('admin','analyst','viewer'))
);
alter table public.user_roles enable row level security;
drop policy if exists "role self select" on public.user_roles;
create policy "role self select" on public.user_roles
for select to authenticated using (user_id = auth.uid());
drop policy if exists "role self upsert" on public.user_roles;
create policy "role self upsert" on public.user_roles
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "role self update" on public.user_roles;
create policy "role self update" on public.user_roles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- E) Scheduler: run alerts every 15 minutes
select
  cron.schedule(
    'alerts-run-every-15',
    '*/15 * * * *',
    $$
    select
      net.http_post(
        url := 'https://vdsryddwzhcnoksamkep.supabase.co/functions/v1/alerts-run',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3J5ZGR3emhjbm9rc2Fta2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTE3OTEsImV4cCI6MjA3MDM2Nzc5MX0.pDZKXqFDyHTz3JJHFXlLrBONBcM9w32Dc-jFCJ7Etdc"}'::jsonb,
        body := jsonb_build_object('time', now())
      ) as request_id;
    $$
  );
