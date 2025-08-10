-- Add original_name column if missing
alter table public.uploaded_datasets
  add column if not exists original_name text;

-- Unique index: per user + case-insensitive name, only for non-revoked datasets
create unique index if not exists uploaded_datasets_owner_name_uk
  on public.uploaded_datasets (created_by, lower(coalesce(original_name, name)))
  where is_revoked = false;