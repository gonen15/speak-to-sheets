import { useEffect, useState } from "react";
import { getKpis, getByStatus, getByMonth, getTopCustomers } from "@/lib/data";
import PageMeta from "@/components/common/PageMeta";
import KPI from "@/components/ui/KPI";
import Section from "@/components/ui/Section";
import ChartFrame from "@/components/charts/ChartFrame";
import { BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer } from "recharts";

export default function MasterDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<any>(null);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [byMonth, setByMonth] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [k, s, m, t] = await Promise.all([
          getKpis(),
          getByStatus(),
          getByMonth(),
          getTopCustomers()
        ]);
        setKpi(k);
        setByStatus(s);
        setByMonth(m);
        setTopCustomers(t);
      } catch (e: any) {
        setError(e.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      <PageMeta title="Sales Dashboard" />

      <Section title="Key Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Total Sales (₪)" value={kpi?.amount_total_ils?.toLocaleString()} />
          <KPI label="Total Orders" value={kpi?.orders?.toLocaleString()} />
          <KPI label="Avg Order Value" value={parseFloat(kpi?.avg_order)?.toFixed(2)} />
          <KPI label="Total Rows" value={kpi?.rows?.toLocaleString()} />
        </div>
      </Section>

      <Section title="Sales by Month">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={byMonth}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <CartesianGrid strokeDasharray="3 3" />
              <Line type="monotone" dataKey="amount_total_ils" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Section>

      <Section title="Sales by Status">
        <ChartFrame>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byStatus}>
              <XAxis dataKey="order_status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount_total_ils" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Section>

      <Section title="Top Customers">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Total Sales (₪)</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">{c.customer_name}</td>
                  <td className="px-4 py-2">{parseFloat(c.amount_total_ils).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
