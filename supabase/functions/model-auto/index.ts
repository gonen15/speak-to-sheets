// Auto-generate a semantic model from a dataset OR a Monday board.
// Requires: OPENAI_API_KEY. JWT verify in config.toml.
// For dataset: uses uploaded_datasets + sample rows.
// For Monday: uses monday_items_flat columns.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

type ColType = "number"|"date"|"string";
function typeGuess(values: any[]): ColType {
  let n=0,d=0,s=0;
  for (const v of values) {
    if (v==null || v==="") continue;
    if (!isNaN(Number(v))) n++; else if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) d++; else s++;
  }
  if (n>=d&&n>=s) return "number"; if (d>=n&&d>=s) return "date"; return "string";
}

Deno.serve(async (req)=>{
  if (req.method==="OPTIONS") return new Response(null,{headers:cors});
  const auth = req.headers.get("Authorization"); if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization: auth }}});

  try{
    const body = await req.json();
    const source = body?.source as "dataset"|"monday";
    if (!source) return new Response(JSON.stringify({ok:false,error:"source is required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});

    if (source==="dataset"){
      const datasetId = body?.datasetId as string;
      if (!datasetId) throw new Error("datasetId is required");
      const { data: ds, error: dsErr } = await supabase.from("uploaded_datasets").select("id,name,columns,created_by").eq("id", datasetId).maybeSingle();
      if (dsErr || !ds) throw dsErr || new Error("Dataset not found");

      const { data: rows } = await supabase.from("dataset_rows").select("row").eq("dataset_id", datasetId).limit(500);
      const sample = (rows||[]).map((x:any)=>x.row);
      const types: Record<string,ColType> = {};
      for (const c of (ds.columns||[])) types[c] = typeGuess(sample.map((r:any)=>r?.[c]));

      // Choose dimensions and numeric metrics safely
      const dims = (ds.columns||[])
        .filter(c => types[c]==="string" && String(c||"").trim() !== '' && !/^\d+(?:[\/-\.\s]\d+)*$/.test(String(c)) && String(c).length <= 60)
        .slice(0, 6);
      const nums = (ds.columns||[])
        .filter(c => types[c]==="number" && !/(^id$|_id$|^id_|_id$|id$)/i.test(String(c)))
        .slice(0, 10);

      // Pick date column by priority, then by first detected date
      const priority = ["date","transaction_date","created_at","updated_at"];
      const lowerCols = (ds.columns||[]).map((c:string)=>c.toLowerCase());
      let date_column: string | null = null;
      for (const p of priority){
        const idx = lowerCols.indexOf(p);
        if (idx >= 0) { date_column = (ds.columns||[])[idx]; break; }
      }
      if (!date_column) date_column = (ds.columns||[]).find((c:string)=>types[c]==="date") || null;

      // Build rich metrics for semantic model (count + sum/avg/min/max for numeric)
      const metrics = [
        { key:"count", label:"Rows", sql:"count(*)", format:"number" as const },
        ...nums.flatMap(k=>[
          { key:`sum_${k}`, label:`Sum ${k}`, sql:`sum( nullif((row->>'${k}')::numeric,'NaN') )`, format:"number" as const },
          { key:`avg_${k}`, label:`Avg ${k}`, sql:`avg( nullif((row->>'${k}')::numeric,'NaN') )`, format:"number" as const },
          { key:`min_${k}`, label:`Min ${k}`, sql:`min( nullif((row->>'${k}')::numeric,'NaN') )`, format:"number" as const },
          { key:`max_${k}`, label:`Max ${k}`, sql:`max( nullif((row->>'${k}')::numeric,'NaN') )`, format:"number" as const },
        ])
      ];

      // Persist a semantic_model "dataset pseudo-board": use negative board_id to avoid clash
      const board_id = Number(BigInt.asIntN(63, BigInt("0x"+datasetId.replace(/-/g,"").slice(0,12)))) * -1 || -Math.floor(Math.random()*1e9);
      const payload = { board_id, name: `Dataset ${ds.name}`, date_column, dimensions: dims, metrics, glossary:{} } as any;

      const { error: upErr } = await supabase.from("semantic_models").upsert(payload as any, { onConflict: "board_id" });
      if (upErr) throw upErr;

      // Also persist a lightweight dataset_model used by the UI
      const dsModel = { date_field: date_column, metric_keys: nums, dimensions: dims } as any;
      const { error: dmErr } = await supabase.from("dataset_models").upsert({ dataset_id: datasetId, model: dsModel } as any, { onConflict: "dataset_id" });
      if (dmErr) throw dmErr;

      return new Response(JSON.stringify({ ok:true, stage:"model-auto.dataset", model: payload, dataset_model: dsModel }), { status:200, headers:{...cors,"Content-Type":"application/json"} });
    }

    if (source==="monday"){
      const boardId = Number(body?.boardId);
      if (!boardId) throw new Error("boardId is required");
      // Peek columns from flattened view
      const { data: sample } = await supabase.from("monday_items_flat").select("date,status,owner,amount,brand,country,client").eq("board_id", boardId).limit(500);
      const colVals: Record<string, any[]> = { date:[], status:[], owner:[], amount:[], brand:[], country:[], client:[] };
      (sample||[]).forEach((r:any)=>Object.keys(colVals).forEach(k=>colVals[k].push(r[k])));
      const types: Record<string,ColType> = {}; Object.keys(colVals).forEach(k => types[k] = typeGuess(colVals[k]));
      const dims = Object.keys(types).filter(k=>types[k]==="string");
      const nums = Object.keys(types).filter(k=>types[k]==="number");
      const metrics = [
        { key: "items", label:"Items", sql:"count(*)", format:"number" as const },
        ...(nums.includes("amount") ? [{ key:"amount_total", label:"Total Amount", sql:"sum(coalesce(amount,0))", format:"currency" as const }] : [])
      ];
      const payload = { board_id: boardId, name:`Board ${boardId}`, date_column: types["date"]==="date" ? "date" : null, dimensions: dims, metrics, glossary:{} } as any;
      const { error: upErr } = await supabase.from("semantic_models").upsert(payload as any, { onConflict: "board_id" });
      if (upErr) throw upErr;
      return new Response(JSON.stringify({ ok:true, model: payload }), { status:200, headers:{...cors,"Content-Type":"application/json"} });
    }

    throw new Error("Unsupported source");
  } catch(e: any) {
    const err = String(e?.message||e);
    return new Response(JSON.stringify({ ok:false, stage:"model-auto", error: err }), { status:200, headers:{...cors,"Content-Type":"application/json"} });
  }
});
