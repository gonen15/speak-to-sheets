import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import KPI from "@/components/ui/KPI";
import Section from "@/components/ui/Section";
import ChartFrame from "@/components/charts/ChartFrame";
import { BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { aggregateDataset, generateInsights, nlQuery } from "@/lib/supabaseEdge";

export default function DatasetDashboard(){
  const { id } = useParams();
  const [meta,setMeta] = useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [dims,setDims]=useState<string[]>([]);
  const [metrics,setMetrics]=useState<string[]>(["count"]);
  const [series,setSeries]=useState<any[]>([]);
  const [kpi,setKpi]=useState<any|null>(null);
  const [dateField,setDateField]=useState<string>("");
  const [insights, setInsights] = useState<any[]>([]);
  const [q,setQ] = useState("");
  const [qa,setQa] = useState<{answer?:string, rows?:any[], sql?:string}>({});

  useEffect(()=>{(async()=>{
    if(!id) return;
    const { data, error } = await supabase.from("uploaded_datasets").select("*").eq("id", id).maybeSingle();
    if(!error && data){
      setMeta(data);
      const cols: string[] = data.columns || [];
      setDims(cols.slice(0,2));
      setMetrics(["count"]);
      const dateLike = cols.find(c => /date|time|day|month|created/i.test(c));
      if(dateLike) setDateField(dateLike);
      // load existing insights
      const { data: existing } = await supabase.from("dataset_insights").select("*").eq("dataset_id", id).order("created_at", { ascending: false });
      setInsights(existing || []);
    }
  })()},[id]);

  async function load(){
    if(!id) return; setLoading(true);
    try{
      const k = await aggregateDataset({
        datasetId: id!,
        metrics: metrics,
        dateRange: dateField ? { field: dateField } : undefined
      });
      const row = Array.isArray(k.data?.rows) ? (k.data.rows as any[])[0] : null;
      setKpi(row);

      const dim = dims[0];
      if (dim){
        const byDim = await aggregateDataset({
          datasetId: id!, metrics: metrics.includes("count")? ["count"] : [metrics[0]],
          dimensions: [dim], dateRange: dateField ? { field: dateField } : undefined, limit: 1000
        });
        const arr = (byDim.data?.rows || []) as any[];
        const key = metrics.includes("count") ? "count" : metrics[0];
        setSeries(arr.map(r => ({ name: r[dim] ?? "—", value: Number(r[key] ?? 0) })));
      } else {
        setSeries([]);
      }
    } finally { setLoading(false); }
  }

  async function runInsights(){
    if (!id) return;
    await generateInsights({ datasetId: id!, sampleSize: 500 });
    const { data } = await supabase.from("dataset_insights")
      .select("*").eq("dataset_id", id).order("created_at", { ascending: false });
    setInsights(data || []);
  }

  async function ask(){
    if(!id || !q.trim()) return;
    setLoading(true);
    try{
      const res = await nlQuery({ datasetId: id!, question: q.trim() });
      setQa({ answer: res.answer, rows: res.rows, sql: res.sql });
      const rows = res.rows || [];
      if (rows.length && Object.keys(rows[0]||{}).length >= 2) {
        const dim = Object.keys(rows[0]).find(k => k !== "count") || Object.keys(rows[0])[0];
        const metric = Object.keys(rows[0]).find(k => k === "count") || Object.keys(rows[0])[1];
        setSeries(rows.map((r:any)=>({ name: r[dim] ?? "—", value: Number(r[metric] ?? 0) })));
      }
    } finally { setLoading(false); }
  }

  const disabled = useMemo(()=>loading || !id,[loading,id]);

  return (
    <main className="container" role="main">
      <PageMeta title={`Dataset Dashboard — ${meta?.name || "Dataset"}`} description="AI insights and chat over your dataset." path={`/dashboards/dataset/${id || ""}`}/>
      <header className="card" style={{padding:16, marginBottom:16}}>
        <h1 style={{margin:0,fontSize:18}}>{meta?.name || "Dataset"}</h1>
        <div className="toolbar" style={{marginTop:8}}>
          <select className="input" value={dims[0]||""} onChange={(e)=>setDims([e.target.value||""])}>
            <option value="">(no dimension)</option>
            {(meta?.columns||[]).map((c:string)=>(<option key={c} value={c}>{c}</option>))}
          </select>
          <select className="input" value={metrics[0]||"count"} onChange={(e)=>setMetrics([e.target.value])}>
            <option value="count">count(*)</option>
            {(meta?.columns||[]).map((c:string)=>(<option key={c} value={c}>{`sum(${c})`}</option>))}
          </select>
          <select className="input" value={dateField||""} onChange={(e)=>setDateField(e.target.value||"")}>
            <option value="">(no date)</option>
            {(meta?.columns||[]).map((c:string)=>(<option key={c} value={c}>{c}</option>))}
          </select>
          <button className="btn" disabled={disabled} onClick={()=>{ if(!loading) load(); }}>Refresh</button>
        </div>
      </header>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16, marginBottom:16}}>
        <KPI label="Rows" value={kpi?.count ?? meta?.row_count ?? 0} format="number" />
        <div className="card" style={{padding:16, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div>
            <div className="label">AI Insights</div>
            <div className="value" style={{fontSize:18}}>{insights.length || 0}</div>
          </div>
          <button className="btn" disabled={disabled} onClick={()=>{ if(!loading) runInsights(); }}>Generate</button>
        </div>
      </section>

      <Section title={dims[0] ? `Distribution by ${dims[0]}` : "Overview"}>
        <ChartFrame data={series} render={(common)=>(
          <BarChart data={series}>
            {common}<Legend /><Bar dataKey="value" name="Value" radius={[6,6,0,0]} />
          </BarChart>
        )}/>
      </Section>

      <Section title="Insights">
        <div className="space-y-2">
          {(insights||[]).map((ins: any) => (
            <div key={ins.id || ins.title} className="card" style={{padding:12, borderLeft: "6px solid " + (
              ins.severity === "critical" ? "#ef4444" : ins.severity === "warning" ? "#f59e0b" : "#94a3b8"
            )}}>
              <div style={{fontWeight:600}}>{ins.title}</div>
              <div className="label" style={{marginTop:4}}>{ins.payload?.summary || ""}</div>
              {Array.isArray(ins.payload?.suggestions) && ins.payload.suggestions.length ? (
                <ul style={{marginTop:8}}>
                  {ins.payload.suggestions.map((s:string, i:number)=>(<li key={i} className="label">• {s}</li>))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ask your data">
        <div className="toolbar" style={{marginBottom:12}}>
          <input className="input" placeholder="לדוגמה: כמה פריטים לכל סטטוס ברבעון הנוכחי?" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") ask(); }} />
          <button className="btn" onClick={ask} disabled={disabled || !q.trim()}>Ask</button>
        </div>
        {qa.answer ? <div className="card" style={{padding:12}}><div className="label">Answer</div><div>{qa.answer}</div></div> : null}
        {qa.sql ? <div className="card" style={{padding:12, marginTop:8}}><div className="label">SQL (debug)</div><pre style={{whiteSpace:"pre-wrap"}}>{qa.sql}</pre></div> : null}
      </Section>
    </main>
  );
}
