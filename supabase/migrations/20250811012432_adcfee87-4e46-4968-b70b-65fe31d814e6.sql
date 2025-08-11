-- 1) Data sources (folders / CSV URLs / uploads)
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  kind TEXT NOT NULL CHECK (kind IN ('drive_folder','csv_url','upload')),
  name TEXT NOT NULL,
  config JSONB NOT NULL,                     -- {folderId, folderUrl} / {url} / {uploadMeta}
  is_saved BOOLEAN NOT NULL DEFAULT false,   -- for exposure in /library
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_interval_mins INTEGER NOT NULL DEFAULT 60,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_sources_owner_idx ON public.data_sources(created_by, kind, is_saved);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS ds_owner_all ON public.data_sources
FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- 2) Source → datasets relationship
CREATE TABLE IF NOT EXISTS public.data_source_datasets (
  source_id UUID REFERENCES public.data_sources(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.uploaded_datasets(id) ON DELETE CASCADE,
  PRIMARY KEY (source_id, dataset_id)
);

ALTER TABLE public.data_source_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS dsd_owner_sel ON public.data_source_datasets
FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.data_sources s WHERE s.id = data_source_datasets.source_id AND s.created_by = auth.uid())
);