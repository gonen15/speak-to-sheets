// NL → aggregate_dataset plan → run RPC and answer
// Requires: OPENAI_API_KEY, verify_jwt=true

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ ok:false, error:"Unauthorized" }), { status:401, headers:{...corsHeaders,"Content-Type":"application/json"} });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });

  try {
    const { datasetId, question } = await req.json();
    if (!datasetId || !question) return new Response(JSON.stringify({ ok:false, error:"datasetId and question are required" }), { status:400, headers:{...corsHeaders,"Content-Type":"application/json"} });

    // metadata
    const { data: ds } = await supabase.from("uploaded_datasets").select("id,name,columns").eq("id", datasetId).maybeSingle();
    if (!ds) throw new Error("Dataset not found");

    // quick typing
    const { data: sampleRows } = await supabase.from("dataset_rows").select("row").eq("dataset_id", datasetId).limit(200);
    const sample = (sampleRows||[]).map((x:any)=>x.row);
    const types: Record<string,string> = {};
    for (const c of (ds.columns||[])) {
      let n=0,d=0,s=0;
      for (const r of sample) {
        const v = r?.[c]; if (v == null || v === "") continue;
        if (!isNaN(Number(v))) n++; else if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) d++; else s++;
      }
      types[c] = (n>=d && n>=s) ? "number" : (d>=n && d>=s) ? "date" : "string";
    }

    // LLM plan
    const key = Deno.env.get("OPENAI_API_KEY")!;
    const planRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${key}", "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type:"json_object" },
        messages: [
          { role: "system", content: [
            "You transform a user question into a JSON plan for an aggregate over a tabular dataset.",
            "Columns and types are provided. Only use available columns.",
            "Plan JSON: {metrics: string[], dimensions?: string[], filters?: [{field,op:'='|'!='|'in'|'like',value:any}], dateRange?:{field?:string,from?:string,to?:string}}",
            "Prefer 'count' metric by default, and a single dimension if user asks for a breakdown."
          ].join("\n") },
          { role: "user", content: JSON.stringify({ columns: ds.columns, types, question }) }
        ]
      })
    });
    if (!planRes.ok) throw new Error(`OpenAI plan ${planRes.status}`);
    const planJson = await planRes.json();
    const plan = JSON.parse(planJson.choices?.[0]?.message?.content || "{}");

    // Execute RPC
    const body = {
      p_dataset_id: datasetId,
      p_metrics: Array.isArray(plan.metrics) && plan.metrics.length ? plan.metrics : ["count"],
      p_dimensions: Array.isArray(plan.dimensions) ? plan.dimensions : [],
      p_filters: Array.isArray(plan.filters) ? plan.filters : [],
      p_date_from: plan?.dateRange?.from ?? null,
      p_date_to: plan?.dateRange?.to ?? null,
      p_date_field: plan?.dateRange?.field ?? null,
      p_limit: 1000
    };
    const { data, error } = await supabase.rpc("aggregate_dataset", body).maybeSingle();
    if (error) throw error;

    // Summarize
    const ansRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${key}", "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Explain results succinctly for a business user (1-3 lines). Use numbers with thousand separators." },
          { role: "user", content: JSON.stringify({ question, rows: data?.rows || [], sql: data?.sql || "" }) }
        ]
      })
    });
    const ansJson = await ansRes.json();
    const answer = ansJson.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ ok:true, plan, rows: data?.rows || [], sql: data?.sql, answer }), {
      status:200, headers:{...corsHeaders,"Content-Type":"application/json"}
    });

  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error:String(e?.message||e) }), { status:500, headers:{...corsHeaders,"Content-Type":"application/json"} });
  }
});
