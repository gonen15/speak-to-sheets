-- Tighten and ensure owner-scoped RLS; idempotent

-- datasets
alter table if exists public.datasets enable row level security;

-- Drop any permissive legacy policies if they exist
drop policy if exists "Public can insert datasets" on public.datasets;
drop policy if exists "Public can read datasets" on public.datasets;
drop policy if exists "Public can update datasets" on public.datasets;

-- Ensure owner policies exist
create policy if not exists "datasets insert (owner)"
  on public.datasets
  for insert
  with check (created_by = auth.uid());

create policy if not exists "datasets select (owner)"
  on public.datasets
  for select
  using (created_by = auth.uid());

create policy if not exists "datasets update (owner)"
  on public.datasets
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- dataset_models
alter table if exists public.dataset_models enable row level security;

-- Drop any permissive legacy policies if they exist
drop policy if exists "Public can insert dataset_models" on public.dataset_models;
drop policy if exists "Public can read dataset_models" on public.dataset_models;
drop policy if exists "Public can update dataset_models" on public.dataset_models;

-- Ensure owner policies exist
create policy if not exists "dataset_models insert (owner)"
  on public.dataset_models
  for insert
  with check (created_by = auth.uid());

create policy if not exists "dataset_models select (owner)"
  on public.dataset_models
  for select
  using (created_by = auth.uid());

create policy if not exists "dataset_models update (owner)"
  on public.dataset_models
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- semantic_models: restrict SELECT to owner
alter table if exists public.semantic_models enable row level security;

-- Drop any overly broad select policy if it exists
drop policy if exists "semantic_models select for authenticated" on public.semantic_models;

-- Ensure owner select policy exists
create policy if not exists "semantic_models select (owner)"
  on public.semantic_models
  for select
  using (created_by = auth.uid());