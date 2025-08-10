// Generate AI insights for a dataset (samples rows + schema hints → JSON insights)
// Requires: OPENAI_API_KEY (Server Secret). config.toml: verify_jwt=true

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, any>;

function inferTypes(sample: Row[]): Record<string, "number"|"date"|"string"> {
  const types: Record<string, "number"|"date"|"string"> = {};
  if (!sample.length) return types;
  const cols = Object.keys(sample[0] || {});
  for (const c of cols) {
    let n=0, d=0, s=0;
    for (const r of sample.slice(0, 200)) {
      const v = r[c];
      if (v == null || v === "") continue;
      if (!isNaN(Number(v))) n++;
      else if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) d++;
      else s++;
    }
    if (n >= d && n >= s) types[c] = "number";
    else if (d >= n && d >= s) types[c] = "date";
    else types[c] = "string";
  }
  return types;
}

async function callOpenAI(payload: any) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: [
          "You are a data analyst. Return structured business insights as JSON.",
          "Schema: {columns: string[], types: Record<string, 'number'|'date'|'string'>}",
          "Sample stats may be partial; avoid hallucinations; mark assumptions.",
          "Output JSON: {insights: [{title, severity:'info'|'warning'|'critical', kind, summary, suggestions: string[], chart?: {type:'bar'|'line'|'pie', x?:string, y?:string, series?:string}, metric?: {key:string, sql:string, format?:'number'|'currency'|'percent'}}]}"
        ].join("\n") },
        { role: "user", content: JSON.stringify(payload) }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json = await res.json();
  try {
    return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return { insights: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok:false, error:"Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type":"application/json" }});
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  try {
    const { datasetId, sampleSize = 500 } = await req.json();
    if (!datasetId) {
      return new Response(JSON.stringify({ ok:false, error:"datasetId is required" }), { status:400, headers: { ...corsHeaders, "Content-Type":"application/json" }});
    }

    // ownership
    const { data: ds, error: dsErr } = await supabase
      .from("uploaded_datasets")
      .select("id,name,columns")
      .eq("id", datasetId)
      .maybeSingle();
    if (dsErr || !ds) throw dsErr || new Error("Dataset not found or not allowed");

    // sample rows
    const { data: rows, error: rErr } = await supabase
      .from("dataset_rows")
      .select("row")
      .eq("dataset_id", datasetId)
      .limit(sampleSize);
    if (rErr) throw rErr;

    const sample: Row[] = (rows || []).map((x: any) => x.row);
    const types = inferTypes(sample);

    // quick stats
    const stats: Record<string, any> = {};
    for (const c of ds.columns || []) {
      const t = types[c];
      if (t === "number") {
        const nums = sample.map(r => Number(r[c])).filter(v => !isNaN(v));
        if (nums.length) {
          const sum = nums.reduce((a,b)=>a+b,0);
          const avg = sum / nums.length;
          const min = Math.min(...nums), max = Math.max(...nums);
          stats[c] = { count: nums.length, sum, avg, min, max };
        }
      } else if (t === "string") {
        const freq: Record<string, number> = {};
        for (const r of sample) { const v = String(r[c] ?? ""); if (!v) continue; freq[v] = (freq[v] || 0) + 1; }
        const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10);
        stats[c] = { distinct: Object.keys(freq).length, top };
      }
    }

    const ai = await callOpenAI({
      dataset: { id: ds.id, name: ds.name, columns: ds.columns, types, sample_count: sample.length },
      stats
    });

    const insights = Array.isArray(ai.insights) ? ai.insights : [];
    const inserts = insights.map((ins: any) => ({
      dataset_id: ds.id,
      title: String(ins.title || "Insight"),
      severity: (["info","warning","critical"].includes(String(ins.severity))) ? String(ins.severity) : "info",
      kind: String(ins.kind || null),
      payload: ins
    }));

    if (inserts.length) {
      const { error: insErr } = await supabase.from("dataset_insights").insert(inserts);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok:true, count: inserts.length, insights }), { status:200, headers: { ...corsHeaders, "Content-Type":"application/json" }});
  } catch (e:any) {
    return new Response(JSON.stringify({ ok:false, error: String(e?.message || e) }), { status:500, headers: { ...corsHeaders, "Content-Type":"application/json" }});
  }
});
