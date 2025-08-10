-- Security hardening migration (skip existing unique constraint)
-- semantic_models RLS and owner policies
alter table public.semantic_models enable row level security;
alter table public.semantic_models add column if not exists created_by uuid default auth.uid();

drop policy if exists "Public can read semantic_models" on public.semantic_models;
DROP POLICY IF EXISTS "semantic_models select for authenticated" ON public.semantic_models;
DROP POLICY IF EXISTS "semantic_models insert by owner" ON public.semantic_models;
DROP POLICY IF EXISTS "semantic_models update by owner" ON public.semantic_models;

create policy "semantic_models select for authenticated"
  on public.semantic_models
  for select
  to authenticated
  using (true);

create policy "semantic_models insert by owner"
  on public.semantic_models
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "semantic_models update by owner"
  on public.semantic_models
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- monday tables RLS: authenticated-only reads
alter table public.monday_boards enable row level security;
alter table public.monday_items  enable row level security;
alter table public.monday_files  enable row level security;

drop policy if exists "Public can read monday_boards" on public.monday_boards;
drop policy if exists "Public can read monday_items"  on public.monday_items;
drop policy if exists "Public can read monday_files"  on public.monday_files;

DROP POLICY IF EXISTS "monday_boards read for authenticated" ON public.monday_boards;
DROP POLICY IF EXISTS "monday_items read for authenticated" ON public.monday_items;
DROP POLICY IF EXISTS "monday_files read for authenticated" ON public.monday_files;

create policy "monday_boards read for authenticated"
  on public.monday_boards
  for select
  to authenticated
  using (true);

create policy "monday_items read for authenticated"
  on public.monday_items
  for select
  to authenticated
  using (true);

create policy "monday_files read for authenticated"
  on public.monday_files
  for select
  to authenticated
  using (true);
