-- Ensure dataset_insights exists with owner-scoped RLS
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

alter table if exists public.dataset_insights enable row level security;

-- Recreate owner policies deterministically
 drop policy if exists "insights select (owner)" on public.dataset_insights;
 create policy "insights select (owner)"
  on public.dataset_insights
  for select
  using (
    exists (
      select 1 from public.uploaded_datasets d
      where d.id = dataset_insights.dataset_id
        and d.created_by = auth.uid()
    )
  );

 drop policy if exists "insights insert (owner)" on public.dataset_insights;
 create policy "insights insert (owner)"
  on public.dataset_insights
  for insert
  with check (
    exists (
      select 1 from public.uploaded_datasets d
      where d.id = dataset_insights.dataset_id
        and d.created_by = auth.uid()
    )
  );