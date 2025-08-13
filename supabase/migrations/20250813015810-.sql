-- Create edge function to fetch Google Sheets data
CREATE OR REPLACE FUNCTION public.fetch_google_sheet(sheet_id text, gid text DEFAULT '0')
RETURNS TABLE(csv_data text)
LANGUAGE plpgsql
AS $$
DECLARE
    result record;
BEGIN
    -- Call the sheet-fetch edge function
    SELECT content INTO result FROM http_get(
        'https://' || current_setting('app.settings.project_url') || '.supabase.co/functions/v1/sheet-fetch',
        jsonb_build_object('sheetId', sheet_id, 'gid', gid)
    );
    
    RETURN QUERY SELECT result.content::text;
END;
$$;