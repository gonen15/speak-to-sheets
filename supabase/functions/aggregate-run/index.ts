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
    const payload={
      source: body.source,                          // 'dataset' | 'monday'
      refId: String(body.refId),
      metrics: body.metrics||[],
      dimensions: body.dimensions||[],
      filters: body.filters||[],
      dateRange: body.dateRange||null,
      dateField: body.dateField || "date",
      limit: body.limit || 1000
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
    const rpc = payload.source==="dataset" ? "aggregate_dataset" : "aggregate_items";
    const args:any = payload.source==="dataset"
      ? { p_dataset_id: payload.refId, p_board_id: null }
      : { p_dataset_id: null, p_board_id: payload.refId };

    const { data, error } = await supabase.rpc(rpc, {
      ...args,
      p_metrics: payload.metrics,
      p_dimensions: payload.dimensions,
      p_filters: payload.filters,
      p_date_from: payload.dateRange?.from ?? null,
      p_date_to: payload.dateRange?.to ?? null,
      p_date_field: payload.dateField,
      p_limit: payload.limit
    }).maybeSingle();
    if(error) throw error;

    // Save to cache (TTL 5m)
    const ttl = new Date(Date.now()+5*60*1000).toISOString();
    await supabase.from("aggregate_cache").insert({
      signature, rows: data?.rows||[], sql: data?.sql||null, ttl_at: ttl
    });

    return new Response(JSON.stringify({ ok:true, rows:data?.rows||[], sql:data?.sql||null, cached:false }), { status:200, headers:{...H,"Content-Type":"application/json"}});
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:500,headers:{...H,"Content-Type":"application/json"}});
  }
});