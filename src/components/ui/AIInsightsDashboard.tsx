import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, Users, Package, DollarSign, Bot, Lightbulb, Target, Activity } from "lucide-react";
import InsightCard from "@/components/ui/InsightCard";

interface AIInsight {
  id: string;
  type: "insight" | "warning" | "success";
  title: string;
  summary: string;
  priority: "high" | "medium" | "low";
  category: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  }>;
}

interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  lowStockItems: number;
  topCustomers: Array<{ name: string; sales: number; }>;
  profitMargin: number;
  growthRate: number;
}

export default function AIInsightsDashboard() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock AI insights - in production this would come from an AI service
  const generateAIInsights = (): AIInsight[] => {
    return [
      {
        id: "1",
        type: "warning",
        title: "התראת מלאי נמוך",
        summary: "זוהו 12 פריטים עם מלאי נמוך מהממוצע הנדרש. מומלץ לבצע הזמנה מחדש עבור פראנוי 150 גרם ופריטים נוספים כדי למנוע מחסור.",
        priority: "high",
        category: "מלאי",
        actions: [
          { label: "צפייה בפריטים", onClick: () => console.log("View items"), variant: "primary" },
          { label: "הזמן עכשיו", onClick: () => console.log("Order now"), variant: "secondary" }
        ]
      },
      {
        id: "2",
        type: "success",
        title: "מגמת מכירות חיובית",
        summary: "המכירות עלו ב-18% בחודש האחרון לעומת אותה תקופה אשתקד. הגידול מרוכז בעיקר במוצרים הפרמיום והזמנות ממעיין נציגויות.",
        priority: "medium",
        category: "מכירות",
        actions: [
          { label: "פירוט המגמה", onClick: () => console.log("View trend"), variant: "primary" }
        ]
      },
      {
        id: "3",
        type: "insight",
        title: "הזדמנות צמיחה בלקוחות חדשים",
        summary: "זוהה פוטנציאל להגדלת המכירות ב-25% על ידי פנייה ללקוחות חדשים באזור המרכז. הנתונים מראים ביקוש גבוה בסגמנט זה.",
        priority: "medium",
        category: "הזדמנויות",
        actions: [
          { label: "הצג אזורים", onClick: () => console.log("Show regions"), variant: "primary" },
          { label: "תכנון קמפיין", onClick: () => console.log("Plan campaign"), variant: "secondary" }
        ]
      }
    ];
  };

  // Mock metrics - in production this would come from Supabase
  const generateMetrics = (): DashboardMetrics => {
    return {
      totalSales: 14200000, // 14.2M NIS as mentioned in the logs
      totalOrders: 850, // 850 orders as mentioned in the logs
      lowStockItems: 12,
      topCustomers: [
        { name: "מעיין נציגויות", sales: 3850000 },
        { name: "לקוח פרמיום", sales: 2100000 },
        { name: "רשת חנויות", sales: 1750000 }
      ],
      profitMargin: 22.5,
      growthRate: 18.2
    };
  };

  useEffect(() => {
    // Simulate API loading
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInsights(generateAIInsights());
      setMetrics(generateMetrics());
      setLoading(false);
    };

    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      notation: value >= 1000000 ? 'compact' : 'standard'
    }).format(value);
  };

  const getStatusColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "warning";
      case "low": return "success";
      default: return "muted";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="julius-skeleton h-32"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="julius-skeleton h-24"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="julius-skeleton h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Assistant Header */}
      <Card className="julius-card bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">מרכז תובנות AI</CardTitle>
              <p className="text-sm text-muted-foreground">ניתוח אוטומטי וזיהוי הזדמנויות עסקיות</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="julius-card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="julius-label text-blue-600">סך מכירות 2025</p>
                  <p className="julius-value text-blue-900">
                    {formatCurrency(metrics.totalSales)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">+{metrics.growthRate}%</span>
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
                    {metrics.totalOrders.toLocaleString('he-IL')}
                  </p>
                  <p className="text-sm text-muted-foreground">עסקאות פעילות</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="julius-card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="julius-label text-orange-600">שולי רווח</p>
                  <p className="julius-value text-orange-900">
                    {metrics.profitMargin}%
                  </p>
                  <p className="text-sm text-muted-foreground">ממוצע חודשי</p>
                </div>
                <Target className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="julius-card bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="julius-label text-red-600">מלאי נמוך</p>
                  <p className="julius-value text-red-900">
                    {metrics.lowStockItems}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">דרוש טיפול</span>
                  </div>
                </div>
                <Package className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Customers Quick View */}
      {metrics && (
        <Card className="julius-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              לקוחות מובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topCustomers.map((customer, index) => (
                <div key={customer.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <span className="font-semibold text-primary">
                    {formatCurrency(customer.sales)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">תובנות והמלצות AI</h3>
        </div>
        
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            title={insight.title}
            summary={insight.summary}
            type={insight.type}
            actions={insight.actions}
            className={`border-r-4 ${
              insight.priority === 'high' 
                ? 'border-r-destructive' 
                : insight.priority === 'medium' 
                ? 'border-r-warning' 
                : 'border-r-success'
            }`}
          />
        ))}
      </div>

      {/* AI Assistant Placeholder */}
      <Card className="julius-card border-dashed border-2 border-muted">
        <CardContent className="text-center p-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">עוזר AI אישי (בפיתוח)</h3>
          <p className="text-muted-foreground mb-4">
            בקרוב: צ'אט בוט חכם לניתוח נתונים ותובנות עסקיות בזמן אמת
          </p>
          <Button variant="outline" disabled>
            בקרוב...
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}