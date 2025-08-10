import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveSemanticModel } from "@/lib/supabaseEdge";
import PageMeta from "@/components/common/PageMeta";

type CV = { id: string; text?: string; value?: any };
type ScanRow = {
  colId: string;
  seen: number;
  keys: string[];
  sampleText?: string;
  guess: "timeline"|"date"|"numbers"|"status"|"person"|"text";
};

function safeJSON(x:any){ try{ return typeof x==="string" ? JSON.parse(x) : x; }catch{ return null; } }

function guessType(cv: CV): ScanRow["guess"] {
  const v = safeJSON(cv.value) || cv.value || {};
  const ks = Object.keys(v || {});
  if (ks.includes("from") || ks.includes("to")) return "timeline";
  if (ks.includes("date")) return "date";
  if (ks.includes("number")) return "numbers";
  const t = (cv.text||"").toLowerCase();
  if (t && /won|lost|open|done|in progress|סטטוס|בוצע|בטיפול/.test(t)) return "status";
  if (t && /\s/.test(t)) return "person"; // הערכה גסה
  return "text";
}

export default function ModelWizard(){
  const [boardId, setBoardId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [error, setError] = useState<string|null>(null);
  const bid = Number(boardId);

  async function scan(){
    if (!bid) return;
    setLoading(true); setError(null);
    try{
      const { data, error } = await supabase
        .from("monday_items")
        .select("board_id,id,name,created_at,updated_at,column_values")
        .eq("board_id", bid)
        .limit(400);
      if (error) throw error;

      const counts = new Map<string, ScanRow>();
      (data||[]).forEach((it:any)=>{
        const cvs: CV[] = Array.isArray(it.column_values) ? it.column_values : safeJSON(it.column_values) || [];
        cvs.forEach(cv=>{
          if (!cv?.id) return;
          const g = guessType(cv);
          const v = safeJSON(cv.value) || cv.value || {};
          const row = counts.get(cv.id) || { colId: cv.id, seen:0, keys:[], sampleText:cv.text||"", guess:g };
          row.seen += 1;
          row.sampleText = row.sampleText || cv.text || "";
          row.keys = Array.from(new Set([...(row.keys||[]), ...Object.keys(v||{})]));
          // עדכן guess אם מצאנו אינדיקציה טובה יותר
          if (g==="timeline"||g==="date"||g==="numbers") row.guess = g;
          counts.set(cv.id, row);
        });
      });
      setRows(Array.from(counts.values()).sort((a,b)=>b.seen-a.seen));
    }catch(e:any){ setError(e?.message || "Scan failed"); }
    finally{ setLoading(false); }
  }

  const picks = useMemo(()=>{
    const byGuess = (g:ScanRow["guess"]) => rows.find(r=>r.guess===g)?.colId || null;
    return {
      date:     byGuess("date"),
      timeline: byGuess("timeline"),
      status:   rows.find(r=>r.guess==="status")?.colId || null,
      person:   rows.find(r=>r.guess==="person")?.colId || null,
      numbers:  rows.find(r=>r.guess==="numbers")?.colId || null,
    };
  },[rows]);

  const viewSQL = useMemo(()=>{
    const D = picks.date || "date";
    const T = picks.timeline || "timeline";
    const S = picks.status || "status";
    const P = picks.person || "person";
    const N = picks.numbers || "numbers";
    return `
create or replace view public.monday_items_flat as
select
  i.board_id,
  coalesce(i.item_id, i.id)::bigint as item_id,
  i.name as item_name,
  i.created_at,
  i.updated_at,
  coalesce( (public.monday_cv_value(i.column_values, '${D}') ->> 'date'),
            (public.monday_cv_value(i.column_values, '${T}') ->> 'from') )::date as date,
  (public.monday_cv_value(i.column_values, '${T}') ->> 'to')::date as date_to,
  public.monday_cv_text(i.column_values, '${S}')  as status,
  public.monday_cv_text(i.column_values, '${P}')  as owner,
  (public.monday_cv_value(i.column_values, '${N}') ->> 'number')::numeric as amount,
  public.monday_cv_text(i.column_values, 'country') as country,
  public.monday_cv_text(i.column_values, 'brand')   as brand,
  public.monday_cv_text(i.column_values, 'client')  as client
from public.monday_items i;
`.trim();
  },[picks]);

  async function seedModel(){
    if (!bid) return alert("אנא הזן Board ID");
    try{
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
      alert("Semantic model נשמר. עכשיו הרץ את ה-SQL למטה ב-Supabase SQL Editor ואז פתח /dashboards/sales");
    }catch(e:any){
      alert(e?.message || "Save model failed");
    }
  }

  return (
    <main className="container mx-auto py-8">
      <PageMeta title="Monday Mapper Wizard — CGC DataHub" description="Detect Monday board columns and generate semantic model" path="/model/wizard" />
      <h1 className="text-2xl font-semibold mb-3">Monday Mapper Wizard</h1>
      <div className="toolbar mb-4 flex gap-2">
        <input className="input flex-1" placeholder="Board ID" value={boardId} onChange={e=>setBoardId(e.target.value)} />
        <button className="btn" onClick={scan} disabled={!boardId || loading}>{loading? "Scanning…" : "Scan board"}</button>
        <button className="btn" onClick={seedModel} disabled={!boardId}>Save Semantic Model</button>
      </div>

      {error ? <div className="card p-3 text-red-600">{error}</div> : null}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="label mb-2">Detected Columns (top 20)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left p-2">colId</th><th className="p-2">seen</th><th className="p-2">keys</th><th className="p-2">guess</th></tr></thead>
              <tbody>
                {rows.slice(0,20).map(r=>(
                  <tr key={r.colId} className="border-t">
                    <td className="py-1 px-2">{r.colId}</td>
                    <td className="text-center py-1 px-2">{r.seen}</td>
                    <td className="text-center py-1 px-2">{r.keys.join(",")}</td>
                    <td className="text-center py-1 px-2">{r.guess}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Heuristics: timeline → value.has(from/to), date → value.has(date), numbers → value.has(number), status/person → לפי טקסט חוזר.
          </div>
        </div>

        <div className="card p-4">
          <div className="label mb-2">CREATE VIEW (copy → Supabase SQL Editor → Run)</div>
          <textarea className="w-full h-80 font-mono text-xs p-2 border rounded-md" readOnly value={viewSQL}/>
          <div className="text-sm mt-2">
            אחרי הרצה: פתח <code>/dashboards/sales</code>, הכנס את ה-Board ID ולחץ "רענון".
          </div>
        </div>
      </div>
    </main>
  );
}