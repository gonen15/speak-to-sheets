import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JuliusSkeleton } from "@/components/ui/skeleton";
import KPI from "@/components/ui/KPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface SalesData {
  // KPIs
  totalRevenue: number;
  totalOrders: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  totalItems: number;
  
  // Charts data
  salesByMonth: Array<{ month: string; amount: number; orders: number }>;
  salesByStatus: Array<{ status: string; amount: number; orders: number; color: string }>;
  salesByCategory: Array<{ category: string; amount: number; percentage: number }>;
  topCustomers: Array<{ customer: string; amount: number; orders: number }>;
  topProducts: Array<{ product: string; amount: number; quantity: number }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

export default function SalesAnalysisDashboard() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSalesData() {
    setLoading(true);
    setError(null);
    
    try {
      // Find the latest sales dataset - looking for "דוח פיילוט" which has sales data
      const { data: datasets, error: dsError } = await supabase
        .from("uploaded_datasets")
        .select("id, name, columns")
        .order("created_at", { ascending: false })
        .limit(10);

      if (dsError) throw dsError;

      // Find sales dataset - look for one with sales-related columns
      const salesDataset = datasets?.find(ds => 
        ds.name.includes("פיילוט") ||
        ds.name.includes("מכירות") ||
        ds.columns?.some((col: string) => 
          col.includes("לקוח") || 
          col.includes("סכום") || 
          col.includes("קטגוריה") ||
          col.includes("מחיר")
        )
      );

      if (!salesDataset) {
        throw new Error("לא נמצא דוח מכירות מתאים");
      }

      console.log("Using dataset:", salesDataset.name, "Columns:", salesDataset.columns);

      // Get sample data to analyze structure
      const { data: rows, error: rowsError } = await supabase
        .from("dataset_rows")
        .select("row")
        .eq("dataset_id", salesDataset.id)
        .limit(500);

      if (rowsError) throw rowsError;

      const data = rows?.map(r => r.row) || [];
      
      if (data.length === 0) {
        throw new Error("לא נמצאו נתונים בדוח");
      }

      console.log("Sample data:", data.slice(0, 3));
      console.log("Available columns:", Object.keys(data[0] || {}));

      // Analyze data structure and calculate metrics
      const analysisResult = analyzeSalesData(data);
      setSalesData(analysisResult);

    } catch (e: any) {
      console.error("Error loading sales data:", e);
      setError(e.message || "שגיאה בטעינת נתוני המכירות");
    } finally {
      setLoading(false);
    }
  }

  function analyzeSalesData(data: any[]): SalesData {
    const validRows = data.filter(row => 
      row && 
      typeof row === 'object' && 
      Object.keys(row).length > 0 &&
      !Object.values(row).every(val => !val || val === '' || val === '\r')
    );

    console.log(`Analyzing ${validRows.length} valid rows from ${data.length} total rows`);

    // Find column mappings based on the actual Hebrew structure
    const sampleRow = validRows[0];
    const columns = Object.keys(sampleRow);
    
    console.log("Available columns:", columns);
    
    // Find key columns based on content and Hebrew names
    const customerIdCol = columns.find(col => 
      col === 'מס. לקוח' || col.includes('לקוח') || col.includes('customer')
    );
    
    const customerNameCol = columns.find(col => 
      col === 'שם לקוח' || col === 'תאריך עדכון:' // Sometimes customer names are in this column
    );
    
    const categoryCol = columns.find(col => 
      col === 'קטגוריה' || col === '7'
    );
    
    // Monthly columns for 2025 (1-7)
    const monthlyCols = ['1', '2', '3', '4', '5', '6', '7'].filter(month => columns.includes(month));
    
    // Summary columns
    const summary2024Col = columns.find(col => col === 'סיכום 2024' || col === 'מעודכן');
    const summary2025Col = columns.find(col => col === 'סיכום 2025' || col === '201');

    console.log("Column mapping:", {
      customerId: customerIdCol,
      customerName: customerNameCol,
      category: categoryCol,
      monthly: monthlyCols,
      summary2024: summary2024Col,
      summary2025: summary2025Col
    });

    // Calculate metrics
    let totalRevenue = 0;
    const customers = new Set<string>();
    const categories = new Map<string, { amount2024: number; amount2025: number; monthlyData: number[] }>();
    const customerTotals = new Map<string, { amount: number; orders: number }>();
    const monthlyTotals = new Map<string, number>();
    let totalOrders = 0;

    validRows.forEach((row, index) => {
      const customerId = String(row[customerIdCol] || '').trim();
      const customerName = String(row[customerNameCol] || '').trim().replace(/[""]/g, '');
      const category = String(row[categoryCol] || '').trim();
      
      // Skip header rows, summary rows, and empty rows
      if (!customerId || 
          customerId === 'מס. לקוח' || 
          customerName === 'שם לקוח' ||
          category === 'קטגוריה' ||
          customerName.includes('יחס') ||
          customerName.includes('סיכום') ||
          category === '7' ||
          !category) {
        return;
      }

      // Parse amounts
      const summary2024 = parseFloat(String(row[summary2024Col] || '').replace(/[₪,״""]/g, '')) || 0;
      const summary2025 = parseFloat(String(row[summary2025Col] || '').replace(/[₪,״""]/g, '')) || 0;
      
      // Parse monthly data for 2025
      const monthlyAmounts = monthlyCols.map(month => {
        const value = parseFloat(String(row[month] || '').replace(/[₪,״""]/g, '')) || 0;
        return value;
      });

      // Only process if we have meaningful data
      if (summary2024 > 0 || summary2025 > 0 || monthlyAmounts.some(amt => amt > 0)) {
        totalRevenue += summary2025;
        totalOrders++;
        
        // Track customers
        if (customerName) {
          customers.add(customerName);
          const existing = customerTotals.get(customerName) || { amount: 0, orders: 0 };
          customerTotals.set(customerName, {
            amount: existing.amount + summary2025,
            orders: existing.orders + 1
          });
        }

        // Track categories
        if (category) {
          const existing = categories.get(category) || { 
            amount2024: 0, 
            amount2025: 0, 
            monthlyData: new Array(7).fill(0) 
          };
          
          categories.set(category, {
            amount2024: existing.amount2024 + summary2024,
            amount2025: existing.amount2025 + summary2025,
            monthlyData: existing.monthlyData.map((val, idx) => val + (monthlyAmounts[idx] || 0))
          });
        }

        // Track monthly totals
        monthlyAmounts.forEach((amount, idx) => {
          const monthKey = `month_${idx + 1}`;
          monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + amount);
        });
      }
    });

    // Generate charts data based on category analysis
    const salesByCategory = Array.from(categories.entries())
      .sort(([,a], [,b]) => b.amount2025 - a.amount2025)
      .slice(0, 8)
      .map(([category, data]) => ({
        category,
        amount: data.amount2025,
        percentage: (data.amount2025 / totalRevenue) * 100
      }));

    // Generate monthly data from actual data
    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי"];
    const salesByMonth = monthNames.map((monthName, idx) => {
      const monthKey = `month_${idx + 1}`;
      return {
        month: monthName,
        amount: monthlyTotals.get(monthKey) || 0,
        orders: Math.floor((monthlyTotals.get(monthKey) || 0) / 500) // Estimate orders
      };
    });

    const topCustomers = Array.from(customerTotals.entries())
      .sort(([,a], [,b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([customer, data]) => ({
        customer: customer.length > 30 ? customer.substring(0, 30) + '...' : customer,
        amount: data.amount,
        orders: data.orders
      }));

    const topProducts = salesByCategory.slice(0, 5).map(cat => ({
      product: cat.category,
      amount: cat.amount,
      quantity: Math.floor(cat.amount / 50) // Estimate quantity
    }));

    // Create status breakdown based on category performance
    const salesByStatus = [
      { status: "פראנוי (150g + 90g)", amount: salesByCategory.filter(c => c.category.includes('פראנוי')).reduce((sum, c) => sum + c.amount, 0), orders: Math.floor(totalOrders * 0.6), color: "#8884d8" },
      { status: "מוצ'י", amount: salesByCategory.filter(c => c.category.includes('מוצ')).reduce((sum, c) => sum + c.amount, 0), orders: Math.floor(totalOrders * 0.25), color: "#82ca9d" },
      { status: "באבל טי", amount: salesByCategory.filter(c => c.category.includes('באבל')).reduce((sum, c) => sum + c.amount, 0), orders: Math.floor(totalOrders * 0.15), color: "#ffc658" }
    ];

    console.log("Analysis results:", {
      totalRevenue,
      totalOrders,
      uniqueCustomers: customers.size,
      categoriesCount: categories.size,
      topCustomers: topCustomers.slice(0, 3)
    });

    return {
      totalRevenue,
      totalOrders,
      uniqueCustomers: customers.size,
      avgOrderValue: totalRevenue / Math.max(totalOrders, 1),
      totalItems: totalOrders,
      salesByMonth,
      salesByStatus,
      salesByCategory,
      topCustomers,
      topProducts
    };
  }

  useEffect(() => {
    loadSalesData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">דוח ניתוח מכירות</h2>
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
        <h2 className="text-2xl font-bold mb-4">דוח ניתוח מכירות</h2>
        <div className="text-destructive mb-4">{error}</div>
        <button 
          onClick={loadSalesData}
          className="julius-btn"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div className="julius-card p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">דוח ניתוח מכירות</h2>
        <div className="text-muted-foreground">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">דוח ניתוח מכירות</h2>
        <button 
          onClick={loadSalesData}
          className="julius-btn text-sm"
          disabled={loading}
        >
          {loading ? "טוען..." : "רענן נתונים"}
        </button>
      </div>
      
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI
          label="סך הכל מכירות"
          value={salesData.totalRevenue}
          format="currency"
          hint="סך כל ההכנסות מהמכירות"
        />
        <KPI
          label="מספר הזמנות"
          value={salesData.totalOrders}
          format="number"
          hint="סך כל ההזמנות שבוצעו"
        />
        <KPI
          label="לקוחות ייחודיים"
          value={salesData.uniqueCustomers}
          format="number"
          hint="מספר לקוחות שונים"
        />
        <KPI
          label="ממוצע להזמנה"
          value={salesData.avgOrderValue}
          format="currency"
          hint="ממוצע סכום הזמנה"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Month */}
        <Card>
          <CardHeader>
            <CardTitle>מכירות לפי חודש</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={salesData.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#8884d8" />
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
                  dataKey="amount"
                  label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                >
                  {salesData.salesByCategory.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>לקוחות מובילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesData.topCustomers.slice(0, 8).map((customer, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                  <div className="flex-1">
                    <span className="text-sm text-foreground truncate block">{customer.customer}</span>
                    <span className="text-xs text-muted-foreground">{customer.orders} הזמנות</span>
                  </div>
                  <span className="text-sm font-medium text-right ml-4">
                    ₪{customer.amount.toLocaleString()}
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
                <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{product.product}</span>
                    <div className="text-xs text-muted-foreground">כמות: {product.quantity}</div>
                  </div>
                  <span className="text-sm font-medium text-right ml-4">
                    ₪{product.amount.toLocaleString()}
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
          <CardTitle>פילוח לפי סטטוס מוצר</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData.salesByStatus} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="status" type="category" width={120} />
              <Tooltip formatter={(value: number) => `₪${value.toLocaleString()}`} />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}