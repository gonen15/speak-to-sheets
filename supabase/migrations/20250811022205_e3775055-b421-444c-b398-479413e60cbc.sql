-- Enable realtime for upload_jobs table
ALTER TABLE public.upload_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_jobs;

-- Enable realtime for upload_job_logs table  
ALTER TABLE public.upload_job_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_job_logs;