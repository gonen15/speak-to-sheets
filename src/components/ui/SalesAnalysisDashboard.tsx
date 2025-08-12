import React, { useState, useEffect } from "react";
import { JuliusSkeleton } from "@/components/ui/skeleton";
import KPI from "@/components/ui/KPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { SalesFilters, ViewType } from "@/types/sales";
import { useSalesData } from "@/hooks/useSalesData";
import SalesFiltersComponent from "@/components/sales/SalesFilters";
import ProductDetailView from "@/components/sales/ProductDetailView";
import CustomerDetailView from "@/components/sales/CustomerDetailView";
import SalesDrilldown from "@/components/sales/SalesDrilldown";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

export default function SalesAnalysisDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SalesFilters>({
    dateRange: { from: '2025-01-01', to: '2025-07-31' },
    products: [],
    customers: [],
    categories: [],
    view: 'overview',
    drilldownPath: []
  });

  const [drilldownData, setDrilldownData] = useState<any>(null);

  const { 
    getFilteredSalesData, 
    getProductDetails, 
    getCustomerDetails, 
    getAvailableFilters 
  } = useSalesData();

  const salesData = getFilteredSalesData(filters);
  const availableFilters = getAvailableFilters();

  useEffect(() => {
    setLoading(false);
    setError(null);
  }, [filters]);

  const handleDrillDown = (data: any) => {
    console.log('Drill down:', data);
    
    if (data.type === 'product') {
      setFilters(prev => ({
        ...prev,
        view: 'product',
        drilldownPath: [...prev.drilldownPath, { type: 'product', value: data.category, label: data.category }]
      }));
    } else if (data.type === 'customer') {
      setFilters(prev => ({
        ...prev,
        view: 'customer',
        drilldownPath: [...prev.drilldownPath, { type: 'customer', value: data.customer, label: data.customer }]
      }));
    } else {
      // Generic drilldown
      setDrilldownData({
        type: data.type,
        title: data.title || `ניתוח ${data.type}`,
        data: data.data || [],
        context: data
      });
      
      setFilters(prev => ({
        ...prev,
        view: 'drilldown',
        drilldownPath: [...prev.drilldownPath, { 
          type: data.type, 
          value: data.value || data.type, 
          label: data.title || data.type 
        }]
      }));
    }
  };

  const handleBack = () => {
    if (filters.drilldownPath.length > 0) {
      const newPath = filters.drilldownPath.slice(0, -1);
      setFilters(prev => ({
        ...prev,
        drilldownPath: newPath,
        view: newPath.length === 0 ? 'overview' : newPath[newPath.length - 1].type as ViewType
      }));
      
      if (newPath.length === 0) {
        setDrilldownData(null);
      }
    }
  };

  const renderMainDashboard = () => (
    <div className="space-y-6 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">דוח מכירות כמותיות 2025</h2>
      </div>
      
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI
          label="סך יחידות נמכרו"
          value={salesData.totalQuantity}
          format="number"
          hint="סך כל היחידות שנמכרו ב-2025 (7 חודשים)"
        />
        <KPI
          label="מוצרים פעילים"
          value={salesData.totalProducts}
          format="number"
          hint="מוצרים עם מכירות חיוביות"
        />
        <KPI
          label="לקוחות ייחודיים"
          value={salesData.uniqueCustomers}
          format="number"
          hint="מספר לקוחות שונים"
        />
        <KPI
          label="ממוצע יחידות למוצר"
          value={Math.round(salesData.avgQuantityPerProduct)}
          format="number"
          hint="ממוצע יחידות למוצר פעיל"
        />
        <KPI
          label="קטגוריות פעילות"
          value={salesData.totalCategories}
          format="number"
          hint="מספר קטגוריות מוצרים פעילות"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Month */}
        <Card>
          <CardHeader>
            <CardTitle>מכירות כמותיות לפי חודש 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={salesData.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
                <Bar 
                  dataKey="quantity" 
                  fill="#8884d8" 
                  style={{ cursor: 'pointer' }}
                  onClick={(data) => handleDrillDown({
                    type: 'month',
                    month: data.month,
                    value: data.quantity,
                    title: `ניתוח מכירות ${data.month} 2025`
                  })}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>חלוקה לפי קטגוריה</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={salesData.salesByCategory.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantity"
                  label={({ category, percentage }) => `${category.replace(' - ', '\n')} (${percentage.toFixed(1)}%)`}
                  style={{ cursor: 'pointer' }}
                  onClick={(data) => handleDrillDown({
                    type: 'product',
                    category: data.category,
                    value: data.quantity
                  })}
                >
                  {salesData.salesByCategory.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>לקוחות מובילים (לפי כמות)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesData.topCustomers.slice(0, 8).map((customer, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center py-2 border-b border-border/30 last:border-0 hover:bg-muted rounded px-2 cursor-pointer transition-colors"
                  onClick={() => handleDrillDown({
                    type: 'customer',
                    customer: customer.customer,
                    quantity: customer.quantity
                  })}
                >
                  <div className="flex-1">
                    <span className="text-sm text-foreground truncate block">{customer.customer}</span>
                    <span className="text-xs text-muted-foreground">{customer.products} מוצרים</span>
                  </div>
                  <span className="text-sm font-medium text-right ml-4">
                    {customer.quantity.toLocaleString()} יח'
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>מוצרים מובילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesData.topProducts.map((product, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center py-2 border-b border-border/30 last:border-0 hover:bg-muted rounded px-2 cursor-pointer transition-colors"
                  onClick={() => handleDrillDown({
                    type: 'product',
                    category: product.product,
                    quantity: product.quantity
                  })}
                >
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{product.product}</span>
                    <div className="text-xs text-muted-foreground">מוביל בקטגוריה</div>
                  </div>
                  <span className="text-sm font-medium text-right ml-4">
                    {product.quantity.toLocaleString()} יח'
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Status */}
      <Card>
        <CardHeader>
          <CardTitle>פילוח כמותי לפי משפחת מוצרים</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData.salesByStatus} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="status" type="category" width={120} />
              <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
              <Bar 
                dataKey="quantity" 
                fill="#8884d8" 
                style={{ cursor: 'pointer' }}
                onClick={(data) => handleDrillDown({
                  type: 'category',
                  category: data.status,
                  quantity: data.quantity,
                  title: `ניתוח ${data.status}`
                })}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">דוח מכירות כמותיות</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <JuliusSkeleton variant="kpi" />
            <JuliusSkeleton variant="kpi" />
            <JuliusSkeleton variant="kpi" />
            <JuliusSkeleton variant="kpi" />
          </div>
          <JuliusSkeleton variant="chart" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="julius-card p-6 border-l-4 border-l-destructive mb-6">
          <h2 className="text-2xl font-bold mb-4">דוח מכירות כמותיות</h2>
          <div className="text-destructive mb-4">{error}</div>
        </div>
      );
    }

    switch (filters.view) {
      case 'product':
        const productPath = filters.drilldownPath.find(p => p.type === 'product');
        if (productPath) {
          const productDetails = getProductDetails(productPath.value);
          if (productDetails) {
            return (
              <ProductDetailView 
                product={productDetails} 
                onBack={handleBack}
                onDrillDown={handleDrillDown}
              />
            );
          }
        }
        return renderMainDashboard();

      case 'customer':
        const customerPath = filters.drilldownPath.find(p => p.type === 'customer');
        if (customerPath) {
          const customerDetails = getCustomerDetails(customerPath.value);
          if (customerDetails) {
            return (
              <CustomerDetailView 
                customer={customerDetails} 
                onBack={handleBack}
                onDrillDown={handleDrillDown}
              />
            );
          }
        }
        return renderMainDashboard();

      case 'drilldown':
        if (drilldownData) {
          return (
            <SalesDrilldown
              drilldownData={drilldownData}
              onBack={handleBack}
              onDrillDown={handleDrillDown}
            />
          );
        }
        return renderMainDashboard();

      default:
        return renderMainDashboard();
    }
  };

  return (
    <div className="space-y-6">
      <SalesFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        availableFilters={availableFilters}
      />
      
      {renderContent()}
    </div>
  );
}