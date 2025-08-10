import React, { useEffect, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import KPI from "@/components/ui/KPI";
import ChartFrame from "@/components/charts/ChartFrame";
import { LineChart, Line, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

 type KPIMap = Record<string, { main:number; count:number; label:string }>;
 type Trend = { dept:string; series: Array<{date:string; value:number}> };
 type Top = { dept:string; dim:string; rows:any[] };

 export default function ExecutiveHub(){
  const [kpis,setKpis] = useState<KPIMap>({});
  const [trends,setTrends] = useState<Trend[]>([]);
  const [tops,setTops] = useState<Top[]>([]);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState<string|null>(null);

  async function load(){
    setLoading(true); setErr(null);
    try{
      const { data, error } = await supabase.functions.invoke<{ ok:boolean; kpis:KPIMap; trends:Trend[]; tops:Top[] }>("executive-snapshot", { body: {} });
      if (error || !data?.ok) throw new Error(error?.message || (data as any)?.error || "Failed");
      setKpis(data.kpis||{});
      setTrends(data.trends||[]);
      setTops(data.tops||[]);
    }catch(e:any){ setErr(e?.message || "Load failed"); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); },[]);

  return (
    <main className="container mx-auto py-8">
      <PageMeta title="Executive Hub — CGC DataHub" description="KPIs, trends, and top breakdowns across your data sources" path="/executive" />
      <h1 className="text-2xl font-semibold mb-4">Executive Hub</h1>
      {err ? <div className="card p-3">{err}</div> : null}

      <section className="grid md:grid-cols-3 gap-4">
        {["sales","finance","marketing"].map((d)=> (
          <div key={d} className="card p-4">
            <div className="label mb-2">{d.toUpperCase()}</div>
            <KPI label="Main" value={kpis?.[d]?.main ?? 0} format={d==="sales"?"currency":"number"} hint={kpis?.[d]?.label} />
            <div className="mt-2"><KPI label="Count" value={kpis?.[d]?.count ?? 0} format="number" /></div>
          </div>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-4 mt-6">
        {trends.map((t)=> (
          <div key={t.dept} className="card p-4">
            <div className="label mb-2">{t.dept.toUpperCase()} — Trend (90d)</div>
            <ChartFrame data={t.series} render={(common)=> (
              <LineChart data={t.series}>{common}<Legend/><Line type="monotone" dataKey="value" dot={false}/></LineChart>
            )} />
          </div>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-4 mt-6">
        {tops.map((g)=> (
          <div key={g.dept+"-"+g.dim} className="card p-4">
            <div className="label mb-2">{g.dept.toUpperCase()} — Top by {g.dim}</div>
            <ul className="space-y-1">
              {(g.rows||[]).map((r:any,idx:number)=> (
                <li key={idx} className="flex justify-between">
                  <span>{r[g.dim] ?? "—"}</span>
                  <span>{new Intl.NumberFormat().format(Number(r.value || r.count || r.amount_total || 0))}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="toolbar mt-6">
        <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>
    </main>
  );
 }
