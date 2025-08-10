import React, { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import Section from "@/components/ui/Section";
import ChartFrame from "@/components/charts/ChartFrame";
import { BarChart, Bar, Legend } from "recharts";
import { runWidget, saveDashboard } from "@/lib/supabaseEdge";

export default function DashboardBuilder(){
  const [name,setName] = useState("My Dashboard");
  const [widgets,setWidgets] = useState<any[]>([]);
  const [preview,setPreview] = useState<any>({ rows:[], sql:null });
  const [query,setQuery] = useState<any>({ source:"dataset", datasetId:"", metrics:["count"], dimensions:[], limit:100 });

  async function previewRun(){
    if ((query.source==="dataset" && !query.datasetId) || (query.source==="monday" && !query.boardId)) return;
    const res = await runWidget(query);
    setPreview(res);
  }
  function addWidget(){
    setWidgets(w=>w.concat([{ title:"New Widget", viz_type:"bar", query:{...query}, display:{}, position:{} }]));
  }
  async function save(){
    const dashboard = { name, description:"", layout:[] };
    const payload = { dashboard, widgets };
    const res = await saveDashboard(payload);
    if (!res?.ok) alert("Save failed"); else alert("Saved!");
  }

  return (
    <main className="container mx-auto py-8">
      <PageMeta title="Dashboard Builder" description="Build dashboards from datasets and boards." path="/dashboards/builder" />
      <h1 className="text-2xl font-semibold mb-3">Dashboard Builder</h1>
      <div className="card p-4 mb-4">
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Dashboard name" value={name} onChange={(e)=>setName(e.target.value)} />
        </div>
      </div>

      <Section title="Query designer">
        <div className="flex flex-wrap gap-2">
          <select className="input" value={query.source} onChange={(e)=>setQuery({...query, source:e.target.value})}>
            <option value="dataset">Dataset</option>
            <option value="monday">Monday Board</option>
          </select>
          {query.source==="dataset" ? (
            <input className="input" placeholder="Dataset ID" value={query.datasetId||""} onChange={(e)=>setQuery({...query, datasetId:e.target.value})}/>
          ) : (
            <input className="input" placeholder="Board ID" value={query.boardId||""} onChange={(e)=>setQuery({...query, boardId:Number(e.target.value||0)})}/>
          )}
          <input className="input" placeholder="Metrics (comma)" value={(query.metrics||["count"]).join(",")} onChange={(e)=>setQuery({...query, metrics:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/>
          <input className="input" placeholder="Dimensions (comma)" value={(query.dimensions||[]).join(",")} onChange={(e)=>setQuery({...query, dimensions:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/>
          <button className="btn" onClick={previewRun}>Preview</button>
          <button className="btn" onClick={addWidget}>+ Add Widget</button>
          <button className="btn" onClick={save}>Save Dashboard</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="card p-3">
            <div className="label">Preview (rows)</div>
            <pre className="mt-2" style={{whiteSpace:"pre-wrap", maxHeight:240, overflow:"auto"}}>{JSON.stringify(preview.rows||[], null, 2)}</pre>
          </div>
          <div className="card p-3">
            <div className="label">Preview (chart)</div>
            <ChartFrame data={(preview.rows||[])} render={(common)=>(
              <BarChart data={(preview.rows||[])}>{common}<Legend/><Bar dataKey={Object.keys((preview.rows?.[0]||{value:0})).find(k=>k!=="count") || "count"} name="Value" radius={[6,6,0,0]}/></BarChart>
            )}/>
          </div>
        </div>
      </Section>

      <Section title="Widgets">
        <ul className="space-y-2">
          {widgets.map((w,idx)=>(
            <li key={idx} className="card p-3">
              <div className="flex items-center justify-between gap-3">
                <input className="input flex-1" value={w.title} onChange={(e)=>{ const v=[...widgets]; v[idx].title=e.target.value; setWidgets(v); }} />
                <span className="label">{w.viz_type}</span>
              </div>
              <div className="label mt-2 break-all">{JSON.stringify(w.query)}</div>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
