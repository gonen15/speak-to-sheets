// Evaluate alert_rules and emit Slack notifications when triggered.
// Requires: SLACK_WEBHOOK_URL (Server Secret). JWT verify.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

async function slack(msg:string){
  const url = Deno.env.get("SLACK_WEBHOOK_URL"); if (!url) return;
  await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text: msg })});
}

Deno.serve(async (req)=>{
  if (req.method==="OPTIONS") return new Response(null,{headers:cors});
  const auth = req.headers.get("Authorization"); if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization: auth }}});

  try{
    const { data: rules } = await supabase.from("alert_rules").select("*").eq("is_enabled", true).limit(200);
    const now = new Date();
    for (const r of (rules||[])){
      const from = new Date(now.getTime() - (Number(r.window_days||7) * 86400000));
      let value = 0; let rows:any[] = []; let ok = true; let sql:any = null;
      if (r.target_source === "dataset"){
        const args = { p_dataset_id: r.target_id, p_metrics:[r.metric||"count"], p_dimensions:[], p_filters:[], p_date_from: from.toISOString().slice(0,10), p_date_to: now.toISOString().slice(0,10), p_date_field: (r as any).date_field ?? null, p_limit: 1000 };
        const { data, error } = await supabase.rpc("aggregate_dataset", args).maybeSingle();
        if (error) { ok=false; } else { rows = (data as any)?.rows||[]; sql = (data as any)?.sql||null; }
      } else {
        const { data, error } = await supabase.rpc("aggregate_items", {
          p_board_id: r.target_id, p_metrics:[r.metric||"items"], p_dimensions:[], p_filters:[],
          p_date_from: from.toISOString().slice(0,10), p_date_to: now.toISOString().slice(0,10),
          p_date_field: (r as any).date_field ?? null, p_limit: 1000
        }).maybeSingle();
        if (error) { ok=false; } else { rows = (data as any)?.rows||[]; sql = (data as any)?.sql||null; }
      }
      if (!ok) continue;
      if (Array.isArray(rows) && rows[0]) {
        const first = rows[0] as any;
        const key = (r.metric === "count") ? "count" : (r.metric as any);
        value = Number(first[key] ?? 0);
      }
      let fired = false;
      const thr = Number(r.threshold);
      switch (r.op) {
        case ">": fired = value > thr; break;
        case ">=": fired = value >= thr; break;
        case "=": fired = value === thr; break;
        case "!=": fired = value !== thr; break;
        case "<=": fired = value <= thr; break;
        case "<": fired = value < thr; break;
      }
      if (fired){
        await supabase.from("alert_events").insert({ rule_id: (r as any).id, status:"triggered", value, payload:{ sql, rows }} as any);
        await slack(`⚠️ Alert "${(r as any).name}": ${r.metric} ${r.op} ${r.threshold} → value=${value}`);
      }
    }
    return new Response(JSON.stringify({ ok:true, count:(rules||[]).length }), { status:200, headers:{...cors,"Content-Type":"application/json"} });
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), { status:500, headers:{...cors,"Content-Type":"application/json"} });
  }
});
