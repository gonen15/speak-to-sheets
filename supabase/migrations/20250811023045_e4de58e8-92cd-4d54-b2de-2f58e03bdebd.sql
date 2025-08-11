-- הרחבת טבלת העבודות להעלאות/ייבוא (אם כבר קיימת, רק ALTER)
alter table public.upload_jobs
  add column if not exists total_items int,
  add column if not exists done_items int,
  add column if not exists current_file text;

-- פריטים לכל Job (קבצים דרייב/גיליונות וכו')
create table if not exists public.upload_job_items (
  id bigserial primary key,
  job_id uuid not null references public.upload_jobs(id) on delete cascade,
  file_id text,              -- Google Drive fileId
  name text not null,
  mime text,
  state text not null default 'queued',  -- queued|running|done|error
  dataset_id uuid,
  action text,               -- created|replaced|exists|skipped
  error text,
  bytes int,
  created_at timestamptz default now(),
  finished_at timestamptz
);
create index if not exists uji_job_idx on public.upload_job_items(job_id, state);

alter table public.upload_job_items enable row level security;

-- הרשאות
drop policy if exists uji_owner on public.upload_job_items;
create policy uji_owner on public.upload_job_items
for select to authenticated
using (
  exists(
    select 1 from public.upload_jobs j 
    where j.id = upload_job_items.job_id and j.user_id = auth.uid()
  )
);

-- לאפשר הוספה ע"י בעל ה-Job
drop policy if exists uji_owner_ins on public.upload_job_items;
create policy uji_owner_ins on public.upload_job_items
for insert to authenticated
with check (
  exists(
    select 1 from public.upload_jobs j 
    where j.id = upload_job_items.job_id and j.user_id = auth.uid()
  )
);
