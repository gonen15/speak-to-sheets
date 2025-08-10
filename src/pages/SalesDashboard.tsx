import React, { useMemo, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import { queryAggregate, saveSemanticModel } from "@/lib/supabaseEdge";
import KPI from "@/components/ui/KPI";
import PillFilters from "@/components/ui/PillFilters";
import Section from "@/components/ui/Section";
import ChartFrame from "@/components/charts/ChartFrame";
import { BarChart, Bar, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  async function seed(){
    if(!boardId) return;
    try{
      const bid=Number(boardId);
      await saveSemanticModel({
        boardId: bid,
        name: "Sales Pipeline",
        dateColumn: "date",
        dimensions: ["status","owner","brand","country","client"],
        metrics: [
          { key:"amount_total", label:"Total Amount", sql:"sum(coalesce(amount,0))", format:"currency" },
          { key:"items",        label:"Items",        sql:"count(*)",               format:"number"   },
          { key:"won",          label:"Won",          sql:"sum(case when status='Won' then 1 else 0 end)", format:"number" },
          { key:"lost",         label:"Lost",         sql:"sum(case when status='Lost' then 1 else 0 end)", format:"number" },
          { key:"win_rate",     label:"Win Rate",     sql:"(sum(case when status='Won' then 1 else 0 end)::decimal / nullif(sum(case when status in ('Won','Lost') then 1 else 0 end),0))", format:"percent" }
        ],
        glossary: { "לקוח":"client","מותג":"brand","בעלים":"owner","סטטוס":"status","סכום":"amount" }
      });
      toast({ title:"הוגדר מודל סמנטי", description:"לחצו רענון להטענת KPI" });
    }catch(e:any){ toast({ title:"שמירת מודל נכשלה", description:String(e), variant:"destructive" as any }); }
  }

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
      <PageMeta title="דשבורד מכירות — CGC DataHub" description="מדדים מרכזיים וניתוח מהיר לפי סטטוסים. בחרו לוח ותקופה ולחצו רענון." path="/dashboards/sales" />
      <header className="mb-2">
        <h1 className="text-xl font-semibold tracking-tight">דשבורד מכירות</h1>
        <p className="label mt-1">בחרו לוח ותקופה, ואז לחצו רענון.</p>
      </header>

      <div className="card" style={{padding:16}}>
        <div className="toolbar">
          <input className="input" style={{maxWidth:220}} placeholder="מספר לוח (Board ID)" value={boardId} onChange={(e)=>setBoardId(e.target.value)} />
          <PillFilters value={period} onChange={setPeriod} options={[{label:"רבעון נוכחי",value:"this_q"},{label:"שנה עד כה",value:"ytd"}]} />
          <button
            className="btn"
            onClick={() => { if (!loading) load(); }}
            disabled={loading || !boardId}
          >
            רענון
          </button>
          <button className="btn" onClick={seed} disabled={!boardId || loading}>שמור מודל</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI label="סכום כולל" value={kpi?.amount_total} format="currency"/>
        <KPI label="פריטים" value={kpi?.items} format="number"/>
        <KPI label="שיעור זכייה" value={kpi?.win_rate} format="percent"/>
      </div>

      <Section title="סכום לפי סטטוס">
        <ChartFrame data={series} render={(common)=> (
          <BarChart data={series}>
            {common}
            <Legend />
            <Bar dataKey="value" name="סכום" radius={[6,6,0,0]} />
          </BarChart>
        )} />
      </Section>
    </main>
  );
}
