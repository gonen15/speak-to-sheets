-- A) DB — No-dup uploads + sync sources + revoke
-- 1) Add columns for uploaded_datasets (if not exists)
alter table public.uploaded_datasets
  add column if not exists file_hash text,
  add column if not exists source_url text,
  add column if not exists is_revoked boolean not null default false;

-- Ensure RLS is enabled
alter table public.uploaded_datasets enable row level security;

-- Replace select policy to hide revoked datasets
drop policy if exists "ud select" on public.uploaded_datasets;
drop policy if exists "datasets select owner" on public.uploaded_datasets;
create policy "datasets select owner" on public.uploaded_datasets
for select to authenticated
using (created_by = auth.uid() and is_revoked = false);

-- Allow owners to update their datasets (e.g., revoke/unrevoke)
drop policy if exists "datasets update owner" on public.uploaded_datasets;
create policy "datasets update owner" on public.uploaded_datasets
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Unique indexes to prevent duplicates per owner for active datasets
create unique index if not exists uploaded_datasets_owner_filehash_uk
  on public.uploaded_datasets (created_by, file_hash)
  where file_hash is not null and is_revoked = false;

create unique index if not exists uploaded_datasets_owner_sourceurl_uk
  on public.uploaded_datasets (created_by, source_url)
  where source_url is not null and is_revoked = false;

-- 2) Sync sources table
create table if not exists public.sync_sources (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.uploaded_datasets(id) on delete cascade,
  kind text not null check (kind in ('csv-url','google-sheet','drive-folder')),
  ref text not null,
  enabled boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

alter table public.sync_sources enable row level security;

-- RLS policies for sync_sources
drop policy if exists "sync select owner" on public.sync_sources;
drop policy if exists "sync ins owner" on public.sync_sources;
drop policy if exists "sync upd owner" on public.sync_sources;
create policy "sync select owner" on public.sync_sources
for select to authenticated
using (created_by = auth.uid());

create policy "sync ins owner" on public.sync_sources
for insert to authenticated
with check (created_by = auth.uid());

create policy "sync upd owner" on public.sync_sources
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 3) Revoke/restore dataset access function
create or replace function public.revoke_dataset_access(p_dataset_id uuid, p_revoke boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.uploaded_datasets
  set is_revoked = p_revoke
  where id = p_dataset_id
    and created_by = auth.uid();
end;
$$;