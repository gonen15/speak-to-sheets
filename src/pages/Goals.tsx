import React,{useEffect,useState} from "react";
import { supabase } from "@/lib/supabaseClient";
import { goalsSave, goalsSnapshot } from "@/lib/supabaseEdge";
import PageMeta from "@/components/common/PageMeta";

export default function Goals(){
  const [list,setList]=useState<any[]>([]);
  const [snaps,setSnaps]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);

  async function load(){
    setLoading(true);
    const { data } = await supabase.from("exec_goals").select("*").order("created_at",{ascending:false}).limit(100);
    setList(data||[]);
    const s = await goalsSnapshot(); setSnaps(s.snapshots||[]);
    setLoading(false);
  }

  async function onCreate(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=e.currentTarget as any;
    await goalsSave({
      department: f.department.value,
      source: f.source.value,
      refId: f.refId.value,
      metricKey: f.metric.value,
      label: f.label.value,
      period: f.period.value,
      target: Number(f.target.value||0),
      dateField: f.dateField.value || "date"
    });
    f.reset(); await load();
  }

  useEffect(()=>{ load(); },[]);

  const prog = (id:string)=> snaps.find(x=>x.goalId===id);
  const pct = (g:any)=> Math.min(100, Math.round(((prog(g.id)?.current||0)/(g.target||1))*100));

  return (
    <main className="container mx-auto py-8">
      <PageMeta title="Goals — CGC DataHub" description="Set and track executive goals and targets" path="/goals" />
      <h1 className="text-2xl font-semibold mb-3">Goals</h1>

      <form className="grid md:grid-cols-4 gap-3 card p-4 mb-6" onSubmit={onCreate}>
        <input className="input" name="label" placeholder="Label (e.g., Monthly Sales)" required/>
        <select className="input" name="department" required>
          <option value="">Select Department</option>
          <option value="sales">Sales</option>
          <option value="finance">Finance</option>
          <option value="marketing">Marketing</option>
        </select>
        <select className="input" name="source" required>
          <option value="">Select Source</option>
          <option value="dataset">Dataset</option>
          <option value="monday">Monday</option>
        </select>
        <input className="input" name="refId" placeholder="Dataset ID / Board ID" required/>
        <input className="input" name="metric" placeholder="Metric key (e.g., amount_total)" required/>
        <select className="input" name="period" required>
          <option value="">Select Period</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
        <input className="input" name="target" type="number" placeholder="Target number" required/>
        <input className="input" name="dateField" placeholder="date (optional)"/>
        <button className="btn col-span-full md:col-span-1" disabled={loading}>Create Goal</button>
      </form>

      <div className="grid md:grid-cols-2 gap-4">
        {(list||[]).map((g:any)=>(
          <div key={g.id} className="card p-4">
            <div className="flex justify-between mb-2">
              <div className="label">{g.label}</div>
              <div className={`text-sm ${prog(g.id)?.onTrack ? "text-green-600" : "text-amber-600"}`}>
                {prog(g.id)?.onTrack ? "On Track" : "At Risk"}
              </div>
            </div>
            <div className="text-sm opacity-70 mb-1">{g.department.toUpperCase()} • {g.source}:{g.ref_id} • {g.metric_key}</div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-2 bg-emerald-500" style={{width:`${pct(g)}%`}}></div>
            </div>
            <div className="text-sm mt-1">
              {Intl.NumberFormat().format(prog(g.id)?.current||0)} / {Intl.NumberFormat().format(g.target)} (Forecast: {Intl.NumberFormat().format(Math.round(prog(g.id)?.forecast||0))})
            </div>
          </div>
        ))}
      </div>
      
      {list.length === 0 && !loading && (
        <div className="card p-6 text-center">
          <div className="text-muted-foreground">No goals yet. Create your first goal above.</div>
        </div>
      )}
    </main>
  );
}