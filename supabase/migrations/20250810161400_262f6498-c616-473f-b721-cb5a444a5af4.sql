-- Stage 8: Goals + Auto-Insights + Action Cards
-- 1) טבלת יעדים
create table if not exists public.exec_goals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid(),
  department text not null check (department in ('sales','finance','marketing')),
  source text not null check (source in ('dataset','monday')),
  ref_id text not null,
  metric_key text not null,
  label text not null,
  period text not null check (period in ('monthly','quarterly')),
  target numeric not null,
  date_field text default 'date',
  start_date date,
  end_date date,
  notify boolean default true,
  created_at timestamptz default now()
);
create index if not exists exec_goals_owner_idx on public.exec_goals(created_by);
create index if not exists exec_goals_meta_idx on public.exec_goals(department, source, ref_id, metric_key);

alter table public.exec_goals enable row level security;
drop policy if exists "goals owner" on public.exec_goals;
create policy "goals owner" on public.exec_goals
for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

-- 2) צילום מצב יעדים (cache קצר)
create table if not exists public.exec_goal_snapshots (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.exec_goals(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  current_value numeric not null default 0,
  target numeric not null,
  forecast numeric,
  on_track boolean,
  computed_at timestamptz default now()
);
create index if not exists exec_goal_snapshots_idx on public.exec_goal_snapshots(goal_id, period_start);

alter table public.exec_goal_snapshots enable row level security;
drop policy if exists "snap owner" on public.exec_goal_snapshots;
create policy "snap owner" on public.exec_goal_snapshots
for select to authenticated using (
  exists(select 1 from public.exec_goals g where g.id = exec_goal_snapshots.goal_id and g.created_by = auth.uid())
);