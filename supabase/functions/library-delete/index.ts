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
    const { sourceId, deleteDatasets = false } = body;

    if (!sourceId) {
      throw new Error('Missing required field: sourceId');
    }

    if (deleteDatasets) {
      // Get related datasets
      const { data: relations } = await supabase
        .from('data_source_datasets')
        .select('dataset_id')
        .eq('source_id', sourceId);

      if (relations && relations.length > 0) {
        const datasetIds = relations.map(r => r.dataset_id);
        
        // Mark datasets as revoked and delete their rows
        await supabase
          .from('uploaded_datasets')
          .update({ is_revoked: true })
          .in('id', datasetIds);

        // Delete dataset rows
        await supabase
          .from('dataset_rows')
          .delete()
          .in('dataset_id', datasetIds);
      }
    }

    // Delete the data source (cascade will delete relations)
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', sourceId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('library-delete error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});