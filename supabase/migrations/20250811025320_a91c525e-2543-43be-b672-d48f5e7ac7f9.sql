-- Ensure upload_jobs.user_id exists
ALTER TABLE public.upload_jobs
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();

-- Ensure jobs_owner policy exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'upload_jobs' AND policyname = 'jobs_owner'
  ) THEN
    CREATE POLICY jobs_owner ON public.upload_jobs
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Ensure upload_job_items select policy exists (do not remove existing insert/update policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'upload_job_items' AND policyname = 'uji_owner'
  ) THEN
    CREATE POLICY uji_owner ON public.upload_job_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.upload_jobs j
        WHERE j.id = upload_job_items.job_id AND j.user_id = auth.uid()
      )
    );
  END IF;
END$$;