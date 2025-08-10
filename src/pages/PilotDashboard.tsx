import React, { useEffect, useMemo, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import Section from "@/components/ui/Section";
import KPI from "@/components/ui/KPI";
import ChartFrame from "@/components/charts/ChartFrame";
import { BarChart, Bar, Legend } from "recharts";
import Papa from "papaparse";
import { callEdge } from "@/lib/supabaseEdge";

const SHEET_ID = "1HpQLYm0cbEigB2E18t-VZPhVYnWNEjmh";
const GID = "498710003";

type Row = Record<string, any>;

export default function PilotDashboard(){
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricCol, setMetricCol] = useState<string>("");
  const [dimensionCol, setDimensionCol] = useState<string>("");

  const headers = useMemo(() => rows[0] ? Object.keys(rows[0]) : [], [rows]);
  const numericCols = useMemo(() => headers.filter(h => rows.some(r => typeof r[h] === 'number')), [headers, rows]);
  const stringCols = useMemo(() => headers.filter(h => !numericCols.includes(h)), [headers, numericCols]);

  const total = useMemo(() => {
    if (!metricCol) return 0;
    return rows.reduce((sum, r) => sum + (Number(r[metricCol]) || 0), 0);
  }, [rows, metricCol]);

  const series = useMemo(() => {
    if (!dimensionCol || !metricCol) return [] as { name: string; value: number }[];
    const map = new Map<string, number>();
    for (const r of rows) {
      const k = String(r[dimensionCol] ?? "לא ידוע");
      const v = Number(r[metricCol]) || 0;
      map.set(k, (map.get(k) || 0) + v);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows, dimensionCol, metricCol]);

  async function load(){
    setLoading(true); setError(null);
    try{
      const res = await callEdge<{ ok: boolean; csv?: string; error?: string }>("sheet-fetch", {
        body: { sheetId: SHEET_ID, gid: GID }
      });
      if (!res.ok || !res.csv) throw new Error(res.error || "טעינת הגיליון נכשלה");
      const parsed = Papa.parse(res.csv, { header: true, dynamicTyping: true });
      const data = (parsed.data as any[]).filter(Boolean) as Row[];
      setRows(data);
      // Heuristics for defaults
      const numFirst = data.length ? Object.keys(data[0]).find(k => typeof data[0][k] === 'number') : undefined;
      const dimFirst = data.length ? Object.keys(data[0]).find(k => typeof data[0][k] !== 'number') : undefined;
      setMetricCol(prev => prev || (numFirst || ""));
      setDimensionCol(prev => prev || (dimFirst || ""));
    }catch(e:any){ setError(e?.message || "שגיאה כללית"); }
    finally{ setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="container">
      <PageMeta title="דשבורד פיילוט — Google Sheets" description="טעינה ויזואלית של דוח Google Sheets לפיילוט." path="/dashboards/pilot" />
      <header className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>דשבורד פיילוט (Google Sheets)</h1>
        <p className="label" style={{ marginTop: 6 }}>טוען את הגיליון שסיפקת ובונה דשבורד מינימלי.</p>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="label" htmlFor="metric">מדד:</label>
            <select id="metric" className="input" style={{ maxWidth: 220 }} value={metricCol} onChange={e=>setMetricCol(e.target.value)}>
              <option value="">בחרו עמודת מספר</option>
              {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="label" htmlFor="dim">ממד:</label>
            <select id="dim" className="input" style={{ maxWidth: 220 }} value={dimensionCol} onChange={e=>setDimensionCol(e.target.value)}>
              <option value="">בחרו עמודת טקסט</option>
              {stringCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn" onClick={() => { if (!loading) load(); }} disabled={loading}>
              רענון
            </button>
          </div>
        </div>
        {error && <div className="label" style={{ color: '#b91c1c', marginTop: 8 }}>שגיאה: {error}</div>}
      </header>

      {rows.length === 0 && !loading && (
        <Section title="אין נתונים">
          <div className="label">לא נטענו נתונים. ודאו שהקובץ ציבורי/זמין וקיימות כותרות.</div>
        </Section>
      )}

      {rows.length > 0 && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 16 }}>
          <KPI label="סכום" value={total} format="number" />
          <KPI label="כמות רשומות" value={rows.length} format="number" />
          {metricCol && <KPI label={`מדד: ${metricCol}`} value={total} format="number" />}
        </section>
      )}

      {rows.length > 0 && metricCol && dimensionCol && (
        <Section title={`התפלגות ${metricCol} לפי ${dimensionCol}`}>
          <ChartFrame data={series} render={(common) => (
            <BarChart data={series}>
              {common}
              <Legend />
              <Bar dataKey="value" name={metricCol} radius={[6,6,0,0]} />
            </BarChart>
          )} />
        </Section>
      )}
    </main>
  );
}
