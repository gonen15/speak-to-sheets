-- Create dataset_insights table with RLS
create table if not exists public.dataset_insights (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.uploaded_datasets(id) on delete cascade,
  title text not null,
  severity text not null check (severity in ('info','warning','critical')) default 'info',
  kind text,
  payload jsonb not null,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

alter table public.dataset_insights enable row level security;

-- Policy: select for owner
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='dataset_insights' and policyname='insights select (owner)'
  ) then
    create policy "insights select (owner)"
    on public.dataset_insights
    for select to authenticated
    using (
      exists (select 1 from public.uploaded_datasets d
              where d.id = dataset_id and d.created_by = auth.uid())
    );
  end if;
end $$;

-- Policy: insert for owner

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='dataset_insights' and policyname='insights insert (owner)'
  ) then
    create policy "insights insert (owner)"
    on public.dataset_insights
    for insert to authenticated
    with check (
      exists (select 1 from public.uploaded_datasets d
              where d.id = dataset_id and d.created_by = auth.uid())
    );
  end if;
end $$;

-- Ensure aggregate_dataset function exists (no-op if already exists)
-- Skipping replace because function is already present in this project.
