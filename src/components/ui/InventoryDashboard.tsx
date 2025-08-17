import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, AlertTriangle, TrendingUp, TrendingDown, Calendar, Search, BarChart3, Eye } from "lucide-react";

// Mock inventory data - will be replaced with real data from Google Sheet
const inventoryData = [
  { brand: "בית תבלינות", product: "תבלין כללי", category: "תבלינים", currentStock: 150, averageMonthlySales: 45, daysOfInventory: 100, status: "good" },
  { brand: "נטף פלוס", product: "משקה קל", category: "משקאות", currentStock: 200, averageMonthlySales: 80, daysOfInventory: 75, status: "good" },
  { brand: "סוכני סיים", product: "קנדילו ממתק", category: "מתוקים", currentStock: 50, averageMonthlySales: 25, daysOfInventory: 60, status: "medium" },
  { brand: "צרינה", product: "אביזר שעון", category: "אביזרים", currentStock: 30, averageMonthlySales: 15, daysOfInventory: 60, status: "medium" },
  { brand: "יאנגי דלי", product: "מזון מוכן", category: "מזון מוכן", currentStock: 80, averageMonthlySales: 120, daysOfInventory: 20, status: "critical" },
  { brand: "לייב", product: "משקה אנרגיה", category: "משקאות", currentStock: 120, averageMonthlySales: 90, daysOfInventory: 40, status: "medium" },
  { brand: "קפואים פלוס", product: "מזון קפוא", category: "קפואים", currentStock: 300, averageMonthlySales: 200, daysOfInventory: 45, status: "medium" },
  { brand: "מעיין נציונות", product: "שיווק ממתק", category: "מתוקים", currentStock: 90, averageMonthlySales: 60, daysOfInventory: 45, status: "medium" },
].map(item => {
  // Calculate accurate days of inventory: current stock / average monthly sales
  const accurateDays = Math.round(item.currentStock / item.averageMonthlySales * 30);
  const status = accurateDays <= 30 ? 'critical' : accurateDays <= 60 ? 'medium' : 'good';
  return { ...item, daysOfInventory: accurateDays, status };
});

const productNameMapping: Record<string, string> = {
  "8437020396011": "בית תבלינות מ.ח",
  "8437020396028": "נטף פלוס בע\"מ", 
  "5027324003277": "סוכני סיים קנדילו",
  "5027324001181": "צרינה של סובלנות",
  "5027324001860": "יאנגי דלי ישראל",
  "5027324001839": "לייב בע\"מ",
  "8437020396011-12C": "קפואים פלוס בע\"מ",
  "8437020396028-12C": "מעיין נציונות שיווק"
};

export default function InventoryDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [sortBy, setSortBy] = useState<'daysOfInventory' | 'currentStock' | 'averageMonthlySales'>('daysOfInventory');

  const filteredInventory = useMemo(() => {
    return inventoryData.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedBrand !== 'all' && item.brand !== selectedBrand) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (searchProduct && !item.product.toLowerCase().includes(searchProduct.toLowerCase()) && !item.brand.toLowerCase().includes(searchProduct.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'daysOfInventory') return a.daysOfInventory - b.daysOfInventory;
      if (sortBy === 'currentStock') return b.currentStock - a.currentStock;
      return b.averageMonthlySales - a.averageMonthlySales;
    });
  }, [selectedCategory, selectedBrand, selectedStatus, searchProduct, sortBy]);

  const categories = [...new Set(inventoryData.map(item => item.category))];
  const brands = [...new Set(inventoryData.map(item => item.brand))];
  
  const summaryStats = useMemo(() => {
    const critical = filteredInventory.filter(item => item.daysOfInventory <= 30).length;
    const medium = filteredInventory.filter(item => item.daysOfInventory > 30 && item.daysOfInventory <= 60).length;
    const good = filteredInventory.filter(item => item.daysOfInventory > 60).length;
    const totalStock = filteredInventory.reduce((sum, item) => sum + item.currentStock, 0);
    const averageDays = filteredInventory.reduce((sum, item) => sum + item.daysOfInventory, 0) / filteredInventory.length;
    
    return { critical, medium, good, totalStock, averageDays: Math.round(averageDays) };
  }, [filteredInventory]);

  const statusChartData = [
    { name: "קריטי (≤30 ימים)", value: summaryStats.critical, fill: "#ef4444" },
    { name: "בינוני (31-60 ימים)", value: summaryStats.medium, fill: "#f59e0b" },
    { name: "טוב (>60 ימים)", value: summaryStats.good, fill: "#10b981" },
  ];

  const getStatusColor = (days: number) => {
    if (days <= 30) return "bg-red-500";
    if (days <= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = (days: number) => {
    if (days <= 30) return "קריטי";
    if (days <= 60) return "בינוני";
    return "טוב";
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">לוח בקרת מלאי</h1>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredInventory.length} מוצרים
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            פילטרים וחיפוש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">קטגוריה</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">מותג</label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר מותג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המותגים</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">סטטוס מלאי</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="critical">קריטי (≤30 ימים)</SelectItem>
                  <SelectItem value="medium">בינוני (31-60 ימים)</SelectItem>
                  <SelectItem value="good">טוב (&gt;60 ימים)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">מיון לפי</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר מיון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daysOfInventory">ימי מלאי</SelectItem>
                  <SelectItem value="currentStock">כמות במלאי</SelectItem>
                  <SelectItem value="averageMonthlySales">מכירות חודשיות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">חיפוש מוצר/מותג</label>
              <Input
                placeholder="הקלד שם מוצר או מותג..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Package className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{filteredInventory.length}</p>
                <p className="text-sm text-muted-foreground">סה"כ מוצרים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{summaryStats.critical}</p>
                <p className="text-sm text-muted-foreground">מוצרים קריטיים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summaryStats.totalStock.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">סה"כ יחידות במלאי</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{summaryStats.averageDays}</p>
                <p className="text-sm text-muted-foreground">ממוצע ימי מלאי</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 space-x-reverse">
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{summaryStats.good}</p>
                <p className="text-sm text-muted-foreground">מוצרים במצב טוב</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>פילוח סטטוס מלאי</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ימי מלאי לפי מוצר</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredInventory.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="product" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="daysOfInventory" 
                  fill="#3b82f6"
                  name="ימי מלאי"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            פירוט מלאי מוצרים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">מותג</th>
                  <th className="text-right p-2">מוצר</th>
                  <th className="text-right p-2">קטגוריה</th>
                  <th className="text-right p-2">כמות במלאי</th>
                  <th className="text-right p-2">מכירות חודשיות ממוצעות</th>
                  <th className="text-right p-2">ימי מלאי</th>
                  <th className="text-right p-2">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{item.brand}</td>
                    <td className="p-2">{item.product}</td>
                    <td className="p-2">{item.category}</td>
                    <td className="p-2">{item.currentStock.toLocaleString()}</td>
                    <td className="p-2">{item.averageMonthlySales.toLocaleString()}</td>
                    <td className="p-2 font-bold">{item.daysOfInventory}</td>
                    <td className="p-2">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(item.daysOfInventory)} text-white border-none`}
                      >
                        {getStatusText(item.daysOfInventory)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}