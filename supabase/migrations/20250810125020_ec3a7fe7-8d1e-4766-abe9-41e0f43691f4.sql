-- Storage policies for private 'imports' bucket
-- Safely create only if they don't already exist (corrected pg_policies column name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'imports insert auth'
  ) THEN
    CREATE POLICY "imports insert auth" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'imports');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'imports select auth'
  ) THEN
    CREATE POLICY "imports select auth" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'imports');
  END IF;
END $$;