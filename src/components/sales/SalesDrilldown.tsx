import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowLeft, Calendar, Users, Package, TrendingUp, Info } from 'lucide-react';
import KPI from '@/components/ui/KPI';

interface DrilldownData {
  type: string;
  title: string;
  data: any[];
  context: any;
}

interface SalesDrilldownProps {
  drilldownData: DrilldownData;
  onBack: () => void;
  onDrillDown?: (data: any) => void;
}

export default function SalesDrilldown({ drilldownData, onBack, onDrillDown }: SalesDrilldownProps) {
  const { type, title, data, context } = drilldownData;

  const renderContent = () => {
    switch (type) {
      case 'month':
        return renderMonthDetail();
      case 'customers':
        return renderCustomersDetail();
      case 'category':
        return renderCategoryDetail();
      case 'orders':
        return renderOrdersDetail();
      case 'potential':
        return renderPotentialDetail();
      case 'recommendations':
        return renderRecommendationsDetail();
      default:
        return renderGenericDetail();
    }
  };

  const renderMonthDetail = () => {
    const monthData = {
      month: context.month,
      product: context.product,
      customer: context.customer,
      value: context.value
    };

    // Generate daily breakdown for the month
    const dailyData = Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      quantity: Math.floor(context.value * Math.random() * 0.1 + context.value * 0.02),
      orders: Math.floor(Math.random() * 5 + 1)
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI
            label="סך יחידות"
            value={context.value}
            format="number"
            hint={`יחידות שנמכרו ב${context.month}`}
          />
          <KPI
            label="ימי מכירות"
            value={dailyData.filter(d => d.quantity > 0).length}
            format="number"
            hint="ימים עם מכירות"
          />
          <KPI
            label="ממוצע יומי"
            value={Math.round(context.value / 30)}
            format="number"
            hint="ממוצע יחידות ביום"
          />
          <KPI
            label="שיא יומי"
            value={Math.max(...dailyData.map(d => d.quantity))}
            format="number"
            hint="השיא היומי החודש"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>פירוט יומי - {context.month}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} יח'`} />
                <Bar dataKey="quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCustomersDetail = () => {
    const customersData = [
      { customer: "מעיין נציגויות", quantity: 45230, orders: 12, lastOrder: "15/07/2025" },
      { customer: "קפואים פלוס", quantity: 38156, orders: 9, lastOrder: "20/07/2025" },
      { customer: "יאנגו דלי", quantity: 31847, orders: 8, lastOrder: "18/07/2025" },
      { customer: "רמי לוי", quantity: 19658, orders: 6, lastOrder: "22/07/2025" },
      { customer: "נתוני בר מזון", quantity: 12954, orders: 4, lastOrder: "16/07/2025" }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI
            label="סך לקוחות"
            value={customersData.length}
            format="number"
            hint={`לקוחות עבור ${context.product}`}
          />
          <KPI
            label="לקוח מוביל"
            value={customersData[0].quantity}
            format="number"
            hint={`${customersData[0].customer}`}
          />
          <KPI
            label="ממוצע ללקוח"
            value={Math.round(customersData.reduce((sum, c) => sum + c.quantity, 0) / customersData.length)}
            format="number"
            hint="ממוצע יחידות ללקוח"
          />
          <KPI
            label="סך הזמנות"
            value={customersData.reduce((sum, c) => sum + c.orders, 0)}
            format="number"
            hint="סך הזמנות כל הלקוחות"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>לקוחות מובילים - {context.product}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customersData.map((customer, idx) => (
                <div 
                  key={customer.customer}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onDrillDown && onDrillDown({
                    type: 'customer-product-detail',
                    customer: customer.customer,
                    product: context.product
                  })}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.customer}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.orders} הזמנות • עדכון אחרון: {customer.lastOrder}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{customer.quantity.toLocaleString()} יח'</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(customer.quantity / customer.orders).toLocaleString()} יח'/הזמנה
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCategoryDetail = () => {
    const products = [
      { product: "פראנוי 150 גרם - קלאסי", quantity: 89456, trend: 12.3 },
      { product: "פראנוי 150 גרם - וניל", quantity: 34562, trend: -2.1 },
      { product: "פראנוי 150 גרם - שוקולד", quantity: 28934, trend: 8.7 }
    ];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>מוצרים בקטגוריה - {context.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product, idx) => (
                <div 
                  key={product.product}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{product.product}</p>
                      <p className="text-sm text-muted-foreground">
                        עבור {context.customer}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{product.quantity.toLocaleString()} יח'</p>
                    <Badge variant={product.trend > 0 ? "default" : "destructive"}>
                      {product.trend > 0 ? '+' : ''}{product.trend.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderOrdersDetail = () => {
    const orders = Array.from({ length: 20 }, (_, i) => ({
      orderNumber: `ORD-${String(i + 1).padStart(4, '0')}`,
      date: new Date(2025, 6 - i % 7, Math.floor(Math.random() * 28) + 1).toLocaleDateString('he-IL'),
      quantity: Math.floor(Math.random() * 5000) + 1000,
      products: Math.floor(Math.random() * 3) + 1,
      status: ['הושלם', 'הושלם', 'הושלם', 'בתהליך'][Math.floor(Math.random() * 4)]
    }));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>היסטוריית הזמנות - {context.customer}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 10).map((order) => (
                <div 
                  key={order.orderNumber}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{order.quantity.toLocaleString()} יח'</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{order.products} מוצרים</span>
                      <Badge variant={order.status === 'הושלם' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPotentialDetail = () => {
    const opportunities = [
      { area: "הרחבת מוצרי פראנוי", potential: 45000, probability: 85, timeline: "3 חודשים" },
      { area: "כניסה לקטגוריית באבל טי", potential: 28000, probability: 60, timeline: "6 חודשים" },
      { area: "הגדלת תדירות הזמנות", potential: 15000, probability: 90, timeline: "1 חודש" }
    ];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>הזדמנויות צמיחה - {context.customer}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opportunities.map((opp, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{opp.area}</h4>
                    <Badge variant="outline">{opp.timeline}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">פוטנציאל: </span>
                      <span className="font-medium">{opp.potential.toLocaleString()} יח'</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">הסתברות: </span>
                      <span className="font-medium">{opp.probability}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRecommendationsDetail = () => {
    const recommendations = [
      { product: "באבל טי - כוסות", reason: "פופולרי בקרב לקוחות דומים", potential: 12000 },
      { product: "מוצ'י דאבלים", reason: "השלמה לסל הקניות הנוכחי", potential: 8500 },
      { product: "פראנוי 90 גרם", reason: "גודל חלופי למוצר הקיים", potential: 15000 }
    ];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>המלצות מוצרים - {context.customer}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.product}</h4>
                    <Badge variant="default">{rec.potential.toLocaleString()} יח'</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGenericDetail = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            פירוט נתונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            תצוגה מפורטת עבור {title}
          </p>
          <pre className="mt-4 p-4 bg-muted rounded text-sm overflow-auto">
            {JSON.stringify(context, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">ניתוח מפורט</p>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}