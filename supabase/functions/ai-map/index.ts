import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function systemPrompt() {
  return `You are a data mapping assistant. Map CSV column names to canonical targets:
targets = [date, amount, customer, status, department]
Return JSON array of {column_name, target, confidence} with 0..1 confidence. Prefer local language synonyms (HE/EN).`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const datasetId: string | undefined = body?.datasetId;
    if (!datasetId) {
      return new Response(JSON.stringify({ ok: false, error: "datasetId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Try to read catalog; if missing, build minimal from sample rows
    let { data: cat } = await supabase
      .from("data_catalog")
      .select("*")
      .eq("dataset_id", datasetId)
      .maybeSingle();

    if (!cat) {
      const { data: sample } = await supabase
        .from("dataset_rows")
        .select("row")
        .eq("dataset_id", datasetId)
        .limit(50);
      const columns = sample?.[0]?.row
        ? Object.keys(sample[0].row).map((k) => ({ name: k }))
        : [];
      cat = { columns } as any;
    }

    const cols: string[] = (cat?.columns || []).map((c: any) => c.name).filter(Boolean);

    // 2) Call OpenAI to map columns -> canonical targets
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Columns: ${cols.join(", ")}`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    const aiJson = await aiResp.json().catch(() => ({}));
    const content = aiJson?.choices?.[0]?.message?.content ?? "[]";

    let mappings: Array<{ column_name: string; target: string; confidence?: number }> = [];
    try {
      mappings = JSON.parse(content);
    } catch {
      // simple heuristic fallback if model returned text instead of JSON
      const lower = content.toLowerCase();
      mappings = cols.map((c) => {
        const lc = c.toLowerCase();
        let target = "";
        if (/date|time|day|month|year|תאריך/.test(lc)) target = "date";
        else if (/amount|sum|total|price|cost|revenue|סכום|עלות|מחיר/.test(lc)) target = "amount";
        else if (/customer|client|account|לקוח|חברה/.test(lc)) target = "customer";
        else if (/status|state|סטטוס/.test(lc)) target = "status";
        else if (/dept|department|team|מחלקה/.test(lc)) target = "department";
        const confidence = target ? 0.5 : 0.0;
        return { column_name: c, target: target || c, confidence };
      });
      mappings = mappings.filter((m) => ["date", "amount", "customer", "status", "department"].includes(m.target));
    }

    // 3) Persist mappings
    if (Array.isArray(mappings) && mappings.length > 0) {
      const rows = mappings
        .filter((x) => x?.column_name && x?.target)
        .map((x) => ({
          dataset_id: datasetId,
          column_name: String(x.column_name),
          target: String(x.target),
          confidence: Number(x.confidence ?? 0),
        }));

      // Clear existing rows for this dataset then insert new ones
      await supabase.from("ai_column_mappings").delete().eq("dataset_id", datasetId);
      if (rows.length) {
        const { error: insErr } = await supabase.from("ai_column_mappings").insert(rows);
        if (insErr) throw insErr;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, mapped: Array.isArray(mappings) ? mappings.length : 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("ai-map error", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
