-- Enable required extension for UUIDs
create extension if not exists pgcrypto with schema public;

-- Timestamp update function (idempotent)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Monday boards table
create table if not exists public.monday_boards (
  id bigint primary key,
  name text,
  state text,
  workspace text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_monday_boards_updated_at
before update on public.monday_boards
for each row execute function public.update_updated_at_column();

-- Monday items table
create table if not exists public.monday_items (
  id bigint primary key,
  board_id bigint not null references public.monday_boards(id) on delete cascade,
  name text,
  group_id text,
  monday_created_at timestamptz,
  monday_updated_at timestamptz,
  column_values jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_monday_items_board on public.monday_items(board_id);
create index if not exists idx_monday_items_updated on public.monday_items(monday_updated_at);
create index if not exists idx_monday_items_columns_gin on public.monday_items using gin(column_values);

create trigger trg_monday_items_updated_at
before update on public.monday_items
for each row execute function public.update_updated_at_column();

-- Monday files (assets) metadata
create table if not exists public.monday_files (
  asset_id bigint primary key,
  item_id bigint not null references public.monday_items(id) on delete cascade,
  name text,
  file_type text,
  public_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_monday_files_item on public.monday_files(item_id);

create trigger trg_monday_files_updated_at
before update on public.monday_files
for each row execute function public.update_updated_at_column();

-- Sync logs
create table if not exists public.monday_sync_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  message text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.monday_boards enable row level security;
alter table public.monday_items enable row level security;
alter table public.monday_files enable row level security;
alter table public.monday_sync_logs enable row level security;

-- Public read-only policies (frontend can read; writes only via service role in Edge Function)
create policy if not exists "Public can read monday_boards"
  on public.monday_boards for select
  using (true);

create policy if not exists "Public can read monday_items"
  on public.monday_items for select
  using (true);

create policy if not exists "Public can read monday_files"
  on public.monday_files for select
  using (true);

create policy if not exists "Public can read monday_sync_logs"
  on public.monday_sync_logs for select
  using (true);
