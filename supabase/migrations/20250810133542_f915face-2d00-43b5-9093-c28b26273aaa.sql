-- 1) Dashboards
create table if not exists public.user_dashboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  layout jsonb not null default '[]',
  is_default boolean default false,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
alter table public.user_dashboards enable row level security;
create policy if not exists "dashboards sel (owner)"
on public.user_dashboards for select to authenticated
using (created_by = auth.uid());
create policy if not exists "dashboards ins (owner)"
on public.user_dashboards for insert to authenticated
with check (created_by = auth.uid());
create policy if not exists "dashboards upd (owner)"
on public.user_dashboards for update to authenticated
using (created_by = auth.uid()) with check (created_by = auth.uid());

create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.user_dashboards(id) on delete cascade,
  title text not null,
  viz_type text not null check (viz_type in ('kpi','bar','line','pie','table')),
  query jsonb not null default '{}',
  display jsonb not null default '{}',
  position jsonb not null default '{}'
);
alter table public.dashboard_widgets enable row level security;
create policy if not exists "widgets sel (owner)"
on public.dashboard_widgets for select to authenticated
using (exists (select 1 from public.user_dashboards d where d.id = dashboard_id and d.created_by = auth.uid()));
create policy if not exists "widgets ins (owner)"
on public.dashboard_widgets for insert to authenticated
with check (exists (select 1 from public.user_dashboards d where d.id = dashboard_id and d.created_by = auth.uid()));
create policy if not exists "widgets upd (owner)"
on public.dashboard_widgets for update to authenticated
using (exists (select 1 from public.user_dashboards d where d.id = dashboard_id and d.created_by = auth.uid()))
with check (exists (select 1 from public.user_dashboards d where d.id = dashboard_id and d.created_by = auth.uid()));

-- 2) Alerts
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_source text not null check (target_source in ('dataset','monday')),
  target_id text not null,
  metric text not null,
  op text not null check (op in ('>','>=','=','<=','<','!=')),
  threshold numeric not null,
  dimensions text[] default '{}',
  date_field text,
  window_days int default 7,
  channel text not null default 'slack',
  is_enabled boolean default true,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
alter table public.alert_rules enable row level security;
create policy if not exists "alerts sel (owner)"
on public.alert_rules for select to authenticated
using (created_by = auth.uid());
create policy if not exists "alerts ins (owner)"
on public.alert_rules for insert to authenticated
with check (created_by = auth.uid());
create policy if not exists "alerts upd (owner)"
on public.alert_rules for update to authenticated
using (created_by = auth.uid()) with check (created_by = auth.uid());

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.alert_rules(id) on delete cascade,
  status text not null check (status in ('triggered','resolved')),
  value numeric,
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);
alter table public.alert_events enable row level security;
create policy if not exists "events sel (owner)"
on public.alert_events for select to authenticated
using (exists (select 1 from public.alert_rules r where r.id = rule_id and r.created_by = auth.uid()));
create policy if not exists "events ins (owner)"
on public.alert_events for insert to authenticated
with check (exists (select 1 from public.alert_rules r where r.id = rule_id and r.created_by = auth.uid()));

-- 3) Ensure semantic_models.board_id is unique (idempotent)
DO $$ BEGIN
  ALTER TABLE public.semantic_models ADD CONSTRAINT semantic_models_board_unique UNIQUE (board_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;