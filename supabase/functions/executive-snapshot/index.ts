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
    // Build catalog from user's uploaded datasets (avoids missing data_catalog columns)
    let cats: Cat[] = [];
    {
      const { data, error } = await supabase
        .from("uploaded_datasets")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(12);
      if (!error && Array.isArray(data)) {
        cats = (data as any[]).map((d) => ({
          id: d.id,
          source: "dataset",
          ref_id: d.id,
          name: d.name || "Dataset",
          department: "sales",
          date_field: "date",
          dimensions: ["customer", "status", "department"],
          metrics: [{ key: "amount_total", sql: "sum(amount)" }, { key: "count", sql: "count(*)" }],
          score: 1,
        }));
      }
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

    // accept optional filters/dateRange from client
    let reqBody: any = {};
    try { reqBody = await req.json(); } catch {}
    const globalFilters = Array.isArray(reqBody?.filters) ? reqBody.filters : [];
    const dateRange = reqBody?.dateRange ?? { from: from90, to, field: null };

    async function runAgg(c: Cat, metrics: string[], dims: string[] = []) {
      // Leverage aggregate-run for caching and consistent filtering
      const { data, error } = await supabase.functions.invoke<{ ok:boolean; rows:any[]; sql?:string }>("aggregate-run", {
        body: {
          source: c.source,
          refId: c.ref_id,
          metrics,
          dimensions: dims,
          filters: globalFilters,
          dateRange,
          limit: 1000,
        },
      });
      if (error) throw new Error(error.message);
      return data;
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
        const series = (trend?.rows || []).map((r: any) => ({ date: r[trendDim] || r.date, value: Number(r[metricMain] || r.value || 0) }));
        outTrend.push({ dept, series });
      } catch (_) {
        outTrend.push({ dept, series: [] });
      }

      try {
        const kpi = await runAgg(c, [metricMain, metricCount], []);
        const krow = (kpi?.rows || [])[0] || {};
        outKPIs[dept] = {
          main: Number(krow[metricMain] || krow.value || 0),
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
            .sort((a: any, b: any) => Number(b[metricMain] || b.value || 0) - Number(a[metricMain] || a.value || 0))
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
