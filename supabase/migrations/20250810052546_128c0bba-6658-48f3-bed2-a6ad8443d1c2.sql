-- Create datasets persistence tables and storage bucket (retry with safe conditionals)
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

-- trigger for updated_at (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_datasets_updated_at'
  ) THEN
    CREATE TRIGGER update_datasets_updated_at
    BEFORE UPDATE ON public.datasets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
alter table public.datasets enable row level security;

-- Policies for datasets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'datasets' AND policyname = 'Public can read datasets'
  ) THEN
    CREATE POLICY "Public can read datasets" ON public.datasets FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'datasets' AND policyname = 'Public can insert datasets'
  ) THEN
    CREATE POLICY "Public can insert datasets" ON public.datasets FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'datasets' AND policyname = 'Public can update datasets'
  ) THEN
    CREATE POLICY "Public can update datasets" ON public.datasets FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2) Dataset models table
create table if not exists public.dataset_models (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null unique references public.datasets(id) on delete cascade,
  model jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_dataset_models_updated_at'
  ) THEN
    CREATE TRIGGER update_dataset_models_updated_at
    BEFORE UPDATE ON public.dataset_models
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

alter table public.dataset_models enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dataset_models' AND policyname = 'Public can read dataset_models'
  ) THEN
    CREATE POLICY "Public can read dataset_models" ON public.dataset_models FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dataset_models' AND policyname = 'Public can insert dataset_models'
  ) THEN
    CREATE POLICY "Public can insert dataset_models" ON public.dataset_models FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dataset_models' AND policyname = 'Public can update dataset_models'
  ) THEN
    CREATE POLICY "Public can update dataset_models" ON public.dataset_models FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3) Storage bucket for CSVs
insert into storage.buckets (id, name, public)
select 'datasets', 'datasets', true
where not exists (select 1 from storage.buckets where id = 'datasets');

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read dataset files'
  ) THEN
    CREATE POLICY "Public can read dataset files" ON storage.objects FOR SELECT USING (bucket_id = 'datasets');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can upload dataset files'
  ) THEN
    CREATE POLICY "Public can upload dataset files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'datasets');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can update dataset files'
  ) THEN
    CREATE POLICY "Public can update dataset files" ON storage.objects FOR UPDATE USING (bucket_id = 'datasets') WITH CHECK (bucket_id = 'datasets');
  END IF;
END $$;