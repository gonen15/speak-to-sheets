-- Stage 8: Goals (simple retry)
create table if not exists public.exec_goals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid(),
  department text not null,
  source text not null,
  ref_id text not null,
  metric_key text not null,
  label text not null,
  period text not null,
  target numeric not null,
  date_field text default 'date',
  start_date date,
  end_date date,
  notify boolean default true,
  created_at timestamptz default now()
);

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

alter table public.exec_goals enable row level security;
alter table public.exec_goal_snapshots enable row level security;