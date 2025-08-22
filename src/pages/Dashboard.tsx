import React, { useState, useEffect } from "react";
import PageMeta from "@/components/common/PageMeta";
import AIInsightsDashboard from "@/components/ui/AIInsightsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign, 
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
  salesTrends: Array<{ month: string; sales: number; orders: number; }>;
  profitabilityInsights: { margin: number; trend: number; };
  topCustomers: Array<{ name: string; sales: number; orders: number; }>;
  lowStockAlerts: Array<{ product: string; current: number; minimum: number; status: string; }>;
  kpiMetrics: {
    totalSales: number;
    totalOrders: number;
    avgOrderValue: number;
    customerCount: number;
  };
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In production, this would call multiple Supabase queries
      // For now, using mock data that reflects the real sales data from logs
      const mockData: DashboardData = {
        salesTrends: [
          { month: "ינואר 2025", sales: 2850000, orders: 142 },
          { month: "פברואר 2025", sales: 3200000, orders: 158 },
          { month: "מרץ 2025", sales: 2950000, orders: 147 },
          { month: "אפריל 2025", sales: 3100000, orders: 162 },
          { month: "מאי 2025", sales: 3450000, orders: 178 },
          { month: "יוני 2025", sales: 3680000, orders: 185 }
        ],
        profitabilityInsights: {
          margin: 22.5,
          trend: 5.2 // positive trend
        },
        topCustomers: [
          { name: "מעיין נציגויות", sales: 3850000, orders: 95 },
          { name: "חברת הפצה מרכזית", sales: 2100000, orders: 68 },
          { name: "רשת חנויות פרמיום", sales: 1750000, orders: 52 },
          { name: "יבואן גדול", sales: 1420000, orders: 41 },
          { name: "לקוח תעשייתי", sales: 980000, orders: 28 }
        ],
        lowStockAlerts: [
          { product: "פראנוי 150 גרם", current: 45, minimum: 100, status: "critical" },
          { product: "מוצר פרמיום A", current: 78, minimum: 120, status: "warning" },
          { product: "מוצר בסיסי B", current: 156, minimum: 200, status: "warning" },
          { product: "מוצר מיוחד C", current: 23, minimum: 80, status: "critical" }
        ],
        kpiMetrics: {
          totalSales: 14200000, // 14.2M as shown in logs
          totalOrders: 850, // 850 orders as shown in logs
          avgOrderValue: 16706, // calculated from above
          customerCount: 87
        }
      };

      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
      setDashboardData(mockData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'שגיאה בטעינת נתוני הדשבורד');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value);
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'good': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStockStatusVariant = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      case 'good': return 'success';
      default: return 'muted';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6 animate-fade-in">
          <div className="julius-skeleton h-16 w-96"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="julius-skeleton h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="julius-skeleton h-96"></div>
            <div className="julius-skeleton h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="text-center p-6">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">שגיאה בטעינת הדשבורד</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadDashboardData}>נסה שנית</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <>
      <PageMeta 
        title="Dashboard - מרכז הבקרה" 
        description="דשבורד ראשי עם תובנות AI, ניתוח מכירות ונתוני ביצועים"
      />
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="container mx-auto p-6 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  מרכז הבקרה
                </h1>
              </div>
              <p className="text-muted-foreground">ניתוח מכירות, תובנות AI והתראות בזמן אמת</p>
            </div>
            <Button onClick={loadDashboardData} variant="outline" className="gap-2">
              <Activity className="w-4 h-4" />
              רענן נתונים
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="julius-card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="julius-label text-blue-600">סך מכירות</p>
                    <p className="julius-value text-blue-900">
                      {formatCurrency(dashboardData.kpiMetrics.totalSales)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">+18.2%</span>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="julius-card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="julius-label text-green-600">מספר הזמנות</p>
                    <p className="julius-value text-green-900">
                      {dashboardData.kpiMetrics.totalOrders.toLocaleString('he-IL')}
                    </p>
                    <p className="text-sm text-muted-foreground">עסקאות השנה</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="julius-card bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="julius-label text-purple-600">ממוצע הזמנה</p>
                    <p className="julius-value text-purple-900">
                      {formatCurrency(dashboardData.kpiMetrics.avgOrderValue)}
                    </p>
                    <p className="text-sm text-muted-foreground">לעסקה</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="julius-card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="julius-label text-orange-600">לקוחות פעילים</p>
                    <p className="julius-value text-orange-900">
                      {dashboardData.kpiMetrics.customerCount}
                    </p>
                    <p className="text-sm text-muted-foreground">השנה</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trends */}
            <Card className="julius-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  מגמות מכירות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={dashboardData.salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'sales' ? formatCurrency(value) : value,
                        name === 'sales' ? 'מכירות' : 'הזמנות'
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={3} name="מכירות" />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-2))" strokeWidth={2} name="הזמנות" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profitability Insights */}
            <Card className="julius-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  תובנות רווחיות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {dashboardData.profitabilityInsights.margin}%
                  </div>
                  <p className="text-muted-foreground">שולי רווח ממוצעים</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">
                    +{dashboardData.profitabilityInsights.trend}% מהחודש הקודם
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>יעד רווחיות:</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${(dashboardData.profitabilityInsights.margin / 25) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <Card className="julius-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  לקוחות מובילים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.topCustomers.map((customer, index) => (
                    <div key={customer.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.orders} הזמנות</p>
                        </div>
                      </div>
                      <span className="font-semibold text-primary">
                        {formatCurrency(customer.sales)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card className="julius-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  התראות מלאי נמוך
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.lowStockAlerts.map((item, index) => (
                    <div key={item.product} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStockStatusColor(item.status)}`}></div>
                        <div>
                          <p className="font-medium">{item.product}</p>
                          <p className="text-sm text-muted-foreground">
                            נוכחי: {item.current} | מינימום: {item.minimum}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStockStatusVariant(item.status)}>
                        {item.status === 'critical' ? 'קריטי' : 'אזהרה'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Section */}
          <Card className="julius-card">
            <CardHeader>
              <CardTitle>תובנות והמלצות AI</CardTitle>
            </CardHeader>
            <CardContent>
              <AIInsightsDashboard />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}