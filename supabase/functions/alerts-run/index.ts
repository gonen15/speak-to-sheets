// Evaluate alert_rules and emit Slack/Email notifications when triggered.
// Requires: SLACK_WEBHOOK_URL (optional), RESEND_API_KEY (optional). JWT verified.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

async function slack(msg:string){
  const url = Deno.env.get("SLACK_WEBHOOK_URL"); if (!url) return;
  try{ await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text: msg })}); }catch{ /* ignore */ }
}

async function email(to:string, subject:string, html:string){
  const key = Deno.env.get("RESEND_API_KEY"); if (!key) return;
  const resend = new Resend(key);
  try{ await resend.emails.send({ from: "Lovable Alerts <alerts@resend.dev>", to:[to], subject, html }); }catch{ /* ignore */ }
}

Deno.serve(async (req)=>{
  if (req.method==="OPTIONS") return new Response(null,{headers:cors});
  const auth = req.headers.get("Authorization"); if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization: auth }}});

  try{
    const { data: rules } = await supabase.from("alert_rules").select("*").eq("enabled", true).limit(200);
    const now = new Date();
    const to = now.toISOString().slice(0,10);
    const from30 = new Date(now.getTime()-30*86400000).toISOString().slice(0,10);

    const inv = async (payload:any)=>{
      const { data, error } = await supabase.functions.invoke('aggregate-run', { body: payload });
      if (error) throw new Error(error.message); return data;
    };

    for (const r of (rules||[])){
      const base = { source: (r as any).source, refId: String((r as any).ref_id), metrics: [(r as any).metric], dimensions: [], filters: [], dateRange: { from: from30, to, field: (r as any).date_field ?? null }, limit: 1000 } as any;
      let value = 0; let rows:any[] = []; let sql:string|null = null; let series:number[] = [];

      // current value (no dimension)
      try{
        const cur = await inv({ ...base });
        rows = (cur?.rows||[]); sql = cur?.sql||null;
        if (Array.isArray(rows) && rows[0]){
          const first = rows[0] as any; const key = (r as any).metric; value = Number(first[key] ?? first.value ?? 0);
        }
      }catch{ /* ignore */ }

      // zscore support: compute simple daily series
      if ((r as any).condition?.type === 'zscore'){
        const dateField = (r as any).date_field || 'date';
        try{
          const tr = await inv({ ...base, dimensions: [dateField] });
          const trows = tr?.rows||[]; series = trows.map((x:any)=> Number(x[(r as any).metric]||0)).filter((n:number)=>!Number.isNaN(n));
        }catch{ /* ignore */ }
      }

      // evaluate
      let fired = false; const cond:any = (r as any).condition || {}; const op = cond.op || '>'; const thr = Number(cond.value ?? 0);
      if (cond.type === 'zscore'){
        const mean = series.length? (series.reduce((a:number,b:number)=>a+b,0)/series.length) : 0;
        const sd = series.length? Math.sqrt(series.reduce((a:number,b:number)=>a + Math.pow(b-mean,2),0)/series.length) : 0;
        const z = sd>0? (value-mean)/sd : 0; const zthr = Number(cond.z ?? 2);
        fired = Math.abs(z) >= zthr;
      } else {
        switch(op){ case '>': fired = value > thr; break; case '>=': fired = value >= thr; break; case '=': fired = value === thr; break; case '!=': fired = value !== thr; break; case '<=': fired = value <= thr; break; case '<': fired = value < thr; break; }
      }

      if (fired){
        await supabase.from("alert_events").insert({ rule_id: (r as any).id, happened_at: new Date().toISOString(), payload:{ sql, rows, value, condition:(r as any).condition } } as any);
        const msg = `⚠️ Alert "${(r as any).name}": ${(r as any).metric} ${op} ${thr} → value=${value}`;
        await slack(msg);
        const emailTo = (r as any).channels?.email;
        if (emailTo && typeof emailTo === 'string') await email(emailTo, 'Alert Triggered', `<p>${msg}</p>`);
      }
    }

    return new Response(JSON.stringify({ ok:true, count:(rules||[]).length }), { status:200, headers:{...cors,"Content-Type":"application/json"} });
  }catch(e:any){
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), { status:500, headers:{...cors,"Content-Type":"application/json"} });
  }
});