-- Create datasets persistence tables and storage bucket
-- 1) Datasets table
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null default 'csv',
  source_url text,
  columns jsonb not null default '[]'::jsonb,
  row_count int not null default 0,
  last_sync_at timestamptz,
  status text not null default 'ready',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- trigger for updated_at
create trigger if not exists update_datasets_updated_at
before update on public.datasets
for each row execute function public.update_updated_at_column();

-- Enable RLS and permissive policies (note: consider adding auth later)
alter table public.datasets enable row level security;
create policy if not exists "Public can read datasets"
  on public.datasets for select using (true);
create policy if not exists "Public can insert datasets"
  on public.datasets for insert with check (true);
create policy if not exists "Public can update datasets"
  on public.datasets for update using (true) with check (true);

-- 2) Dataset models table (to persist semantic model per dataset)
create table if not exists public.dataset_models (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null unique references public.datasets(id) on delete cascade,
  model jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger if not exists update_dataset_models_updated_at
before update on public.dataset_models
for each row execute function public.update_updated_at_column();

alter table public.dataset_models enable row level security;
create policy if not exists "Public can read dataset_models"
  on public.dataset_models for select using (true);
create policy if not exists "Public can insert dataset_models"
  on public.dataset_models for insert with check (true);
create policy if not exists "Public can update dataset_models"
  on public.dataset_models for update using (true) with check (true);

-- 3) Storage bucket for CSVs
insert into storage.buckets (id, name, public)
select 'datasets', 'datasets', true
where not exists (select 1 from storage.buckets where id = 'datasets');

-- Storage policies for the datasets bucket
create policy if not exists "Public can read dataset files"
  on storage.objects for select
  using (bucket_id = 'datasets');

create policy if not exists "Public can upload dataset files"
  on storage.objects for insert
  with check (bucket_id = 'datasets');

create policy if not exists "Public can update dataset files"
  on storage.objects for update
  using (bucket_id = 'datasets') with check (bucket_id = 'datasets');