import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    const body = await req.json();
    const { kind, name, config, syncEnabled = false, syncIntervalMins = 60 } = body;

    if (!kind || !name || !config) {
      throw new Error('Missing required fields: kind, name, config');
    }

    if (!['drive_folder', 'csv_url', 'upload'].includes(kind)) {
      throw new Error('Invalid kind. Must be drive_folder, csv_url, or upload');
    }

    // Upsert data source
    const { data, error } = await supabase
      .from('data_sources')
      .upsert({
        kind,
        name,
        config,
        is_saved: true,
        sync_enabled: syncEnabled,
        sync_interval_mins: syncIntervalMins,
      }, {
        onConflict: 'created_by,kind,config',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, sourceId: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('library-save error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});