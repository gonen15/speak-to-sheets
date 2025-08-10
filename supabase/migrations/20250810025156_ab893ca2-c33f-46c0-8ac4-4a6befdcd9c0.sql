-- Full Monday schema setup (idempotent)
create extension if not exists pgcrypto with schema public;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Tables
create table if not exists public.monday_boards (
  id bigint primary key,
  name text,
  state text,
  workspace text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.monday_files (
  asset_id bigint primary key,
  item_id bigint not null references public.monday_items(id) on delete cascade,
  name text,
  file_type text,
  public_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monday_sync_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  message text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_monday_items_board on public.monday_items(board_id);
create index if not exists idx_monday_items_updated on public.monday_items(monday_updated_at);
create index if not exists idx_monday_items_columns_gin on public.monday_items using gin(column_values);
create index if not exists idx_monday_files_item on public.monday_files(item_id);

-- Triggers
create or replace trigger trg_monday_boards_updated_at
before update on public.monday_boards
for each row execute function public.update_updated_at_column();

create or replace trigger trg_monday_items_updated_at
before update on public.monday_items
for each row execute function public.update_updated_at_column();

create or replace trigger trg_monday_files_updated_at
before update on public.monday_files
for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.monday_boards enable row level security;
alter table public.monday_items enable row level security;
alter table public.monday_files enable row level security;
alter table public.monday_sync_logs enable row level security;

-- Policies (public read-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monday_boards' AND policyname='Public can read monday_boards'
  ) THEN
    CREATE POLICY "Public can read monday_boards" ON public.monday_boards FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monday_items' AND policyname='Public can read monday_items'
  ) THEN
    CREATE POLICY "Public can read monday_items" ON public.monday_items FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monday_files' AND policyname='Public can read monday_files'
  ) THEN
    CREATE POLICY "Public can read monday_files" ON public.monday_files FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='monday_sync_logs' AND policyname='Public can read monday_sync_logs'
  ) THEN
    CREATE POLICY "Public can read monday_sync_logs" ON public.monday_sync_logs FOR SELECT USING (true);
  END IF;
END $$;
