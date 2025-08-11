import React, { useEffect, useMemo, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import Section from "@/components/ui/Section";
import KPI from "@/components/ui/KPI";
import { aggregateRun, AggregateFilter } from "@/lib/supabaseEdge";
import GlobalFilterBar from "@/components/ui/GlobalFilterBar";
import { cn } from "@/lib/utils";

// Helper to convert a period key into from-date string (YYYY-MM-DD)
function dateFromPeriod(period: string): string | null {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return toISO(d);
  }
  if (period === "90d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    return toISO(d);
  }
  if (period === "ytd") {
    return `${now.getFullYear()}-01-01`;
  }
  if (period === "current_quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const startMonth = q * 3; // 0,3,6,9
    const d = new Date(now.getFullYear(), startMonth, 1);
    return toISO(d);
  }
  return null;
}

export default function DepartmentsDashboard() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>("current_quarter");
  const [department, setDepartment] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<{ amount_total?: number; rows?: number; customers?: number } | null>(null);
  const [byDept, setByDept] = useState<Array<{ department: string; amount_total: number }>>([]);
  const [topClients, setTopClients] = useState<Array<{ customer: string; amount_total: number }>>([]);

  const filters: AggregateFilter[] = useMemo(() => {
    const f: AggregateFilter[] = [];
    if (department && department !== "all") {
      f.push({ field: "department", op: "=", value: department });
    }
    return f;
  }, [department]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const from = dateFromPeriod(period);
      const dateRange = { field: "date", from, to: null as string | null };

      // KPIs
      const kpiRes = await aggregateRun({
        source: "master",
        refId: null,
        metrics: ["amount_total", "rows", "customers"],
        dateRange,
        filters,
      });
      const kpiRow = (kpiRes?.rows?.[0] ?? {}) as any;
      setKpis({
        amount_total: Number(kpiRow?.amount_total ?? 0),
        rows: Number(kpiRow?.rows ?? 0),
        customers: Number(kpiRow?.customers ?? 0),
      });

      // By department
      const deptRes = await aggregateRun({
        source: "master",
        refId: null,
        metrics: ["amount_total"],
        dimensions: ["department"],
        dateRange,
        filters,
        limit: 100,
      });
      setByDept(
        (deptRes.rows || []).map((r: any) => ({
          department: String(r.department ?? "—"),
          amount_total: Number(r.amount_total ?? 0),
        }))
      );

      // Top clients
      const topRes = await aggregateRun({
        source: "master",
        refId: null,
        metrics: ["amount_total"],
        dimensions: ["customer"],
        dateRange,
        filters,
        limit: 10,
      });
      setTopClients(
        (topRes.rows || []).map((r: any) => ({
          customer: String(r.customer ?? "—"),
          amount_total: Number(r.amount_total ?? 0),
        }))
      );
    } catch (e: any) {
      setError(e?.message || "שגיאה לא ידועה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, department]);

  return (
    <div className="container mx-auto px-4 py-6">
      <PageMeta
        title="דשבורד מחלקות | ניתוח לפי מחלקה"
        description="דשבורד מחלקות המאחד נתונים מהמערכת ומציג KPI וחתכים לפי מחלקה ולקוחות."
        path="/dashboards/departments"
      />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">דשבורד מחלקות</h1>
        <p className="text-muted-foreground text-sm">ניתוח KPI וחתכים מרכזיים לפי מחלקות</p>
      </header>

      <GlobalFilterBar
        period={period}
        onPeriodChange={setPeriod}
        department={department}
        onDepartmentChange={setDepartment}
        onApply={refresh}
        loading={loading}
        className="mb-6"
      />

      {error && (
        <div className="julius-card p-4 mb-6 text-destructive-foreground">
          אירעה שגיאה: {error}
        </div>
      )}

      <Section title="מדדי ליבה">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPI label="סך מחזור" value={kpis?.amount_total ?? 0} format="currency" hint="סכום כולל לתקופה" />
          <KPI label="מס׳ שורות" value={kpis?.rows ?? 0} format="number" />
          <KPI label="מס׳ לקוחות" value={kpis?.customers ?? 0} format="number" />
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="חלוקה לפי מחלקה">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-right py-2">מחלקה</th>
                  <th className="text-right py-2">מחזור</th>
                </tr>
              </thead>
              <tbody>
                {byDept.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-6 text-muted-foreground">אין נתונים להצגה</td>
                  </tr>
                )}
                {byDept.map((r, idx) => (
                  <tr key={idx} className={cn("border-b last:border-0") }>
                    <td className="text-right py-2">{r.department || "—"}</td>
                    <td className="text-right py-2">{new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}).format(r.amount_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="לקוחות מובילים">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-right py-2">לקוח</th>
                  <th className="text-right py-2">מחזור</th>
                </tr>
              </thead>
              <tbody>
                {topClients.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-6 text-muted-foreground">אין נתונים להצגה</td>
                  </tr>
                )}
                {topClients.map((r, idx) => (
                  <tr key={idx} className={cn("border-b last:border-0") }>
                    <td className="text-right py-2">{r.customer || "—"}</td>
                    <td className="text-right py-2">{new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}).format(r.amount_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
