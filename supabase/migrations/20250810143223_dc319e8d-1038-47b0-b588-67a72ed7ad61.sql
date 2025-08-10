-- Re-run: exclude monday_items_flat column/policies (it's a view)

-- 1) Add created_by columns to Monday base tables
alter table if exists public.monday_boards
  add column if not exists created_by uuid default auth.uid();

alter table if exists public.monday_items
  add column if not exists created_by uuid default auth.uid();

alter table if exists public.monday_files
  add column if not exists created_by uuid default auth.uid();

-- 2) Replace broad SELECT policies with owner-scoped ones on base tables
-- Drop previous permissive policies
drop policy if exists "monday_boards read for authenticated" on public.monday_boards;
drop policy if exists "monday_items read for authenticated" on public.monday_items;
drop policy if exists "monday_files read for authenticated" on public.monday_files;

-- Create owner-based SELECT policies
create policy "monday_boards select (owner)"
  on public.monday_boards
  for select
  to authenticated
  using (created_by = auth.uid());

create policy "monday_items select (owner via board)"
  on public.monday_items
  for select
  to authenticated
  using (exists (
    select 1 from public.monday_boards b
    where b.id = monday_items.board_id
      and b.created_by = auth.uid()
  ));

create policy "monday_files select (owner via board)"
  on public.monday_files
  for select
  to authenticated
  using (exists (
    select 1 from public.monday_boards b
    where b.id = monday_files.board_id
      and b.created_by = auth.uid()
  ));
