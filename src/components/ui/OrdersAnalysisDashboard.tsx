import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useOrdersData } from "@/hooks/useOrdersData";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersAnalysisDashboard() {
  const { orders, loading, error, getSummaryData } = useOrdersData();
  const [viewMode, setViewMode] = useState<'quantity' | 'revenue'>('revenue');
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-bold mb-2">שגיאה בטעינת הנתונים</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const summary = getSummaryData();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('he-IL').format(value);
  };

  const topProducts = Object.entries(summary.byProduct)
    .map(([product, data]) => ({
      name: product,
      quantity: data.quantity,
      revenue: data.revenue,
      orders: data.orders,
      value: viewMode === 'quantity' ? data.quantity : data.revenue
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const topCustomers = Object.entries(summary.byCustomer)
    .map(([customer, data]) => ({
      name: customer,
      quantity: data.quantity,
      revenue: data.revenue,
      orders: data.orders,
      products: data.products.length,
      value: viewMode === 'quantity' ? data.quantity : data.revenue
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ניתוח הזמנות</h1>
          <p className="text-muted-foreground">סה"כ {formatNumber(orders.length)} הזמנות</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('quantity')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'quantity' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            תצוגת כמות
          </button>
          <button
            onClick={() => setViewMode('revenue')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'revenue' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            תצוגת מכירות
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">סה"כ מכירות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">סה"כ כמות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalQuantity)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">סה"כ הזמנות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalOrders)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">לקוחות ייחודיים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.uniqueCustomers)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>
              מוצרים מובילים - {viewMode === 'quantity' ? 'כמות' : 'מכירות'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    viewMode === 'quantity' ? formatNumber(value) : formatCurrency(value),
                    viewMode === 'quantity' ? 'כמות' : 'מכירות'
                  ]}
                  labelFormatter={(label) => `מוצר: ${label}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  name={viewMode === 'quantity' ? 'כמות' : 'מכירות'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>
              לקוחות מובילים - {viewMode === 'quantity' ? 'כמות' : 'מכירות'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomers} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    viewMode === 'quantity' ? formatNumber(value) : formatCurrency(value),
                    viewMode === 'quantity' ? 'כמות' : 'מכירות'
                  ]}
                  labelFormatter={(label) => `לקוח: ${label}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#82ca9d"
                  name={viewMode === 'quantity' ? 'כמות' : 'מכירות'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {summary.byMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>מגמה חודשית</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                    name === 'revenue' ? 'מכירות' : name === 'quantity' ? 'כמות' : 'הזמנות'
                  ]}
                />
                {viewMode === 'quantity' ? (
                  <Bar dataKey="quantity" fill="#8884d8" name="כמות" />
                ) : (
                  <Bar dataKey="revenue" fill="#82ca9d" name="מכירות" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}