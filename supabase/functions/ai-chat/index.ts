// Chat HE/EN with optional dataset context, leveraging aggregate_dataset when possible
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const auth = req.headers.get("Authorization") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const OPENAI = Deno.env.get("OPENAI_API_KEY");

  if (!auth?.startsWith("Bearer "))
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (!OPENAI)
    return new Response(JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const supabase = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });

  try {
    const { messages, datasetId } = await req.json();

    let schema: any = null;
    let rows: any[] = [];
    let sql: string | undefined;

    if (datasetId) {
      const { data: ds } = await supabase
        .from("uploaded_datasets")
        .select("id, name, columns")
        .eq("id", datasetId)
        .maybeSingle();
      if (ds) {
        schema = ds;
        const { data: sample } = await supabase
          .from("dataset_rows")
          .select("row")
          .eq("dataset_id", datasetId)
          .limit(50);
        schema.sample = (sample || []).map((x: any) => x.row);
      }

      // Try to plan aggregation
      const lastUser = (messages || []).slice().reverse().find((m: any) => m.role === "user")?.content || "";
      if (lastUser && typeof lastUser === "string") {
        const planRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI}` , "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.1,
            messages: [
              {
                role: "system",
                content:
                  "Return JSON plan if the question is analytical given columns; else {}. JSON: {metrics:[], dimensions?:[], dateRange?:{field?:string,from?:string,to?:string}}",
              },
              { role: "user", content: JSON.stringify({ columns: schema?.columns || [], question: lastUser }) },
            ],
          }),
        });
        const planJson = await planRes.json();
        let plan: any = {};
        try {
          plan = JSON.parse(planJson.choices?.[0]?.message?.content || "{}");
        } catch {}
        if (Array.isArray(plan.metrics) && plan.metrics.length) {
          const args = {
            p_dataset_id: datasetId,
            p_metrics: plan.metrics,
            p_dimensions: plan.dimensions || [],
            p_filters: [],
            p_date_from: plan?.dateRange?.from ?? null,
            p_date_to: plan?.dateRange?.to ?? null,
            p_date_field: plan?.dateRange?.field ?? null,
            p_limit: 1000,
          } as const;
          const { data, error } = await supabase.rpc("aggregate_dataset", args).maybeSingle();
          if (!error && data) {
            rows = (data as any).rows || [];
            sql = (data as any).sql || undefined;
          }
        }
      }
    }

    const answerRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a concise bilingual (HE/EN) business analyst. Reply in user's language. If rows provided, summarize insights with short bullets and thousand separators.",
          },
          { role: "user", content: JSON.stringify({ messages, schema: schema ? { name: schema.name, columns: schema.columns } : null, rows, sql }) },
        ],
      }),
    });
    const ans = await answerRes.json();
    const content = ans.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ ok: true, content, rows, sql }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-chat error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
