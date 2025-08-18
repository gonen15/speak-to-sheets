import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Users, Package, DollarSign, ShoppingCart, Filter, X, BarChart3, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChartFrame from "@/components/charts/ChartFrame";
import Section from "@/components/ui/Section";

interface SalesDataItem {
  label: string;
  key: string;
  sales: number;
  quantity: number;
  orders: number;
  transaction?: any;
}

export default function OrdersAnalysisDashboard() {
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedCategory, setSelectedCategory] = useState<string>('combined');
  const [drillDownLevel, setDrillDownLevel] = useState<'month' | 'week' | 'day' | 'transaction'>('month');
  const [selectedDrillDown, setSelectedDrillDown] = useState<{
    month?: string;
    week?: string;
    day?: string;
  }>({});
  const [salesData, setSalesData] = useState<SalesDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['כל המכירות']);

  // Load sales data from the new Edge Function
  const loadSalesData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await supabase.functions.invoke('sales-data', {
        body: {
          level: drillDownLevel,
          year: selectedYear !== 'all' ? selectedYear : undefined,
          month: selectedDrillDown.month,
          week: selectedDrillDown.week,
          day: selectedDrillDown.day
        }
      });

      if (response.error) {
        throw response.error;
      }

      setSalesData(response.data?.data || []);
    } catch (err: any) {
      console.error('Error loading sales data:', err);
      setError(err.message || 'שגיאה בטעינת נתוני המכירות');
    } finally {
      setLoading(false);
    }
  };

  // Load data when filters change
  useEffect(() => {
    loadSalesData();
  }, [drillDownLevel, selectedYear, selectedDrillDown]);

  // Handle drill-down clicks
  const handleDrillDown = (item: SalesDataItem) => {
    if (drillDownLevel === 'month') {
      setSelectedDrillDown({ month: item.key });
      setDrillDownLevel('week');
      setBreadcrumb(prev => [...prev, `חודש ${item.label}`]);
    } else if (drillDownLevel === 'week') {
      setSelectedDrillDown(prev => ({ ...prev, week: item.key }));
      setDrillDownLevel('day');
      setBreadcrumb(prev => [...prev, item.label]);
    } else if (drillDownLevel === 'day') {
      setSelectedDrillDown(prev => ({ ...prev, day: item.key }));
      setDrillDownLevel('transaction');
      setBreadcrumb(prev => [...prev, item.label]);
    }
  };

  // Handle drill-up (back button)
  const handleDrillUp = () => {
    if (drillDownLevel === 'transaction') {
      setSelectedDrillDown(prev => ({ ...prev, day: undefined }));
      setDrillDownLevel('day');
    } else if (drillDownLevel === 'day') {
      setSelectedDrillDown(prev => ({ ...prev, week: undefined }));
      setDrillDownLevel('week');
    } else if (drillDownLevel === 'week') {
      setSelectedDrillDown({ month: undefined });
      setDrillDownLevel('month');
    }
    setBreadcrumb(prev => prev.slice(0, -1));
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedYear('2025');
    setSelectedCategory('combined');
    setDrillDownLevel('month');
    setSelectedDrillDown({});
    setBreadcrumb(['כל המכירות']);
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalSales = salesData.reduce((sum, item) => sum + (item.sales || 0), 0);
    const totalQuantity = salesData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalOrders = salesData.reduce((sum, item) => sum + (item.orders || 0), 0);
    
    return {
      totalSales,
      totalQuantity,
      totalOrders,
      averageOrder: totalOrders > 0 ? totalSales / totalOrders : 0
    };
  }, [salesData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('he-IL').format(value);
  };

  const getDrillDownTitle = () => {
    switch (drillDownLevel) {
      case 'month': return 'חודשים';
      case 'week': return 'שבועות';
      case 'day': return 'ימים';
      case 'transaction': return 'עסקאות';
      default: return 'נתונים';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="text-center p-6">
            <div className="text-destructive">
              <h2 className="text-xl font-bold mb-2">שגיאה בטעינת הנתונים</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  מרכז ניתוח מכירות
                </h1>
              </div>
              
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {breadcrumb.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span>{crumb}</span>
                    {index < breadcrumb.length - 1 && <ChevronRight className="w-4 h-4" />}
                  </React.Fragment>
                ))}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4" />
                  {formatNumber(summary.totalOrders)} עסקאות
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(summary.totalSales)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedYear === 'all' ? 'כל השנים' : selectedYear}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {drillDownLevel !== 'month' && (
                <Button variant="outline" size="sm" onClick={handleDrillUp} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  חזור
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                <X className="w-4 h-4" />
                איפוס
              </Button>
            </div>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">סך מכירות</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(summary.totalSales)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">כמות כוללת</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatNumber(summary.totalQuantity)}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">מספר עסקאות</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatNumber(summary.totalOrders)}
                    </p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">ממוצע עסקה</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatCurrency(summary.averageOrder)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                מסנני נתונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">שנת פעילות</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר שנה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל השנים</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">קטגוריית תצוגה</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">כסף וכמות</SelectItem>
                      <SelectItem value="money">כסף בלבד</SelectItem>
                      <SelectItem value="quantity">כמות בלבד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chart Section */}
        <Section title={`מכירות לפי ${getDrillDownTitle()}`}>
          {drillDownLevel === 'transaction' ? (
            <div className="space-y-4">
              {salesData.map((item: SalesDataItem) => (
                <div key={item.key} className="bg-card p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">{item.label}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">תאריך:</span>
                      <span className="ml-2">{item.transaction?.date ? new Date(item.transaction.date).toLocaleDateString('he-IL') : 'לא זמין'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">סכום:</span>
                      <span className="ml-2">{formatCurrency(item.sales)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">כמות:</span>
                      <span className="ml-2">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">מוצר:</span>
                      <span className="ml-2">{item.transaction?.product || 'לא זמין'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ChartFrame data={salesData} render={(common) => (
              <BarChart 
                data={salesData} 
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload) {
                    handleDrillDown(data.activePayload[0].payload);
                  }
                }}
              >
                {common}
                <Legend />
                {selectedCategory === 'money' || selectedCategory === 'combined' ? (
                  <Bar dataKey="sales" name="מכירות (₪)" fill="hsl(var(--chart-1))" radius={[6,6,0,0]} />
                ) : null}
                {selectedCategory === 'quantity' || selectedCategory === 'combined' ? (
                  <Bar dataKey="quantity" name="כמות" fill="hsl(var(--chart-2))" radius={[6,6,0,0]} />
                ) : null}
              </BarChart>
            )} />
          )}
        </Section>
      </div>
    </div>
  );
}