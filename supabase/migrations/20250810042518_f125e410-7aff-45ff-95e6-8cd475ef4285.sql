-- Security hardening migration (idempotent)
-- 1) semantic_models: owner-based RLS and uniqueness on board_id
alter table public.semantic_models enable row level security;

-- created_by column to track ownership
alter table public.semantic_models
  add column if not exists created_by uuid default auth.uid();

-- ensure unique model per board via conditional check
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'semantic_models_board_unique'
      and conrelid = 'public.semantic_models'::regclass
  ) then
    alter table public.semantic_models add constraint semantic_models_board_unique unique (board_id);
  end if;
end $$;

-- replace overly-permissive public read policy
drop policy if exists "Public can read semantic_models" on public.semantic_models;

create policy if not exists "semantic_models select for authenticated"
  on public.semantic_models
  for select
  to authenticated
  using (true);

create policy if not exists "semantic_models insert by owner"
  on public.semantic_models
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy if not exists "semantic_models update by owner"
  on public.semantic_models
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- 2) monday_* tables: restrict reads to authenticated users
alter table public.monday_boards enable row level security;
alter table public.monday_items  enable row level security;
alter table public.monday_files  enable row level security;

drop policy if exists "Public can read monday_boards" on public.monday_boards;
drop policy if exists "Public can read monday_items"  on public.monday_items;
drop policy if exists "Public can read monday_files"  on public.monday_files;

create policy if not exists "monday_boards read for authenticated"
  on public.monday_boards
  for select
  to authenticated
  using (true);

create policy if not exists "monday_items read for authenticated"
  on public.monday_items
  for select
  to authenticated
  using (true);

create policy if not exists "monday_files read for authenticated"
  on public.monday_files
  for select
  to authenticated
  using (true);
