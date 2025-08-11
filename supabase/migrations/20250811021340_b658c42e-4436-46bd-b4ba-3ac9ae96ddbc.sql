-- 1) טבלת עבודות העלאה
create table if not exists public.upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  source_kind text not null check (source_kind in ('file','drive_file','drive_folder','csv_url')),
  source_ref text,                  -- path בגיבוי, fileId בדרייב, או ה-URL
  name text not null,               -- שם קובץ ידידותי
  size_bytes bigint default 0,
  mime text,
  status text not null default 'queued',  -- queued|running|completed|failed
  progress int not null default 0,        -- 0-100
  dataset_id uuid,                        -- ה-id של ה-dataset שנוצר/הוחלף
  action text,                            -- created|replaced|exists|skipped
  stats jsonb not null default '{}'::jsonb, -- {rows, bad_rows, headers, duration_ms}
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists upload_jobs_user_idx on public.upload_jobs(user_id, created_at desc);

alter table public.upload_jobs enable row level security;
drop policy if exists jobs_owner on public.upload_jobs;
create policy jobs_owner on public.upload_jobs
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 2) לוגים פר-ג׳וב (trace)
create table if not exists public.upload_job_logs (
  id bigserial primary key,
  job_id uuid references public.upload_jobs(id) on delete cascade,
  ts timestamptz default now(),
  level text not null default 'info',   -- info|warn|error
  message text not null,
  ctx jsonb default '{}'::jsonb
);
create index if not exists upload_job_logs_job_idx on public.upload_job_logs(job_id, ts);

alter table public.upload_job_logs enable row level security;
drop policy if exists job_logs_owner on public.upload_job_logs;
create policy job_logs_owner on public.upload_job_logs
for select to authenticated
using (exists(select 1 from public.upload_jobs j where j.id=upload_job_logs.job_id and j.user_id=auth.uid()));