-- 1) Ensure extensions for scheduling and HTTP
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 2) monday_files table (metadata for Monday assets)
create table if not exists public.monday_files (
  id uuid primary key default gen_random_uuid(),
  board_id bigint,
  item_id bigint,
  asset_id text unique,
  file_name text,
  mime_type text,
  file_size integer,
  url text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for faster lookups
create index if not exists idx_monday_files_board on public.monday_files(board_id);
create index if not exists idx_monday_files_item on public.monday_files(item_id);

-- Enable RLS and allow public read
alter table public.monday_files enable row level security;
create policy if not exists "Public can read monday_files"
  on public.monday_files for select using (true);

-- Updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_monday_files_updated_at on public.monday_files;
create trigger trg_monday_files_updated_at
before update on public.monday_files
for each row execute function public.update_updated_at_column();

-- 3) Enhance monday_sync_logs structure (create if not exists, then add columns)
create table if not exists public.monday_sync_logs (
  id uuid primary key default gen_random_uuid(),
  status text,
  message text,
  meta jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz,
  board_ids bigint[],
  inserted_rows integer default 0,
  updated_rows integer default 0,
  unchanged_rows integer default 0,
  errors jsonb default '[]'::jsonb,
  type text default 'run',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns if the table existed previously
alter table public.monday_sync_logs add column if not exists started_at timestamptz default now();
alter table public.monday_sync_logs add column if not exists finished_at timestamptz;
alter table public.monday_sync_logs add column if not exists board_ids bigint[];
alter table public.monday_sync_logs add column if not exists inserted_rows integer default 0;
alter table public.monday_sync_logs add column if not exists updated_rows integer default 0;
alter table public.monday_sync_logs add column if not exists unchanged_rows integer default 0;
alter table public.monday_sync_logs add column if not exists errors jsonb default '[]'::jsonb;
alter table public.monday_sync_logs add column if not exists type text default 'run';
alter table public.monday_sync_logs add column if not exists created_at timestamptz not null default now();
alter table public.monday_sync_logs add column if not exists updated_at timestamptz not null default now();

-- RLS public read on logs
alter table public.monday_sync_logs enable row level security;
create policy if not exists "Public can read monday_sync_logs"
  on public.monday_sync_logs for select using (true);

-- Trigger for updated_at on logs
create index if not exists idx_monday_sync_logs_started_at on public.monday_sync_logs(started_at desc);
create index if not exists idx_monday_sync_logs_finished_at on public.monday_sync_logs(finished_at desc);

drop trigger if exists trg_monday_sync_logs_updated_at on public.monday_sync_logs;
create trigger trg_monday_sync_logs_updated_at
before update on public.monday_sync_logs
for each row execute function public.update_updated_at_column();

-- 4) Schedule CRON jobs to call a public edge function that triggers the sync
-- We'll call https://vdsryddwzhcnoksamkep.functions.supabase.co/monday-cron
-- Note: Supabase cron uses UTC; 07:00 Asia/Bangkok = 00:00 UTC

-- Daily 07:00 Asia/Bangkok (00:00 UTC)
insert into cron.job (jobname, schedule, command)
select 'monday_sync_daily', '0 0 * * *', $$select
  net.http_post(
    url => 'https://vdsryddwzhcnoksamkep.functions.supabase.co/monday-cron',
    headers => '{"Content-Type":"application/json"}'::jsonb,
    body => '{}'::jsonb
  );$$
where not exists (select 1 from cron.job where jobname = 'monday_sync_daily');

-- Every 4 hours
insert into cron.job (jobname, schedule, command)
select 'monday_sync_every_4h', '0 */4 * * *', $$select
  net.http_post(
    url => 'https://vdsryddwzhcnoksamkep.functions.supabase.co/monday-cron',
    headers => '{"Content-Type":"application/json"}'::jsonb,
    body => '{}'::jsonb
  );$$
where not exists (select 1 from cron.job where jobname = 'monday_sync_every_4h');
