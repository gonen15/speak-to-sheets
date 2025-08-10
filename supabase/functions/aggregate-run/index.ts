import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const H = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

async function sha1(input: string){
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

interface Payload {
  source: 'dataset'|'monday';
  refId: string;
  metrics: string[];
  dimensions?: string[];
  filters?: any[];
  dateRange?: { field?: string|null; from?: string|null; to?: string|null };
  limit?: number;
}

Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response(null, { headers: H });
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers:{...H, 'Content-Type':'application/json'} });

  const body: Payload = await req.json();
  const sig = await sha1(JSON.stringify({
    s: body.source, r: body.refId, m: body.metrics, d: body.dimensions||[], f: body.filters||[], dr: body.dateRange||{}, l: body.limit||1000
  }));

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization: auth }}});

  try{
    // check cache
    const nowIso = new Date().toISOString();
    const { data: cached } = await supabase.from('aggregate_cache').select('rows, sql, ttl_at').eq('signature', sig).gt('ttl_at', nowIso).maybeSingle();
    if (cached?.rows) {
      return new Response(JSON.stringify({ ok:true, rows: cached.rows, sql: cached.sql, cached:true }), { status:200, headers:{...H, 'Content-Type':'application/json'} });
    }

    // run aggregate
    let out: any = null;
    if (body.source === 'dataset'){
      const { data, error } = await supabase.rpc('aggregate_dataset', {
        p_dataset_id: body.refId,
        p_metrics: body.metrics,
        p_dimensions: body.dimensions ?? [],
        p_filters: body.filters ?? [],
        p_date_from: body.dateRange?.from ?? null,
        p_date_to: body.dateRange?.to ?? null,
        p_date_field: body.dateRange?.field ?? null,
        p_limit: body.limit ?? 1000,
      }).maybeSingle();
      if (error) throw error; out = data;
    } else {
      const { data, error } = await supabase.rpc('aggregate_items', {
        p_board_id: Number(body.refId),
        p_metrics: body.metrics,
        p_dimensions: body.dimensions ?? [],
        p_filters: body.filters ?? [],
        p_date_from: body.dateRange?.from ?? null,
        p_date_to: body.dateRange?.to ?? null,
        p_date_field: body.dateRange?.field ?? null,
        p_limit: body.limit ?? 1000,
      }).maybeSingle();
      if (error) throw error; out = data;
    }

    const ttl = new Date(Date.now() + 5*60*1000).toISOString();
    await supabase.from('aggregate_cache').insert({ signature: sig, rows: out?.rows ?? [], sql: out?.sql ?? null, ttl_at: ttl });

    return new Response(JSON.stringify({ ok:true, rows: out?.rows ?? [], sql: out?.sql ?? null, cached:false }), { status:200, headers:{...H, 'Content-Type':'application/json'} });
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), { status:500, headers:{...H, 'Content-Type':'application/json'} });
  }
});