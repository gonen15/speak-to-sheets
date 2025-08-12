import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ProductData } from '@/types/sales';
import { ArrowLeft, TrendingUp, TrendingDown, Users } from 'lucide-react';
import KPI from '@/components/ui/KPI';
import { useSalesData } from '@/hooks/useSalesData';

interface ProductDetailViewProps {
  product: ProductData;
  onBack: () => void;
  onDrillDown?: (data: any) => void;
}

export default function ProductDetailView({ product, onBack, onDrillDown }: ProductDetailViewProps) {
  const { getProductCustomerBreakdown } = useSalesData();
  const customerBreakdown = getProductCustomerBreakdown(product.category);
  
  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  
  // Prepare comparative data
  const monthlyComparison = monthNames.slice(0, 7).map((month, idx) => ({
    month,
    "2024": product.monthly2024[idx] || 0,
    "2025": Math.max(0, product.monthly2025[idx] || 0)
  }));

  // Calculate insights
  const totalSales2025 = product.total2025;
  const totalSales2024 = product.monthly2024.slice(0, 7).reduce((sum, val) => sum + (val || 0), 0);
  const growthVsPrevYear = totalSales2024 > 0 ? ((totalSales2025 - totalSales2024) / totalSales2024) * 100 : 0;
  
  const peakMonth2025 = monthNames[product.monthly2025.indexOf(Math.max(...product.monthly2025))];
  const peakValue2025 = Math.max(...product.monthly2025);

  const isGrowing = product.growthYearly > 0;

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
            <h2 className="text-2xl font-bold">{product.category}</h2>
            <p className="text-muted-foreground">ניתוח מפורט מוצר</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isGrowing ? "default" : "destructive"}>
            {isGrowing ? <TrendingUp className="w-3 h-3 ml-1" /> : <TrendingDown className="w-3 h-3 ml-1" />}
            {isGrowing ? 'מוצר צומח' : 'מוצר בירידה'}
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI
          label="מכירות 2025"
          value={totalSales2025}
          format="number"
          hint="סך יחידות שנמכרו ב-2025"
        />
        <KPI
          label="צמיחה שנתית"
          value={product.growthYearly}
          format="percent"
          hint="צמיחה מול תקופה מקבילה אשתקד"
        />
        <KPI
          label="צמיחה חודשית"
          value={product.growthMonthly || 0}
          format="percent"
          hint="צמיחה חודש על חודש"
        />
        <KPI
          label="שיא חודשי"
          value={peakValue2025}
          format="number"
          hint={`שיא מכירות ב${peakMonth2025}`}
        />
        <KPI
          label="מול שנה שעברה"
          value={growthVsPrevYear}
          format="percent"
          hint="השוואה ל-7 חודשים ראשונים 2024"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>מגמה חודשית - 2024 מול 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
                <Line type="monotone" dataKey="2024" stroke="#82ca9d" strokeWidth={2} name="2024" />
                <Line type="monotone" dataKey="2025" stroke="#8884d8" strokeWidth={3} name="2025" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly 2025 Details */}
        <Card>
          <CardHeader>
            <CardTitle>פירוט מכירות 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
                <Bar 
                  dataKey="2025" 
                  fill="#8884d8" 
                  onClick={(data, index) => onDrillDown && onDrillDown({
                    type: 'month',
                    product: product.category,
                    month: data.month,
                    value: data["2025"]
                  })}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Breakdown for this Product */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            פירוט לקוחות עבור {product.category}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(customerBreakdown).map(([customerName, data]: [string, any]) => {
              const julyQuantity = data.monthly2025[6] || 0; // יולי - אינדקס 6
              const totalQuantity = data.total2025;
              return (
                <div 
                  key={customerName}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onDrillDown && onDrillDown({
                    type: 'customer-product-detail',
                    customer: customerName,
                    product: product.category,
                    data: data
                  })}
                >
                  <div className="flex-1">
                    <p className="font-medium">{customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      יולי 2025: {julyQuantity.toLocaleString()} יח' • סה"כ: {totalQuantity.toLocaleString()} יח'
                    </p>
                  </div>
                  <div className="text-left">
                    <Badge variant="outline">
                      {((totalQuantity / product.total2025) * 100).toFixed(1)}% מהמוצר
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>תובנות מוצר</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">ביצועים</h4>
              <p className="text-sm text-muted-foreground">
                {isGrowing 
                  ? `המוצר מציג צמיחה של ${product.growthYearly.toFixed(1)}% מול שנה שעברה`
                  : `המוצר בירידה של ${Math.abs(product.growthYearly).toFixed(1)}% מול שנה שעברה`
                }
              </p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">עונתיות</h4>
              <p className="text-sm text-muted-foreground">
                שיא המכירות היה ב{peakMonth2025} עם {peakValue2025.toLocaleString()} יחידות
              </p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">מגמה</h4>
              <p className="text-sm text-muted-foreground">
                {product.growthMonthly && product.growthMonthly > 0
                  ? `מגמת צמיחה חודשית של ${product.growthMonthly.toFixed(1)}%`
                  : 'מגמה יציבה או בירידה קלה'
                }
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
              onClick={() => onDrillDown && onDrillDown({ type: 'customers', product: product.category })}
            >
              לקוחות מובילים למוצר זה
            </Button>
            <Button 
              variant="outline"
              onClick={() => onDrillDown && onDrillDown({ type: 'regions', product: product.category })}
            >
              ביצועים לפי אזור
            </Button>
            <Button 
              variant="outline"
              onClick={() => onDrillDown && onDrillDown({ type: 'forecast', product: product.category })}
            >
              תחזית לחודשים הבאים
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}