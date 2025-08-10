import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import Section from "@/components/ui/Section";
import ChartFrame from "@/components/charts/ChartFrame";
import KPI from "@/components/ui/KPI";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Legend } from "recharts";
import { getDashboard, runWidget } from "@/lib/supabaseEdge";

export default function DashboardView(){
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const [dash,setDash] = useState<any>(null);
  const [widgets,setWidgets] = useState<any[]>([]);
  const [data,setData] = useState<Record<string, any[]>>({});

  useEffect(()=>{(async()=>{
    if (!id) return;
    const res = await getDashboard(id);
    setDash(res.dashboard); setWidgets(res.widgets||[]);
  })()},[id]);

  async function loadWidget(w:any){
    const r = await runWidget(w.query);
    setData(prev => ({ ...prev, [w.id||w.title]: r.rows||[] }));
  }

  useEffect(()=>{ widgets.forEach(loadWidget); },[widgets]);

  return (
    <main className="container mx-auto py-8">
      <PageMeta title={`Dashboard — ${dash?.name || "View"}`} description="View your custom dashboard widgets." path="/dashboards/view" />
      <h1 className="text-2xl font-semibold mb-3">{dash?.name || "Dashboard"}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {widgets.map((w:any)=>(
          <div key={w.id||w.title} className="card p-3">
            <Section title={w.title}>
              {w.viz_type==="kpi" ? (
                <KPI label={w.title} value={Number((data[w.id||w.title]?.[0]?.[w.query?.metrics?.[0]||"count"])||0)} format={w.display?.format || "number"} />
              ) : w.viz_type==="bar" ? (
                <ChartFrame data={data[w.id||w.title]||[]} render={(common)=>(
                  <BarChart data={data[w.id||w.title]||[]}>{common}<Legend/><Bar dataKey={w.display?.yKey || "count"} name={w.display?.label || "Value"} radius={[6,6,0,0]}/></BarChart>
                )}/>
              ) : w.viz_type==="line" ? (
                <ChartFrame data={data[w.id||w.title]||[]} render={(common)=>(
                  <LineChart data={data[w.id||w.title]||[]}>{common}<Legend/><Line type="monotone" dataKey={w.display?.yKey || "count"} dot={false}/></LineChart>
                )}/>
              ) : w.viz_type==="pie" ? (
                <PieChart width={400} height={240}>
                  <Pie dataKey={w.display?.yKey || "count"} data={data[w.id||w.title]||[]} cx="50%" cy="50%" outerRadius={90} />
                  <Legend/>
                </PieChart>
              ) : (
                <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(data[w.id||w.title]||[], null, 2)}</pre>
              )}
            </Section>
          </div>
        ))}
      </div>
    </main>
  );
}
