import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JuliusSkeleton } from "@/components/ui/skeleton";
import KPI from "@/components/ui/KPI";

interface SummaryData {
  totalRows: number;
  totalRevenue: number;
  uniqueClients: number;
  avgDealSize: number;
  winRate: number;
  topClients: Array<{ name: string; amount: number }>;
  statusBreakdown: Array<{ status: string; count: number; amount: number }>;
}

export default function DataSummaryReport() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    
    try {
      // Get available datasets
      const { data: datasets, error: dsError } = await supabase
        .from("uploaded_datasets")
        .select("id, name")
        .limit(1);

      if (dsError || !datasets?.length) {
        throw new Error("לא נמצאו datasets");
      }

      const datasetId = datasets[0].id;
      
      // Get sample data to analyze
      const { data: rows, error: rowsError } = await supabase
        .from("dataset_rows")
        .select("row")
        .eq("dataset_id", datasetId)
        .limit(1000);

      if (rowsError) throw rowsError;

      const data = rows?.map(r => r.row) || [];
      
      if (data.length === 0) {
        throw new Error("לא נמצאו נתונים בdataset");
      }

      // Analyze the data
      const totalRows = data.length;
      
      // Try to find revenue/amount fields
      const sampleRow = data[0];
      const amountFields = Object.keys(sampleRow).filter(key => 
        /amount|revenue|value|price|sum|total/i.test(key) && 
        !isNaN(Number(sampleRow[key]))
      );
      
      // Try to find client/customer fields
      const clientFields = Object.keys(sampleRow).filter(key => 
        /client|customer|company|account|name/i.test(key) &&
        typeof sampleRow[key] === 'string'
      );
      
      // Try to find status fields
      const statusFields = Object.keys(sampleRow).filter(key => 
        /status|state|stage|phase/i.test(key)
      );

      let totalRevenue = 0;
      let uniqueClients = new Set();
      let clientAmounts: Record<string, number> = {};
      let statusCounts: Record<string, { count: number; amount: number }> = {};
      
      const amountField = amountFields[0];
      const clientField = clientFields[0];
      const statusField = statusFields[0];

      // Calculate metrics
      data.forEach(row => {
        if (amountField && !isNaN(Number(row[amountField]))) {
          const amount = Number(row[amountField]);
          totalRevenue += amount;
          
          if (clientField && row[clientField]) {
            const client = String(row[clientField]);
            uniqueClients.add(client);
            clientAmounts[client] = (clientAmounts[client] || 0) + amount;
          }
          
          if (statusField && row[statusField]) {
            const status = String(row[statusField]);
            if (!statusCounts[status]) {
              statusCounts[status] = { count: 0, amount: 0 };
            }
            statusCounts[status].count++;
            statusCounts[status].amount += amount;
          }
        } else {
          if (clientField && row[clientField]) {
            uniqueClients.add(String(row[clientField]));
          }
          
          if (statusField && row[statusField]) {
            const status = String(row[statusField]);
            if (!statusCounts[status]) {
              statusCounts[status] = { count: 0, amount: 0 };
            }
            statusCounts[status].count++;
          }
        }
      });

      const avgDealSize = totalRevenue / Math.max(totalRows, 1);
      
      // Calculate win rate (assuming "closed" or "won" statuses indicate wins)
      const wonStatuses = Object.keys(statusCounts).filter(status => 
        /won|closed|success|complete|סגור|הצלחה/i.test(status)
      );
      const wonCount = wonStatuses.reduce((sum, status) => sum + statusCounts[status].count, 0);
      const winRate = wonCount / Math.max(totalRows, 1);

      // Top clients
      const topClients = Object.entries(clientAmounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      // Status breakdown
      const statusBreakdown = Object.entries(statusCounts)
        .map(([status, data]) => ({ status, count: data.count, amount: data.amount }))
        .sort((a, b) => b.amount - a.amount);

      setSummary({
        totalRows,
        totalRevenue,
        uniqueClients: uniqueClients.size,
        avgDealSize,
        winRate,
        topClients,
        statusBreakdown
      });

    } catch (e: any) {
      setError(e.message || "שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">סיכום נתונים מהדוח שהועלה</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <JuliusSkeleton variant="kpi" />
          <JuliusSkeleton variant="kpi" />
          <JuliusSkeleton variant="kpi" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="julius-card p-6 border-l-4 border-l-destructive">
        <h2 className="text-xl font-semibold mb-4">סיכום נתונים מהדוח שהועלה</h2>
        <div className="text-destructive">{error}</div>
        <button 
          onClick={loadSummary}
          className="julius-btn mt-4"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">סיכום נתונים מהדוח שהועלה</h2>
        <button 
          onClick={loadSummary}
          className="julius-btn text-sm"
          disabled={loading}
        >
          רענן נתונים
        </button>
      </div>
      
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI
          label="סך הכל שורות"
          value={summary.totalRows}
          format="number"
          hint="מספר כל הרשומות בדוח"
        />
        <KPI
          label="סך הכל הכנסות"
          value={summary.totalRevenue}
          format="currency"
          hint="סכום כל הסכומים בדוח"
        />
        <KPI
          label="לקוחות ייחודיים"
          value={summary.uniqueClients}
          format="number"
          hint="מספר לקוחות שונים"
        />
        <KPI
          label="גודל עסקה ממוצע"
          value={summary.avgDealSize}
          format="currency"
          hint="ממוצע סכום לעסקה"
        />
      </div>

      {summary.winRate > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <KPI
            label="אחוז הצלחה"
            value={summary.winRate}
            format="percent"
            hint="אחוז עסקאות שנסגרו בהצלחה"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        {summary.topClients.length > 0 && (
          <div className="julius-card p-6">
            <h3 className="julius-label mb-4">לקוחות מובילים</h3>
            <div className="space-y-3">
              {summary.topClients.map((client, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-foreground truncate flex-1">{client.name}</span>
                  <span className="text-sm font-medium text-right ml-4">
                    {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(client.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {summary.statusBreakdown.length > 0 && (
          <div className="julius-card p-6">
            <h3 className="julius-label mb-4">פירוק לפי סטטוס</h3>
            <div className="space-y-3">
              {summary.statusBreakdown.map((item, idx) => (
                <div key={idx} className="py-2 border-b border-border/30 last:border-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">{item.status}</span>
                    <span className="text-sm font-medium">{item.count} עסקאות</span>
                  </div>
                  {item.amount > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(item.amount)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}