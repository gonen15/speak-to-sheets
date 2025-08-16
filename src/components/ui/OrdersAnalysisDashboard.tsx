import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useOrdersData } from "@/hooks/useOrdersData";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, TrendingUp, TrendingDown, Users, Package, DollarSign, ShoppingCart, Filter, X, Search, BarChart3, Brain, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OrdersAnalysisDashboard() {
  const { orders, loading, error } = useOrdersData();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('combined');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [activeTab, setActiveTab] = useState<'revenue' | 'quantity'>('revenue');
  
  // Filter orders based on selected filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedYear !== 'all' && order.year !== selectedYear) return false;
      if (selectedMonth !== 'all' && order.month !== selectedMonth) return false;
      if (selectedCategory !== 'combined' && selectedCategory !== 'all') return false;
      if (selectedProduct !== 'all' && order.productCode !== selectedProduct) return false;
      if (selectedCustomer !== 'all' && order.customerName !== selectedCustomer) return false;
      if (customerSearch && !order.customerName.toLowerCase().includes(customerSearch.toLowerCase())) return false;
      if (productSearch && !order.productCode.toLowerCase().includes(productSearch.toLowerCase())) return false;
      return true;
    });
  }, [orders, selectedYear, selectedMonth, selectedCategory, selectedProduct, selectedCustomer, customerSearch, productSearch]);

  // Get unique values for filters with proper Hebrew month names
  const monthNames = {
    '1': 'ינואר', '2': 'פברואר', '3': 'מרץ', '4': 'אפריל', '5': 'מאי', '6': 'יוני',
    '7': 'יולי', '8': 'אוגוסט', '9': 'ספטמבר', '10': 'אוקטובר', '11': 'נובמבר', '12': 'דצמבר'
  };

  const availableYears = useMemo(() => {
    const years = [...new Set(orders.map(order => order.year))].filter(Boolean).sort().reverse();
    return ['2024', '2025', ...years.filter(y => !['2024', '2025'].includes(y))];
  }, [orders]);

  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: monthNames[String(i + 1) as keyof typeof monthNames]
    }));
  }, []);

  const availableProducts = useMemo(() => {
    const products = [...new Set(orders.map(order => order.productCode))].filter(Boolean).sort();
    return productSearch ? 
      products.filter(product => product.toLowerCase().includes(productSearch.toLowerCase())) : 
      products;
  }, [orders, productSearch]);

  const availableCustomers = useMemo(() => {
    const customers = [...new Set(orders.map(order => order.customerName))].filter(Boolean).sort();
    return customerSearch ? 
      customers.filter(customer => customer.toLowerCase().includes(customerSearch.toLowerCase())) : 
      customers;
  }, [orders, customerSearch]);

  // Get active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedYear !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (selectedCategory !== 'combined') count++;
    if (selectedProduct !== 'all') count++;
    if (selectedCustomer !== 'all') count++;
    if (customerSearch) count++;
    if (productSearch) count++;
    return count;
  }, [selectedYear, selectedMonth, selectedCategory, selectedProduct, selectedCustomer, customerSearch, productSearch]);

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

  // Memoize summary data calculation
  const summary = useMemo(() => getSummaryDataForFiltered(), [filteredOrders]);

  // Calculate insights
  const insights = useMemo(() => {
    const avgOrderValue = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;
    const topCustomer = Object.entries(summary.byCustomer).reduce((top, [name, data]) => 
      data.revenue > top.revenue ? { name, revenue: data.revenue } : top, { name: '', revenue: 0 });
    const topProduct = Object.entries(summary.byProduct).reduce((top, [name, data]) => 
      data.revenue > top.revenue ? { name, revenue: data.revenue } : top, { name: '', revenue: 0 });
    
    return { avgOrderValue, topCustomer, topProduct };
  }, [summary.totalOrders, summary.totalRevenue, summary.byCustomer, summary.byProduct]);

  const topProducts = useMemo(() => {
    return Object.entries(summary.byProduct)
      .map(([product, data]) => ({
        name: product,
        quantity: data.quantity,
        revenue: data.revenue,
        orders: data.orders,
        value: activeTab === 'quantity' ? data.quantity : data.revenue
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [summary.byProduct, activeTab]);

  const topCustomers = useMemo(() => {
    return Object.entries(summary.byCustomer)
      .map(([customer, data]) => ({
        name: customer.length > 25 ? customer.substring(0, 25) + '...' : customer,
        fullName: customer,
        quantity: data.quantity,
        revenue: data.revenue,
        orders: data.orders,
        products: data.products.length,
        value: activeTab === 'quantity' ? data.quantity : data.revenue
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [summary.byCustomer, activeTab]);

  // Get AI advice function
  const getAIAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-advisor', {
        body: {
          salesData: filteredOrders.slice(0, 100), // Send sample of data
          inventoryData: {} // Will be populated when inventory data is available
        }
      });

      if (error) throw error;
      setAiAdvice(data.advice);
      setShowAdvice(true);
    } catch (error) {
      console.error('Error getting AI advice:', error);
      toast.error('שגיאה בקבלת ייעוץ AI');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedCategory('combined');
    setSelectedProduct('all');
    setSelectedCustomer('all');
    setCustomerSearch('');
    setProductSearch('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('he-IL').format(value);
  };

  // Colors for charts
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

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
                  מרכז ניתוח הזמנות
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4" />
                  {formatNumber(filteredOrders.length)} הזמנות
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedYear === 'all' ? 'כל השנים' : selectedYear}
                </span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Filter className="w-3 h-3" />
                    {activeFiltersCount} פילטרים פעילים
                  </Badge>
                )}
              </div>
            </div>
            
            {activeFiltersCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                נקה פילטרים
              </Button>
            )}
          </div>

          {/* Smart Insights Bar */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span>ממוצע הזמנה: <strong>{formatCurrency(insights.avgOrderValue)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>לקוח מוביל: <strong>{insights.topCustomer.name || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span>מוצר מוביל: <strong>{insights.topProduct.name || 'N/A'}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Filters */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                <CardTitle className="text-lg">מסנני נתונים</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    שנה
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">חודש</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר חודש" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל החודשים</SelectItem>
                       {availableMonths.map(month => (
                         <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                     <BarChart3 className="w-4 h-4" />
                     סוג תצוגה
                   </label>
                   <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                     <SelectTrigger>
                       <SelectValue placeholder="בחר סוג תצוגה" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="combined">תצוגה משותפת</SelectItem>
                       <SelectItem value="financial">תצוגה כספית</SelectItem>
                       <SelectItem value="quantity">תצוגה כמותית</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                     <Search className="w-4 h-4" />
                     חיפוש מוצר
                   </label>
                   <div className="relative">
                     <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       placeholder="הקלד קוד מוצר..."
                       value={productSearch}
                       onChange={(e) => setProductSearch(e.target.value)}
                       className="pr-10"
                     />
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                     <Search className="w-4 h-4" />
                     חיפוש לקוח
                   </label>
                   <div className="relative">
                     <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       placeholder="הקלד שם לקוח..."
                       value={customerSearch}
                       onChange={(e) => setCustomerSearch(e.target.value)}
                       className="pr-10"
                     />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2">
                     <Brain className="w-4 h-4" />
                     ייעוץ AI חכם
                   </label>
                   <Button 
                     onClick={getAIAdvice}
                     disabled={loadingAdvice}
                     className="w-full gap-2"
                     variant="outline"
                   >
                     {loadingAdvice ? (
                       <>
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                         מקבל ייעוץ...
                       </>
                     ) : (
                       <>
                         <Brain className="w-4 h-4" />
                         קבל ייעוץ AI לדשבורד
                       </>
                     )}
                   </Button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerSearch && availableCustomers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      בחר לקוח מהתוצאות ({availableCustomers.length})
                    </label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר לקוח ספציפי" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">כל הלקוחות</SelectItem>
                        {availableCustomers.slice(0, 50).map(customer => (
                          <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {productSearch && availableProducts.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      בחר מוצר מהתוצאות ({availableProducts.length})
                    </label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מוצר ספציפי" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">כל המוצרים</SelectItem>
                        {availableProducts.slice(0, 50).map(product => (
                          <SelectItem key={product} value={product}>{product}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Tabs */}
          <Card className="overflow-hidden">
            <div className="flex">
              <Button
                variant={activeTab === 'revenue' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('revenue')}
                className="flex-1 rounded-none border-r flex items-center gap-2 h-12"
              >
                <DollarSign className="w-4 h-4" />
                לוח כספי
                <Badge variant="secondary" className="ml-2">
                  {formatCurrency(summary.totalRevenue)}
                </Badge>
              </Button>
              <Button
                variant={activeTab === 'quantity' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('quantity')}
                className="flex-1 rounded-none flex items-center gap-2 h-12"
              >
                <Package className="w-4 h-4" />
                לוח כמותי
                <Badge variant="secondary" className="ml-2">
                  {formatNumber(summary.totalQuantity)}
                </Badge>
              </Button>
            </div>
          </Card>
        </div>

        {/* Enhanced KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900 hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                סה"כ מכירות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                ממוצע: {formatCurrency(insights.avgOrderValue)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950 dark:to-blue-900 hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                סה"כ כמות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatNumber(summary.totalQuantity)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                יחידות במלאי
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950 dark:to-purple-900 hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-600" />
                סה"כ הזמנות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {formatNumber(summary.totalOrders)}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                הזמנות פעילות
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 dark:from-orange-950 dark:to-orange-900 hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                לקוחות ייחודיים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {formatNumber(summary.uniqueCustomers)}
              </div>
              <div className="text-xs text-orange-600 mt-1">
                לקוחות פעילים
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Top Products */}
          <Card className="shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                מוצרים מובילים - {activeTab === 'quantity' ? 'כמות' : 'מכירות'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topProducts} layout="horizontal" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [
                      activeTab === 'quantity' ? formatNumber(value) : formatCurrency(value),
                      activeTab === 'quantity' ? 'כמות' : 'מכירות'
                    ]}
                    labelFormatter={(label) => `מוצר: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#gradient1)"
                    radius={[0, 4, 4, 0]}
                  />
                  <defs>
                    <linearGradient id="gradient1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enhanced Top Customers */}
          <Card className="shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                לקוחות מובילים - {activeTab === 'quantity' ? 'כמות' : 'מכירות'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topCustomers} layout="horizontal" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [
                      activeTab === 'quantity' ? formatNumber(value) : formatCurrency(value),
                      activeTab === 'quantity' ? 'כמות' : 'מכירות'
                    ]}
                    labelFormatter={(label, payload) => {
                      const customer = topCustomers.find(c => c.name === label);
                      return `לקוח: ${customer?.fullName || label}`;
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#gradient2)"
                    radius={[0, 4, 4, 0]}
                  />
                  <defs>
                    <linearGradient id="gradient2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Monthly Trend */}
        {summary.byMonth.length > 0 && (
          <Card className="shadow-lg animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                מגמה חודשית - {activeTab === 'quantity' ? 'כמות' : 'מכירות'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={summary.byMonth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                      name === 'revenue' ? 'מכירות' : name === 'quantity' ? 'כמות' : 'הזמנות'
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  {activeTab === 'quantity' ? (
                    <Line 
                      type="monotone" 
                      dataKey="quantity" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  ) : (
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
         )}

        {/* AI Advice Dialog */}
        <Dialog open={showAdvice} onOpenChange={setShowAdvice}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                ייעוץ AI לדשבורד
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="font-medium">המלצות מותאמות אישית</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {aiAdvice || 'טוען המלצות...'}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}