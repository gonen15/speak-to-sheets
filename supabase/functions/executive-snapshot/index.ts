import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Cat = {
  id: string;
  source: "dataset" | "monday";
  ref_id: string; // uuid for dataset, numeric for monday but keep string
  name: string;
  department: string;
  date_field?: string | null;
  dimensions?: string[];
  metrics?: any[];
  score: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer "))
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });

  try {
    // Try catalog first; if missing/empty, fallback to a simple guess later
    let cats: Cat[] = [];
    {
      const { data, error } = await supabase
        .from("data_catalog")
        .select("id, source, ref_id, name, department, date_field, dimensions, metrics, score")
        .order("score", { ascending: false })
        .limit(12);
      if (!error && Array.isArray(data)) cats = data as Cat[];
    }

    const perDept: Record<string, Cat[]> = {};
    (cats || []).forEach((c: Cat) => {
      const d = c.department || "sales";
      perDept[d] = perDept[d] || [];
      if (perDept[d].length < 3) perDept[d].push(c);
    });

    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from90 = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    async function runAgg(c: Cat, metrics: string[], dims: string[] = []) {
      if (c.source === "dataset") {
        const { data, error } = await supabase
          .rpc("aggregate_dataset", {
            p_dataset_id: c.ref_id,
            p_metrics: metrics,
            p_dimensions: dims,
            p_filters: [],
            p_date_from: from90,
            p_date_to: to,
            p_date_field: c.date_field ?? null,
            p_limit: 1000,
          })
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const boardId = Number(c.ref_id);
        const { data, error } = await supabase
          .rpc("aggregate_items", {
            p_board_id: boardId,
            p_metrics: metrics,
            p_dimensions: dims,
            p_filters: [],
            p_date_from: from90,
            p_date_to: to,
            p_date_field: c.date_field ?? null,
            p_limit: 1000,
          })
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    }

    function pickMetric(c: Cat, pref: string[], fallback = "count") {
      const keys = Array.isArray(c.metrics) ? (c.metrics as any[]).map((m: any) => m.key) : [];
      const hit = pref.find((p) => keys.includes(p));
      return hit || (keys.find((k) => typeof k === "string" && k.startsWith("sum_")) || fallback);
    }

    const outKPIs: any = {};
    const outTrend: any[] = [];
    const outTop: any[] = [];
    const sources: any[] = [];

    for (const dept of Object.keys(perDept)) {
      const list = perDept[dept];
      if (!list?.length) continue;
      const c = list[0];
      sources.push({ dept, name: c.name, source: c.source, ref: c.ref_id });

      const metricMain =
        dept === "sales"
          ? pickMetric(c, ["amount_total", "revenue", "sum_amount"])
          : dept === "marketing"
          ? pickMetric(c, ["sum_spend", "spend", "cost"])
          : pickMetric(c, ["sum_total", "sum_amount", "expenses", "cost"]);
      const metricCount = "count";

      const trendDim = c.date_field || "date";
      try {
        const trend = await runAgg(c, [metricMain], [trendDim]);
        const series = (trend?.rows || []).map((r: any) => ({ date: r[trendDim] || r.date, value: Number(r[metricMain] || 0) }));
        outTrend.push({ dept, series });
      } catch (_) {
        outTrend.push({ dept, series: [] });
      }

      try {
        const kpi = await runAgg(c, [metricMain, metricCount], []);
        const krow = (kpi?.rows || [])[0] || {};
        outKPIs[dept] = {
          main: Number(krow[metricMain] || 0),
          count: Number(krow[metricCount] || 0),
          label: metricMain,
        };
      } catch (_) {
        outKPIs[dept] = { main: 0, count: 0, label: metricMain };
      }

      const dim = ["client", "customer", "category", "status", "owner"].find((d) => (c.dimensions || []).includes(d)) || (c.dimensions || [])[0];
      if (dim) {
        try {
          const top = await runAgg(c, [metricMain], [dim]);
          const rows = (top?.rows || [])
            .sort((a: any, b: any) => Number(b[metricMain] || 0) - Number(a[metricMain] || 0))
            .slice(0, 10)
            .map((r: any) => ({ ...r, value: Number(r[metricMain] || r.value || 0) }));
          outTop.push({ dept, dim, rows });
        } catch (_) {
          // ignore
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, kpis: outKPIs, trends: outTrend, tops: outTop, sources }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("executive-snapshot error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
