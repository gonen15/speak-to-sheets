-- Apply schema updates and safely register CRON jobs
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- monday_files enrichments
alter table public.monday_files add column if not exists board_id bigint;
alter table public.monday_files add column if not exists mime_type text;
alter table public.monday_files add column if not exists file_size integer;
alter table public.monday_files add column if not exists uploaded_at timestamptz;
create unique index if not exists ux_monday_files_asset_id on public.monday_files(asset_id);
create index if not exists idx_monday_files_board on public.monday_files(board_id);
create index if not exists idx_monday_files_item on public.monday_files(item_id);

alter table public.monday_files enable row level security;

drop trigger if exists trg_monday_files_updated_at on public.monday_files;
create trigger trg_monday_files_updated_at
before update on public.monday_files
for each row execute function public.update_updated_at_column();

-- monday_sync_logs enrichments
alter table public.monday_sync_logs add column if not exists started_at timestamptz default now();
alter table public.monday_sync_logs add column if not exists finished_at timestamptz;
alter table public.monday_sync_logs add column if not exists board_ids bigint[];
alter table public.monday_sync_logs add column if not exists inserted_rows integer default 0;
alter table public.monday_sync_logs add column if not exists updated_rows integer default 0;
alter table public.monday_sync_logs add column if not exists unchanged_rows integer default 0;
alter table public.monday_sync_logs add column if not exists errors jsonb default '[]'::jsonb;
alter table public.monday_sync_logs add column if not exists type text default 'run';
alter table public.monday_sync_logs add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_monday_sync_logs_started_at on public.monday_sync_logs(started_at desc);
create index if not exists idx_monday_sync_logs_finished_at on public.monday_sync_logs(finished_at desc);

alter table public.monday_sync_logs enable row level security;

drop trigger if exists trg_monday_sync_logs_updated_at on public.monday_sync_logs;
create trigger trg_monday_sync_logs_updated_at
before update on public.monday_sync_logs
for each row execute function public.update_updated_at_column();

-- Schedule CRON using cron.schedule (positional args) and swallow errors if not allowed/already exists
DO $do$
BEGIN
  BEGIN
    PERFORM cron.schedule(
      'monday_sync_daily',
      '0 0 * * *',
      $$select net.http_post('https://vdsryddwzhcnoksamkep.functions.supabase.co/monday-cron', '{"Content-Type":"application/json"}'::jsonb, '{}'::jsonb);$$
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    PERFORM cron.schedule(
      'monday_sync_every_4h',
      '0 */4 * * *',
      $$select net.http_post('https://vdsryddwzhcnoksamkep.functions.supabase.co/monday-cron', '{"Content-Type":"application/json"}'::jsonb, '{}'::jsonb);$$
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;
END
$do$;
