import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CustomerData } from '@/types/sales';
import { ArrowLeft, Building2, Package, Target } from 'lucide-react';
import KPI from '@/components/ui/KPI';

interface CustomerDetailViewProps {
  customer: CustomerData;
  onBack: () => void;
  onDrillDown?: (data: any) => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

export default function CustomerDetailView({ customer, onBack, onDrillDown }: CustomerDetailViewProps) {
  // Generate synthetic monthly data for this customer
  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי"];
  const monthlyData = monthNames.map((month, idx) => ({
    month,
    quantity: Math.floor(customer.quantity * [0.12, 0.14, 0.13, 0.15, 0.16, 0.18, 0.12][idx]),
    products: Math.floor(customer.products * [0.6, 0.8, 0.7, 0.9, 1.0, 0.9, 0.8][idx])
  }));

  // Generate category breakdown
  const categoryData = customer.categories.map((category, idx) => ({
    category: category.length > 15 ? category.substring(0, 15) + '...' : category,
    fullCategory: category,
    quantity: Math.floor(customer.quantity * [0.45, 0.35, 0.20][idx] || 0),
    percentage: [45, 35, 20][idx] || 0
  }));

  const avgMonthlyQuantity = customer.quantity / 7;
  const totalCategories = customer.categories.length;
  const customerType = customer.quantity > 100000 ? 'לקוח אסטרטגי' : customer.quantity > 50000 ? 'לקוח מרכזי' : 'לקוח רגיל';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזרה
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{customer.customer}</h2>
            <p className="text-muted-foreground">ניתוח מפורט לקוח</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Building2 className="w-3 h-3 ml-1" />
            {customerType}
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI
          label="סך רכישות 2025"
          value={customer.quantity}
          format="number"
          hint="סך יחידות שנרכשו ב-2025"
        />
        <KPI
          label="מוצרים פעילים"
          value={customer.products}
          format="number"
          hint="מספר מוצרים שהלקוח רוכש"
        />
        <KPI
          label="קטגוריות"
          value={totalCategories}
          format="number"
          hint="מספר קטגוריות מוצרים"
        />
        <KPI
          label="ממוצע חודשי"
          value={Math.round(avgMonthlyQuantity)}
          format="number"
          hint="ממוצע יחידות בחודש"
        />
        <KPI
          label="נתח מהמכירות"
          value={(customer.quantity / 777856) * 100}
          format="percent"
          hint="אחוז מסך המכירות"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Purchase Trend */}
        <Card>
          <CardHeader>
            <CardTitle>מגמת רכישות חודשית</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
                <Bar 
                  dataKey="quantity" 
                  fill="#8884d8"
                  onClick={(data, index) => onDrillDown && onDrillDown({
                    type: 'month',
                    customer: customer.customer,
                    month: data.month,
                    value: data.quantity
                  })}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>פילוח לפי קטגוריות</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantity"
                  label={({ category, percentage }) => `${category} (${percentage}%)`}
                  onClick={(data) => onDrillDown && onDrillDown({
                    type: 'category',
                    customer: customer.customer,
                    category: data.fullCategory,
                    value: data.quantity
                  })}
                  style={{ cursor: 'pointer' }}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle>ביצועי מוצרים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customer.categories.map((category, idx) => {
              const quantity = Math.floor(customer.quantity * [0.45, 0.35, 0.20][idx] || 0);
              const growth = [12.5, -5.2, 28.7][idx] || 0;
              return (
                <div 
                  key={category} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onDrillDown && onDrillDown({
                    type: 'product-detail',
                    customer: customer.customer,
                    category: category
                  })}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{category}</p>
                      <p className="text-sm text-muted-foreground">
                        {quantity.toLocaleString()} יחידות
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant={growth > 0 ? "default" : "destructive"}>
                      {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>תובנות לקוח</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                פרופיל לקוח
              </h4>
              <p className="text-sm text-muted-foreground">
                {customerType} עם {customer.products} מוצרים פעילים ונפח רכישות של {customer.quantity.toLocaleString()} יחידות
              </p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">דפוס רכישה</h4>
              <p className="text-sm text-muted-foreground">
                רכישות יציבות עם שיא ביוני ({Math.max(...monthlyData.map(d => d.quantity)).toLocaleString()} יח')
              </p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">המלצות</h4>
              <p className="text-sm text-muted-foreground">
                פוטנציאל להרחבת רכישות בקטגוריות חדשות ושיפור התדירות
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={() => onDrillDown && onDrillDown({ type: 'orders', customer: customer.customer })}
            >
              היסטוריית הזמנות
            </Button>
            <Button 
              variant="outline"
              onClick={() => onDrillDown && onDrillDown({ type: 'potential', customer: customer.customer })}
            >
              פוטנציאל צמיחה
            </Button>
            <Button 
              variant="outline"
              onClick={() => onDrillDown && onDrillDown({ type: 'recommendations', customer: customer.customer })}
            >
              המלצות מוצרים
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}