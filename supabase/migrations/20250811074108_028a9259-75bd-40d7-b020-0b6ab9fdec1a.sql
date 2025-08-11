-- 1) Protect monday_items_flat with RLS
alter table public.monday_items_flat enable row level security;

drop policy if exists "monday_items_flat owner" on public.monday_items_flat;
create policy "monday_items_flat owner"
on public.monday_items_flat
for select
using (
  exists (
    select 1 from public.monday_boards b
    where b.id = monday_items_flat.board_id
      and b.created_by = auth.uid()
  )
);

-- 2) Tighten dataset_insights visibility
-- Remove blanket public read
drop policy if exists "Enable read access for all users" on public.dataset_insights;

-- 3) Lock monday_sync_logs behind admin role
-- Remove public read
drop policy if exists "Public can read monday_sync_logs" on public.monday_sync_logs;

-- Ensure has_role helper exists
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- Admin-only read of monday_sync_logs
drop policy if exists "monday logs admin select" on public.monday_sync_logs;
create policy "monday logs admin select"
on public.monday_sync_logs
for select
using (public.has_role(auth.uid(), 'admin'));

-- 4) Prevent self-escalation in user_roles
-- Remove self upsert/update policies
drop policy if exists "role self upsert" on public.user_roles;
drop policy if exists "role self update" on public.user_roles;

-- Add admin-only insert/update policies
create policy "roles admin insert"
on public.user_roles
for insert
with check (public.has_role(auth.uid(), 'admin'));

create policy "roles admin update"
on public.user_roles
for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- 5) Revoke direct access to master_flat (view/table) from anon/authenticated
revoke all on table public.master_flat from anon, authenticated;

-- 6) Make 'datasets' storage bucket private and add owner policies
update storage.buckets set public = false where id = 'datasets';

-- Storage object policies for 'datasets' bucket, owner by first path segment == auth.uid()
create policy "Datasets objects are readable by owner"
on storage.objects
for select
using (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Datasets objects can be inserted by owner"
on storage.objects
for insert
with check (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Datasets objects can be updated by owner"
on storage.objects
for update
using (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Datasets objects can be deleted by owner"
on storage.objects
for delete
using (
  bucket_id = 'datasets'
  and auth.role() = 'authenticated'
  and auth.uid()::text = (storage.foldername(name))[1]
);
