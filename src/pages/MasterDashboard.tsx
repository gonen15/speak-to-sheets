import React, { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageMeta from "@/components/common/PageMeta";
import DateRangePicker from "@/components/ui/date-range-picker";
import GlobalFilterBar from "@/components/ui/GlobalFilterBar";
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
  LineChart,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DashboardFilters {
  dateRange: DateRange;
  period: string;
  department: string;
  entity: string;
  status: string;
}

interface FilteredDashboardData {
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
  performanceByStatus: Array<{ status: string; count: number; value: number; }>;
}

export default function MasterDashboard() {
  const [dashboardData, setDashboardData] = useState<FilteredDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: { from: undefined, to: undefined },
    period: "current_quarter",
    department: "all",
    entity: "",
    status: "all"
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (appliedFilters?: Partial<DashboardFilters>) => {
    setLoading(true);
    setError(null);
    
    try {
      // This would normally query Supabase with filters
      // For now, using enhanced mock data that reflects filtering capabilities
      const mockData: FilteredDashboardData = {
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
          trend: 5.2
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
          totalSales: 14200000,
          totalOrders: 850,
          avgOrderValue: 16706,
          customerCount: 87
        },
        performanceByStatus: [
          { status: "סגור", count: 145, value: 8500000 },
          { status: "פתוח", count: 78, value: 4200000 },
          { status: "בהמתנה", count: 32, value: 1500000 }
        ]
      };

      await new Promise(resolve => setTimeout(resolve, 800));
      setDashboardData(mockData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'שגיאה בטעינת נתוני הדשבורד');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadDashboardData(filters);
  };

  const handleResetFilters = () => {
    const resetFilters: DashboardFilters = {
      dateRange: { from: undefined, to: undefined },
      period: "current_quarter",
      department: "all",
      entity: "",
      status: "all"
    };
    setFilters(resetFilters);
    loadDashboardData(resetFilters);
  };

  const handleSaveFilters = async () => {
    try {
      const { error } = await supabase.functions.invoke('filters-save', {
        body: { key: 'master_dashboard_filters', value: filters }
      });
      if (error) throw error;
      // Show success toast here
    } catch (err) {
      console.error('Error saving filters:', err);
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
      case 'critical': return 'bg-destructive';
      case 'warning': return 'bg-warning';
      case 'good': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const getStockStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'good': return 'default';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6 animate-fade-in">
          <div className="h-16 w-96 bg-muted animate-pulse rounded"></div>
          <div className="h-24 bg-muted animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted animate-pulse rounded"></div>
            <div className="h-96 bg-muted animate-pulse rounded"></div>
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
              <Button onClick={() => loadDashboardData()}>נסה שנית</Button>
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
        title="Master Dashboard - דשבורד מתקדם עם פילטרים" 
        description="דשבורד מתקדם עם פילטרים מתקדמים, טווחי תאריכים וניתוח מקיף של נתוני הארגון"
      />
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="container mx-auto p-6 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  דשבורד מתקדם
                </h1>
              </div>
              <p className="text-muted-foreground">ניתוח מקיף עם פילטרים מתקדמים ותובנות בזמן אמת</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => loadDashboardData()} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                רענן נתונים
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                ייצא נתונים
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                פילטרים מתקדמים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GlobalFilterBar
                period={filters.period}
                onPeriodChange={(value) => setFilters(prev => ({ ...prev, period: value }))}
                department={filters.department}
                onDepartmentChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
                entity={filters.entity}
                onEntityChange={(value) => setFilters(prev => ({ ...prev, entity: value }))}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                onSave={handleSaveFilters}
                loading={loading}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                {/* Date Range Picker */}
                <div>
                  <label className="block text-sm font-medium mb-2">טווח תאריכים</label>
                  <DateRangePicker
                    value={filters.dateRange}
                    onChange={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">סטטוס</label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סטטוס" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הסטטוסים</SelectItem>
                      <SelectItem value="סגור">סגור</SelectItem>
                      <SelectItem value="פתוח">פתוח</SelectItem>
                      <SelectItem value="בהמתנה">בהמתנה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Actions */}
                <div className="flex items-end">
                  <Button onClick={handleApplyFilters} className="w-full">
                    החל פילטרים
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">סך מכירות</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(dashboardData.kpiMetrics.totalSales)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">+18.2%</span>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">מספר הזמנות</p>
                    <p className="text-2xl font-bold text-green-700">
                      {dashboardData.kpiMetrics.totalOrders.toLocaleString('he-IL')}
                    </p>
                    <p className="text-sm text-muted-foreground">עסקאות השנה</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">ממוצע הזמנה</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {formatCurrency(dashboardData.kpiMetrics.avgOrderValue)}
                    </p>
                    <p className="text-sm text-muted-foreground">לעסקה</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">לקוחות פעילים</p>
                    <p className="text-2xl font-bold text-orange-700">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  מגמות מכירות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={dashboardData.salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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

            {/* Performance by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  ביצועים לפי סטטוס
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.performanceByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Additional Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <Card>
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
            <Card>
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
        </div>
      </div>
    </>
  );
}