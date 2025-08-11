-- Enable inserting job logs for job owners
CREATE POLICY job_logs_owner_ins
ON public.upload_job_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.upload_jobs j
    WHERE j.id = upload_job_logs.job_id AND j.user_id = auth.uid()
  )
);

-- Enable inserting dataset links for source owners
CREATE POLICY dsd_owner_ins
ON public.data_source_datasets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.data_sources s
    WHERE s.id = data_source_datasets.source_id AND s.created_by = auth.uid()
  )
);

-- Avoid duplicate source-dataset links
CREATE UNIQUE INDEX IF NOT EXISTS uniq_data_source_datasets
ON public.data_source_datasets (source_id, dataset_id);
