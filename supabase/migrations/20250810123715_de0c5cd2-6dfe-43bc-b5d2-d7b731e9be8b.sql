-- Create private 'imports' bucket if not exists
insert into storage.buckets (id, name, public)
values ('imports','imports', false)
on conflict do nothing;

-- Table to store metadata about uploaded datasets
create table if not exists public.uploaded_datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null,
  source_url text,
  columns text[] not null,
  row_count int default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- Enable RLS and add policies for uploaded_datasets
alter table public.uploaded_datasets enable row level security;
-- Recreate policies safely
drop policy if exists "ud select" on public.uploaded_datasets;
create policy "ud select" on public.uploaded_datasets
  for select to authenticated
  using (created_by = auth.uid());

drop policy if exists "ud insert" on public.uploaded_datasets;
create policy "ud insert" on public.uploaded_datasets
  for insert to authenticated
  with check (created_by = auth.uid());

-- Flexible JSONB rows for datasets
create table if not exists public.dataset_rows (
  dataset_id uuid references public.uploaded_datasets(id) on delete cascade,
  row jsonb not null
);

-- Indexes to speed up queries
create index if not exists dataset_rows_dataset_idx on public.dataset_rows(dataset_id);
create index if not exists dataset_rows_row_gin on public.dataset_rows using gin(row);

-- Enable RLS and add policies for dataset_rows
alter table public.dataset_rows enable row level security;
-- Recreate policies safely
drop policy if exists "dr select" on public.dataset_rows;
create policy "dr select" on public.dataset_rows
  for select to authenticated
  using (
    exists (
      select 1
      from public.uploaded_datasets d
      where d.id = dataset_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "dr insert" on public.dataset_rows;
create policy "dr insert" on public.dataset_rows
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.uploaded_datasets d
      where d.id = dataset_id and d.created_by = auth.uid()
    )
  );