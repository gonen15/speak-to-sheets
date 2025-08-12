import React, { useEffect, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import KPI from "@/components/ui/KPI";
import ChartFrame from "@/components/charts/ChartFrame";
import GlobalFilterBar from "@/components/ui/GlobalFilterBar";
import InsightCard from "@/components/ui/InsightCard";
import { JuliusSkeleton } from "@/components/ui/skeleton";
import { LineChart, Line, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { goalsSnapshot, insightsDigest } from "@/lib/supabaseEdge";
import DataSummaryReport from "@/components/ui/DataSummaryReport";
import SalesAnalysisDashboard from "@/components/ui/SalesAnalysisDashboard";

 type KPIMap = Record<string, { main:number; count:number; label:string }>;
 type Trend = { dept:string; series: Array<{date:string; value:number}> };
 type Top = { dept:string; dim:string; rows:any[] };

 export default function ExecutiveHub(){
  const [kpis,setKpis] = useState<KPIMap>({});
  const [trends,setTrends] = useState<Trend[]>([]);
  const [tops,setTops] = useState<Top[]>([]);
  const [goals,setGoals] = useState<any[]>([]);
  const [digest,setDigest] = useState<{summary:string;actions:any[]}|null>(null);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState<string|null>(null);
  
  // Filter states
  const [period, setPeriod] = useState("current_quarter");
  const [department, setDepartment] = useState("all");
  const [entity, setEntity] = useState("");

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

  async function loadExtras(){
    try{
      const g = await goalsSnapshot(); setGoals(g.snapshots||[]);
      const d = await insightsDigest(); if(d.ok) setDigest({ summary: d.summary, actions: d.actions||[] });
    }catch(e:any){ console.error("Failed to load extras:", e); }
  }

  useEffect(()=>{ load(); loadExtras(); },[]);

  return (
    <main className="container">
      <PageMeta title="דשבורד הנהלה — CGC DataHub" description="KPIs, מגמות ופירוקים מובילים מכל מקורות הנתונים" path="/executive" />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">דשבורד הנהלה</h1>
        <p className="text-muted-foreground">בחרו לוח ותקופה, ואז לחצו רענון.</p>
      </div>

      {/* Advanced Sales Analysis Dashboard */}
      <SalesAnalysisDashboard />
      
      <div className="my-8 border-t border-border"></div>

      {/* Global Filters */}
      <GlobalFilterBar
        period={period}
        onPeriodChange={setPeriod}
        department={department}
        onDepartmentChange={setDepartment}
        entity={entity}
        onEntityChange={setEntity}
        onApply={load}
        onReset={() => {
          setPeriod("current_quarter");
          setDepartment("all");
          setEntity("");
        }}
        loading={loading}
        className="mb-6"
      />

      {err ? (
        <div className="julius-card p-4 border-l-4 border-l-destructive mb-6">
          <div className="text-destructive">{err}</div>
        </div>
      ) : null}

      {/* KPI Cards */}
      <section className="julius-grid grid-cols-1 md:grid-cols-3 mb-8">
        {loading ? (
          <>
            <JuliusSkeleton variant="kpi" />
            <JuliusSkeleton variant="kpi" />
            <JuliusSkeleton variant="kpi" />
          </>
        ) : (
          ["sales","finance","marketing"].map((d)=> (
            <KPI 
              key={d}
              label={d === "sales" ? "מכירות" : d === "finance" ? "כספים" : "שיווק"}
              value={kpis?.[d]?.main ?? 0} 
              format={d==="sales"?"currency":"number"} 
              hint={kpis?.[d]?.label}
              delta={0.12} // Mock MoM change
              deltaLabel="לעומת חודש קודם"
            />
          ))
        )}
      </section>

      {/* Trend Charts */}
      <section className="julius-grid grid-cols-1 lg:grid-cols-2 mb-8">
        {loading ? (
          <>
            <JuliusSkeleton variant="chart" />
            <JuliusSkeleton variant="chart" />
          </>
        ) : (
          trends.map((t)=> (
            <div key={t.dept} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="julius-label">{t.dept.toUpperCase()} — מגמה (90 יום)</h3>
                <button className="julius-btn text-xs">הצג תחזית</button>
              </div>
              <ChartFrame 
                data={t.series} 
                height={280}
                render={(common)=> (
                  <LineChart data={t.series}>
                    {common}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                )} 
              />
            </div>
          ))
        )}
      </section>

      {/* Top Lists */}
      <section className="julius-grid grid-cols-1 lg:grid-cols-2 mb-8">
        {loading ? (
          <>
            <JuliusSkeleton variant="card" />
            <JuliusSkeleton variant="card" />
          </>
        ) : (
          tops.map((g)=> (
            <div key={g.dept+"-"+g.dim} className="julius-card p-6">
              <h3 className="julius-label mb-4">{g.dept.toUpperCase()} — מובילים לפי {g.dim}</h3>
              <div className="space-y-3">
                {(g.rows||[]).slice(0, 8).map((r:any,idx:number)=> (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm text-foreground truncate flex-1">{r[g.dim] ?? "—"}</span>
                    <span className="text-sm font-medium text-right ml-4">
                      {new Intl.NumberFormat().format(Number(r.value || r.count || r.amount_total || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Highlights & Actions */}
      <InsightCard
        title="תובנות והמלצות"
        summary={digest?.summary || "אין תובנות זמינות כרגע. המערכת תכין תובנות לאחר צבירת מספיק נתונים."}
        actions={digest?.actions?.map((a: any) => ({
          label: a.label,
          onClick: () => {
            // TODO: wire compare/drill using your queryAggregate
            console.log("Action:", a);
          },
          variant: "secondary" as const
        })) || [
          { label: "השווה שני לקוחות", onClick: () => console.log("Compare clients"), variant: "secondary" as const },
          { label: "פירוק לפי סטטוס", onClick: () => console.log("Breakdown by status"), variant: "primary" as const }
        ]}
        className="mb-8"
      />

      {/* Goals Progress */}
      {goals.length > 0 && (
        <section className="julius-grid grid-cols-1 md:grid-cols-3">
          <div className="col-span-full mb-6">
            <h2 className="julius-label">התקדמות יעדים</h2>
          </div>
          {goals.map((g:any)=>(
            <div key={g.goalId} className="julius-card p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="julius-label flex-1">{g.label}</h3>
                <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                  g.onTrack 
                    ? "bg-success/10 text-success" 
                    : "bg-warning/10 text-warning"
                }`}>
                  {g.onTrack ? "במסלול" : "בסיכון"}
                </div>
              </div>
              
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    g.onTrack ? "bg-success" : "bg-warning"
                  }`} 
                  style={{width:`${Math.min(100, Math.round((g.current/g.target)*100))}%`}}
                ></div>
              </div>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">נוכחי:</span>
                  <span className="font-medium">{Intl.NumberFormat().format(g.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">יעד:</span>
                  <span className="font-medium">{Intl.NumberFormat().format(g.target)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">תחזית:</span>
                  <span className="font-medium">{Intl.NumberFormat().format(g.forecast)}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
 }
