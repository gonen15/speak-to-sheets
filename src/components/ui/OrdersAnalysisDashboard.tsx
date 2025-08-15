import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useOrdersData } from "@/hooks/useOrdersData";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function OrdersAnalysisDashboard() {
  const { orders, loading, error, getSummaryData } = useOrdersData();
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'revenue' | 'quantity'>('revenue');
  
  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedYear !== 'all' && order.year !== selectedYear) return false;
      if (selectedMonth !== 'all' && order.month !== selectedMonth) return false;
      if (selectedCategory !== 'all' && order.category !== selectedCategory) return false;
      if (selectedCustomer !== 'all' && order.customerName !== selectedCustomer) return false;
      return true;
    });
  }, [orders, selectedYear, selectedMonth, selectedCategory, selectedCustomer]);

  // Get unique values for filters
  const availableYears = useMemo(() => {
    const years = [...new Set(orders.map(order => order.year))].filter(Boolean).sort().reverse();
    return years;
  }, [orders]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(orders.map(order => order.month))].filter(Boolean).sort();
    return months;
  }, [orders]);

  const availableCategories = useMemo(() => {
    const categories = [...new Set(orders.map(order => order.category))].filter(Boolean).sort();
    return categories;
  }, [orders]);

  const availableCustomers = useMemo(() => {
    const customers = [...new Set(orders.map(order => order.customerName))].filter(Boolean).sort();
    return customers;
  }, [orders]);

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

  // Get summary data for filtered orders
  const getSummaryDataForFiltered = () => {
    const summary = {
      totalRevenue: 0,
      totalQuantity: 0,
      totalOrders: filteredOrders.length,
      uniqueCustomers: 0,
      byProduct: {} as Record<string, { quantity: number; revenue: number; orders: number }>,
      byCustomer: {} as Record<string, { quantity: number; revenue: number; orders: number; products: string[] }>,
      byMonth: [] as Array<{ month: string; quantity: number; revenue: number; orders: number }>
    };

    const customerSet = new Set<string>();
    const monthlyData: Record<string, { quantity: number; revenue: number; orders: number }> = {};

    filteredOrders.forEach(order => {
      summary.totalRevenue += order.totalAfterDiscount;
      summary.totalQuantity += order.quantity;
      customerSet.add(order.customerName);

      // By product
      if (!summary.byProduct[order.productCode]) {
        summary.byProduct[order.productCode] = { quantity: 0, revenue: 0, orders: 0 };
      }
      summary.byProduct[order.productCode].quantity += order.quantity;
      summary.byProduct[order.productCode].revenue += order.totalAfterDiscount;
      summary.byProduct[order.productCode].orders += 1;

      // By customer
      if (!summary.byCustomer[order.customerName]) {
        summary.byCustomer[order.customerName] = { quantity: 0, revenue: 0, orders: 0, products: [] };
      }
      summary.byCustomer[order.customerName].quantity += order.quantity;
      summary.byCustomer[order.customerName].revenue += order.totalAfterDiscount;
      summary.byCustomer[order.customerName].orders += 1;
      
      if (!summary.byCustomer[order.customerName].products.includes(order.productCode)) {
        summary.byCustomer[order.customerName].products.push(order.productCode);
      }

      // By month
      if (order.month && order.year) {
        const monthKey = `${order.year}-${order.month.padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { quantity: 0, revenue: 0, orders: 0 };
        }
        monthlyData[monthKey].quantity += order.quantity;
        monthlyData[monthKey].revenue += order.totalAfterDiscount;
        monthlyData[monthKey].orders += 1;
      }
    });

    summary.uniqueCustomers = customerSet.size;
    summary.byMonth = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return summary;
  };

  const summary = getSummaryDataForFiltered();
  
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
      value: activeTab === 'quantity' ? data.quantity : data.revenue
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
      value: activeTab === 'quantity' ? data.quantity : data.revenue
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ניתוח הזמנות</h1>
            <p className="text-muted-foreground">סה"כ {formatNumber(filteredOrders.length)} הזמנות</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">שנה</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="בחר שנה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השנים</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">חודש</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="בחר חודש" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל החודשים</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">קטגוריה</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="בחר קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {availableCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">לקוח</label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="בחר לקוח" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הלקוחות</SelectItem>
                {availableCustomers.slice(0, 20).map(customer => (
                  <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b">
          <Button
            variant={activeTab === 'revenue' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('revenue')}
            className="rounded-b-none"
          >
            לוח כספי
          </Button>
          <Button
            variant={activeTab === 'quantity' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('quantity')}
            className="rounded-b-none"
          >
            לוח כמותי
          </Button>
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
              מוצרים מובילים - {activeTab === 'quantity' ? 'כמות' : 'מכירות'}
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
                    activeTab === 'quantity' ? formatNumber(value) : formatCurrency(value),
                    activeTab === 'quantity' ? 'כמות' : 'מכירות'
                  ]}
                  labelFormatter={(label) => `מוצר: ${label}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8"
                  name={activeTab === 'quantity' ? 'כמות' : 'מכירות'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>
              לקוחות מובילים - {activeTab === 'quantity' ? 'כמות' : 'מכירות'}
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
                    activeTab === 'quantity' ? formatNumber(value) : formatCurrency(value),
                    activeTab === 'quantity' ? 'כמות' : 'מכירות'
                  ]}
                  labelFormatter={(label) => `לקוח: ${label}`}
                />
                <Bar 
                  dataKey="value" 
                  fill="#82ca9d"
                  name={activeTab === 'quantity' ? 'כמות' : 'מכירות'}
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
                {activeTab === 'quantity' ? (
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