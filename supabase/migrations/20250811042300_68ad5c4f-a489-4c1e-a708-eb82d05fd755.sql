-- Add insert policy for upload_job_logs (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'upload_job_logs' AND polname = 'job_logs_owner_ins'
  ) THEN
    EXECUTE 'CREATE POLICY job_logs_owner_ins ON public.upload_job_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.upload_jobs j WHERE j.id = upload_job_logs.job_id AND j.user_id = auth.uid()))';
  END IF;
END$$;

-- Add insert policy for data_source_datasets (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_source_datasets' AND polname = 'dsd_owner_ins'
  ) THEN
    EXECUTE 'CREATE POLICY dsd_owner_ins ON public.data_source_datasets FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.data_sources s WHERE s.id = data_source_datasets.source_id AND s.created_by = auth.uid()))';
  END IF;
END$$;

-- Unique index to avoid duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS uniq_data_source_datasets
ON public.data_source_datasets (source_id, dataset_id);
