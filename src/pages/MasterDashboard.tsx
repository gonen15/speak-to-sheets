import React, { useEffect, useMemo, useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import KPI from "@/components/ui/KPI";
import GlobalFilterBar from "@/components/ui/GlobalFilterBar";
import { aggregateRun } from "@/lib/supabaseEdge";

// Simple date helpers
function startOfCurrentQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function dateFromPeriod(period: string): string | null {
  const now = new Date();
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (period === "ytd") return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  if (period === "current_quarter") return startOfCurrentQuarter(now).toISOString().slice(0, 10);
  return null;
}

export default function MasterDashboard(){
  // Filters UI (reuse global style)
  const [period, setPeriod] = useState<string>("current_quarter");
  const [department, setDepartment] = useState<string>("all");
  const [entity, setEntity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [totals, setTotals] = useState<{ amount_total?: number; rows?: number; customers?: number }>({});
  const [byDate, setByDate] = useState<Array<{ date: string; amount_total: number }>>([]);
  const [byDepartment, setByDepartment] = useState<Array<{ department: string; amount_total: number }>>([]);
  const [byStatus, setByStatus] = useState<Array<{ status: string; rows: number }>>([]);
  const [topClients, setTopClients] = useState<Array<{ customer: string; amount_total: number }>>([]);

  const dateFrom = useMemo(() => dateFromPeriod(period), [period]);

  const buildFilters = () => {
    const f: any[] = [];
    if (department !== "all") f.push({ field: "department", op: "=", value: department });
    if (entity) f.push({ field: "customer", op: "like", value: `%${entity}%` });
    return f;
  };

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const filters = buildFilters();
      const dateRange = dateFrom ? { from: dateFrom, to: null as any } : undefined;

      const [tRes, dRes, depRes, sRes, cRes] = await Promise.all([
        aggregateRun({ source: 'master', refId: null as any, metrics: ['amount_total','rows','customers'], dateRange }),
        aggregateRun({ source: 'master', refId: null as any, metrics: ['amount_total'], dimensions: ['date'], dateRange }),
        aggregateRun({ source: 'master', refId: null as any, metrics: ['amount_total'], dimensions: ['department'], dateRange, filters }),
        aggregateRun({ source: 'master', refId: null as any, metrics: ['rows'], dimensions: ['status'], dateRange, filters }),
        aggregateRun({ source: 'master', refId: null as any, metrics: ['amount_total'], dimensions: ['customer'], dateRange, filters }),
      ]);

      const tRow = (tRes?.rows || [])[0] || {};
      setTotals({ amount_total: Number(tRow.amount_total) || 0, rows: Number(tRow.rows) || 0, customers: Number(tRow.customers) || 0 });

      const _byDate = (dRes?.rows || []).map((r: any) => ({ date: r.date, amount_total: Number(r.amount_total) || 0 }))
        .sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
      setByDate(_byDate);

      const _byDept = (depRes?.rows || []).map((r: any) => ({ department: r.department || '—', amount_total: Number(r.amount_total) || 0 }))
        .sort((a: any, b: any) => b.amount_total - a.amount_total);
      setByDepartment(_byDept);

      const _byStatus = (sRes?.rows || []).map((r: any) => ({ status: r.status || '—', rows: Number(r.rows) || 0 }))
        .sort((a: any, b: any) => b.rows - a.rows);
      setByStatus(_byStatus);

      const _byClients = (cRes?.rows || []).map((r:any)=>({ customer: r.customer || '—', amount_total: Number(r.amount_total)||0 }))
        .sort((a:any,b:any)=> b.amount_total - a.amount_total);
      setTopClients(_byClients);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [period, department, entity]);

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="Master Dashboard — Company Analytics" description="Unified KPIs across all sources using the master model" path="/dashboards/master" />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Master Dashboard</h1>
      </header>

      <GlobalFilterBar
        period={period}
        onPeriodChange={setPeriod}
        department={department}
        onDepartmentChange={setDepartment}
        entity={entity}
        onEntityChange={setEntity}
        onApply={refresh}
        onReset={() => { setPeriod('current_quarter'); setDepartment('all'); setEntity(''); }}
        loading={loading}
        className="mb-6"
      />

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 mb-4 text-sm">
          שגיאה: {error}
        </div>
      )}

      {/* KPIs */}
      <section className="grid md:grid-cols-3 gap-4 mb-6">
        <KPI label="Revenue" value={totals.amount_total} format="currency" />
        <KPI label="Customers" value={totals.customers} format="number" />
        <KPI label="Rows" value={totals.rows} format="number" />
      </section>

      {/* Breakdowns */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="julius-card p-4">
          <div className="julius-label mb-2">By Date</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead><tr><th className="text-left py-2 pr-4">Date</th><th className="text-left py-2 pr-4">Amount</th></tr></thead>
              <tbody>
                {byDate.map((r) => (
                  <tr key={r.date} className="border-b">
                    <td className="py-2 pr-4">{r.date}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(r.amount_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="julius-card p-4">
          <div className="julius-label mb-2">By Department</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead><tr><th className="text-left py-2 pr-4">Department</th><th className="text-left py-2 pr-4">Amount</th></tr></thead>
              <tbody>
                {byDepartment.map((r) => (
                  <tr key={r.department} className="border-b">
                    <td className="py-2 pr-4">{r.department}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(r.amount_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="julius-card p-4">
          <div className="julius-label mb-2">Top Clients</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead><tr><th className="text-left py-2 pr-4">Customer</th><th className="text-left py-2 pr-4">Amount</th></tr></thead>
              <tbody>
                {topClients.slice(0,10).map((r) => (
                  <tr key={r.customer} className="border-b">
                    <td className="py-2 pr-4">{r.customer || '—'}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(r.amount_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="julius-card p-4">
          <div className="julius-label mb-2">By Status</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead><tr><th className="text-left py-2 pr-4">Status</th><th className="text-left py-2 pr-4">Rows</th></tr></thead>
              <tbody>
                {byStatus.map((r) => (
                  <tr key={r.status} className="border-b">
                    <td className="py-2 pr-4">{r.status}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat().format(r.rows)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
