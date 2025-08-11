import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const H={ "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

async function sha256(obj:any){
  const input = new TextEncoder().encode(JSON.stringify(obj));
  const buf = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:H});
  const auth=req.headers.get("Authorization");
  if(!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...H,"Content-Type":"application/json"}});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {global:{headers:{Authorization:auth}}});

  try{
    const body=await req.json();
    // Raw payload
    const rawPayload={
      source: body.source,                          // 'dataset' | 'monday' | 'master'
      refId: body.refId != null ? String(body.refId) : null,
      metrics: Array.isArray(body.metrics) ? body.metrics : [],
      dimensions: Array.isArray(body.dimensions) ? body.dimensions : [],
      filters: Array.isArray(body.filters) ? body.filters : [],
      dateRange: body.dateRange || null,
      dateField: body.dateField || undefined,
      limit: body.limit || 1000
    } as {
      source: 'dataset'|'monday'|'master';
      refId: string|null;
      metrics: string[];
      dimensions: string[];
      filters: Array<{ field:string; op:string; value:any }>;
      dateRange: { from?: string|null; to?: string|null } | null;
      dateField?: string;
      limit: number;
    };

    // Basic source check
    if (!['dataset','monday','master'].includes(rawPayload.source)) {
      return new Response(JSON.stringify({ ok:false, error:'unknown source' }), { status:400, headers:{...H, 'Content-Type':'application/json'} });
    }

    // Sanitize helpers
    const cleanKey = (s:string) => String(s||'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,64);
    const allowOps = new Set(['=','!=','in','between','like']);

    // Build per-source allowlists
    let allowedFields = new Set<string>();
    let allowedMetrics = new Set<string>();
    let dateField: string|null = null;

    if (rawPayload.source === 'dataset') {
      if (!rawPayload.refId) return new Response(JSON.stringify({ ok:false, error:'datasetId required' }), { status:400, headers:{...H, 'Content-Type':'application/json'} });
      const { data: ds, error: eDs } = await supabase
        .from('uploaded_datasets')
        .select('columns')
        .eq('id', rawPayload.refId)
        .maybeSingle();
      if (eDs) throw eDs;
      const cols: string[] = Array.isArray(ds?.columns) ? ds!.columns : [];
      allowedFields = new Set(cols.map(cleanKey));
      // Metrics: allow 'count' + any column name (server casts to numeric if needed)
      allowedMetrics = new Set(['count', ...allowedFields]);
      dateField = rawPayload.dateField && allowedFields.has(cleanKey(rawPayload.dateField)) ? cleanKey(rawPayload.dateField) : null;
    } else if (rawPayload.source === 'monday') {
      if (!rawPayload.refId) return new Response(JSON.stringify({ ok:false, error:'boardId required' }), { status:400, headers:{...H, 'Content-Type':'application/json'} });
      const mondayDims = ['status','country','date_to','brand','client','amount','board_id','item_id','created_at','updated_at','item_name','date','owner'];
      allowedFields = new Set(mondayDims);
      dateField = (rawPayload.dateField && ['date','date_to','created_at','updated_at'].includes(rawPayload.dateField)) ? rawPayload.dateField : 'date';
      // Fetch model metrics to allow only defined metric keys
      const { data: model, error: eModel } = await supabase
        .from('semantic_models')
        .select('metrics')
        .eq('board_id', rawPayload.refId)
        .maybeSingle();
      if (eModel) throw eModel;
      const mkeys: string[] = (model?.metrics ? (model.metrics as any[]).map(m=>m?.key).filter(Boolean) : []);
      allowedMetrics = new Set(mkeys.map(cleanKey));
    } else if (rawPayload.source === 'master') {
      // Require a valid session but no admin gate; function aggregates will respect allowed fields
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) {
        return new Response(JSON.stringify({ ok:false, stage:'auth', error:'Unauthorized' }), { status:200, headers:{...H, 'Content-Type':'application/json'} });
      }
      // Fixed known fields of master_flat
      const masterDims = ['status','department','customer','source_name','amount','date'];
      allowedFields = new Set(masterDims);
      allowedMetrics = new Set(['rows','customers','amount_total']);
      dateField = 'date';
    }

    // Sanitize lists
    const metrics = (rawPayload.metrics||[]).map(cleanKey).filter(k=>allowedMetrics.size===0 ? k.length>0 : allowedMetrics.has(k));
    const dimensions = (rawPayload.dimensions||[]).map(cleanKey).filter(k=>allowedFields.has(k));

    // Clean filters
    const filters = (rawPayload.filters||[]).reduce<any[]>((acc, f)=>{
      const field = cleanKey(f.field);
      const op = String(f.op||'=').toLowerCase();
      if (!allowedFields.has(field)) return acc;
      if (!allowOps.has(op)) return acc;
      acc.push({ field, op, value: f.value });
      return acc;
    }, []);

    // Build sanitized payload used for cache signature and RPC args
    const payload = {
      source: rawPayload.source,
      refId: rawPayload.refId,
      metrics,
      dimensions,
      filters,
      dateRange: rawPayload.dateRange ? { from: rawPayload.dateRange.from ?? null, to: rawPayload.dateRange.to ?? null } : null,
      dateField,
      limit: Math.max(1, Math.min(10000, Number(rawPayload.limit)||1000))
    };

    const signature = await sha256(payload);

    // Cache HIT?
    const { data:hit } = await supabase
      .from("aggregate_cache")
      .select("rows,sql,ttl_at")
      .eq("signature", signature)
      .gte("ttl_at", new Date().toISOString())
      .maybeSingle();

    if(hit){
      return new Response(JSON.stringify({ ok:true, rows:hit.rows, sql:hit.sql, cached:true }), { status:200, headers:{...H,"Content-Type":"application/json"}});
    }

    // Miss → Run RPC
    const rpc = payload.source === "dataset" ? "aggregate_dataset" : payload.source === 'monday' ? "aggregate_items" : "aggregate_master";

    let rpcArgs:any = {};
    if (payload.source === 'dataset') {
      rpcArgs = {
        p_dataset_id: payload.refId,
        p_metrics: payload.metrics,
        p_dimensions: payload.dimensions,
        p_filters: payload.filters,
        p_date_from: payload.dateRange?.from ?? null,
        p_date_to: payload.dateRange?.to ?? null,
        p_date_field: payload.dateField ?? null,
        p_limit: payload.limit
      };
    } else if (payload.source === 'monday') {
      rpcArgs = {
        p_board_id: payload.refId,
        p_metrics: payload.metrics,
        p_dimensions: payload.dimensions,
        p_filters: payload.filters,
        p_date_from: payload.dateRange?.from ?? null,
        p_date_to: payload.dateRange?.to ?? null,
        p_date_field: payload.dateField ?? 'date',
        p_limit: payload.limit
      };
    } else {
      // master
      rpcArgs = {
        p_metrics: payload.metrics,
        p_dimensions: payload.dimensions,
        p_filters: payload.filters,
        p_date_from: payload.dateRange?.from ?? null,
        p_date_to: payload.dateRange?.to ?? null,
        p_limit: payload.limit
      };
    }

    const { data, error } = await supabase.rpc(rpc, rpcArgs).maybeSingle();
    if(error) throw error;

    // Save to cache (TTL 60m)
    const ttl = new Date(Date.now()+60*60*1000).toISOString();
    await supabase.from("aggregate_cache").insert({
      signature, rows: data?.rows||[], sql: data?.sql||null, ttl_at: ttl
    });

    return new Response(JSON.stringify({ ok:true, rows:data?.rows||[], sql:data?.sql||null, cached:false }), { status:200, headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, stage:'aggregate-run', error:String(e?.message||e) }), { status:200, headers:{...H,"Content-Type":"application/json"} });
  }
});