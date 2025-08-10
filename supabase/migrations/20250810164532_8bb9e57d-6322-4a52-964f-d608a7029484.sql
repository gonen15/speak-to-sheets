-- Complete RLS policies for aggregate_cache
DROP POLICY IF EXISTS cache_owner ON public.aggregate_cache;
CREATE POLICY cache_owner ON public.aggregate_cache
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add TTL index for cache cleanup
CREATE INDEX IF NOT EXISTS aggregate_cache_ttl_idx ON public.aggregate_cache(ttl_at);

-- Create Monday board mappings table for dynamic mapping
CREATE TABLE IF NOT EXISTS public.monday_board_mappings (
  board_id bigint PRIMARY KEY,
  date_id text,
  timeline_id text,
  status_id text,
  person_id text,
  numbers_id text,
  client_id text,
  brand_id text,
  country_id text
);

-- Insert example mapping (replace 123456789 with real board ID)
INSERT INTO public.monday_board_mappings
  (board_id, date_id, timeline_id, status_id, person_id, numbers_id, client_id, brand_id, country_id)
VALUES
  (123456789, 'date', 'timeline', 'status', 'person', 'numbers', 'client', 'brand', 'country')
ON CONFLICT (board_id) DO UPDATE SET
  date_id=EXCLUDED.date_id,
  timeline_id=EXCLUDED.timeline_id,
  status_id=EXCLUDED.status_id,
  person_id=EXCLUDED.person_id,
  numbers_id=EXCLUDED.numbers_id,
  client_id=EXCLUDED.client_id,
  brand_id=EXCLUDED.brand_id,
  country_id=EXCLUDED.country_id;