import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Row = {
  amount_total_ils: number;
  orders: number;
  year?: number;
  month?: number;
  order_status?: string;
  customer_name?: string;
};

export default function MasterDashboard() {
  const [kpi, setKpi] = useState<Row | null>(null);
  const [byStatus, setByStatus] = useState<Row[]>([]);
  const [byMonth, setByMonth] = useState<Row[]>([]);
  const [topCustomers, setTopCustomers] = useState<Row[]>([]);

  const uuid = "ba6ba6af-0d76-4216-a2b2-3202916c4abf";

  useEffect(() => {
    fetchKPI();
    fetchByStatus();
    fetchByMonth();
    fetchTopCustomers();
  }, []);

  async function fetchKPI() {
    const res = await fetch(`/rpc/aggregate_sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_dataset: uuid,
        p_metrics: ["amount_total_ils", "orders"],
        p_dimensions: [],
      }),
    });
    const data = await res.json();
    setKpi(data[0]);
  }

  async function fetchByStatus() {
    const res = await fetch(`/rpc/aggregate_sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_dataset: uuid,
        p_metrics: ["amount_total_ils", "orders"],
        p_dimensions: ["order_status"],
      }),
    });
    const data = await res.json();
    setByStatus(data);
  }

  async function fetchByMonth() {
    const res = await fetch(`/rpc/aggregate_sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_dataset: uuid,
        p_metrics: ["amount_total_ils", "orders"],
        p_dimensions: ["year", "month"],
      }),
    });
    const data = await res.json();
    setByMonth(data);
  }

  async function fetchTopCustomers() {
    const res = await fetch(`/rpc/aggregate_sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_dataset: uuid,
        p_metrics: ["amount_total_ils"],
        p_dimensions: ["customer_name"],
      }),
    });
    const data = await res.json();
    setTopCustomers(data);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">💼 Master Dashboard</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-sm">Total Orders</div>
            <div className="text-2xl font-bold">{kpi?.orders ?? "-"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-sm">Total Revenue (₪)</div>
            <div className="text-2xl font-bold">{kpi?.amount_total_ils?.toLocaleString() ?? "-"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status */}
      <div>
        <h2 className="text-xl font-semibold">📦 Orders by Status</h2>
        <Separator className="my-2" />
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {byStatus.map((row, i) => (
            <li key={i} className="text-sm border p-3 rounded-lg">
              <div className="font-semibold">{row.order_status || "(unknown)"}</div>
              <div>Orders: {row.orders}</div>
              <div>Total: ₪ {row.amount_total_ils.toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Time Series Chart */}
      <div>
        <h2 className="text-xl font-semibold">📈 Orders by Month</h2>
        <Separator className="my-2" />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byMonth.map((r) => ({ ...r, label: `${r.month}/${r.year}` }))}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="orders" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers */}
      <div>
        <h2 className="text-xl font-semibold">👑 Top Customers</h2>
        <Separator className="my-2" />
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {topCustomers.map((row, i) => (
            <li key={i} className="text-sm border p-3 rounded-lg">
              <div className="font-semibold">{row.customer_name || "(unknown)"}</div>
              <div>Total: ₪ {row.amount_total_ils.toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
