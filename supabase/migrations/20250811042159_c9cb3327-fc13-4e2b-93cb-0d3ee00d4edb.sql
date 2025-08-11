-- Add missing RLS policies to allow inserting logs and linking datasets to sources

-- 1) Allow inserting into upload_job_logs for own jobs
CREATE POLICY IF NOT EXISTS "job_logs_owner_ins"
ON public.upload_job_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.upload_jobs j
    WHERE j.id = upload_job_logs.job_id AND j.user_id = auth.uid()
  )
);

-- 2) Allow inserting links into data_source_datasets when the source is owned by the user
CREATE POLICY IF NOT EXISTS "dsd_owner_ins"
ON public.data_source_datasets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_sources s
    WHERE s.id = data_source_datasets.source_id AND s.created_by = auth.uid()
  )
);

-- Optional: prevent duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS uniq_data_source_datasets
ON public.data_source_datasets (source_id, dataset_id);
