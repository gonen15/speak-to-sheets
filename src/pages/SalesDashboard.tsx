import React, { useMemo, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import { queryAggregate } from "@/lib/supabaseEdge";
import KPI from "@/components/ui/KPI";
import PillFilters from "@/components/ui/PillFilters";
import Section from "@/components/ui/Section";
import ChartFrame from "@/components/charts/ChartFrame";
import { BarChart, Bar, Legend } from "recharts";

function quarterRange(d = new Date()){
  const m=d.getMonth(); const s=[0,3,6,9][Math.floor(m/3)];
  const from=new Date(d.getFullYear(),s,1); const to=d; const pad=(x:number)=>String(x).padStart(2,'0');
  const iso=(x:Date)=>`${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`; return {from:iso(from),to:iso(to)};
}

export default function SalesDashboard(){
  const [boardId,setBoardId]=useState("");
  const [period,setPeriod]=useState("this_q");
  const [loading,setLoading]=useState(false);
  const [kpi,setKpi]=useState<any|null>(null);
  const [series,setSeries]=useState<any[]>([]);

  const disabled = useMemo(()=>!boardId||loading,[boardId,loading]);

  async function load(){
    if(!boardId) return; setLoading(true);
    try{
      const bid=Number(boardId);
      const {from,to}=quarterRange();
      const range = period==="this_q" ? {from,to} : {from:"2025-01-01",to};
      const k = await queryAggregate({ boardId:bid, metrics:["amount_total","items","win_rate"], dateRange:range });
      const row = Array.isArray(k?.rows)?k.rows[0]:null; setKpi(row);
      const byStatus = await queryAggregate({ boardId:bid, metrics:["amount_total"], dimensions:["status"], dateRange:range, limit:1000 });
      setSeries((byStatus?.rows??[]).map((r:any)=>({ name:r.status||"Unknown", value:Number(r.amount_total||0) })));
    }catch(e:any){ alert(e?.message||"Load failed"); }
    finally{ setLoading(false); }
  }

  return (
    <main className="container">
      <PageMeta title="Sales Dashboard — CGC DataHub" description="Minimal sales analytics with clean KPIs and charts." path="/dashboards/sales" />
      <header className="mb-2">
        <h1 className="text-xl font-semibold tracking-tight">Sales Dashboard</h1>
      </header>

      <div className="card" style={{padding:16}}>
        <div className="toolbar">
          <input className="input" style={{maxWidth:220}} placeholder="Board ID" value={boardId} onChange={(e)=>setBoardId(e.target.value)} />
          <PillFilters value={period} onChange={setPeriod} options={[{label:"This Q",value:"this_q"},{label:"YTD",value:"ytd"}]} />
          <button className="btn" onClick={load} disabled={disabled}>{loading? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI label="Total Amount" value={kpi?.amount_total} format="currency"/>
        <KPI label="Items" value={kpi?.items} format="number"/>
        <KPI label="Win Rate" value={kpi?.win_rate} format="percent"/>
      </div>

      <Section title="Amount by Status">
        <ChartFrame data={series} render={(common)=> (
          <BarChart data={series}>
            {common}
            <Legend />
            <Bar dataKey="value" name="Amount" radius={[6,6,0,0]} />
          </BarChart>
        )} />
      </Section>
    </main>
  );
}
