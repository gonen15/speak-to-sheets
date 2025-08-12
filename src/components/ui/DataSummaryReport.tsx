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
      
      // Try to find revenue/amount fields (Hebrew and English)
      const sampleRow = data[0];
      const amountFields = Object.keys(sampleRow).filter(key => 
        /amount|revenue|value|price|sum|total|עלות|מחיר|סכום|הכנסות/i.test(key)
      );
      
      // Try to find client/customer fields (Hebrew and English)
      const clientFields = Object.keys(sampleRow).filter(key => 
        /client|customer|company|account|name|לקוח|חברה|שם/i.test(key)
      );
      
      // Try to find quantity fields
      const quantityFields = Object.keys(sampleRow).filter(key => 
        /quantity|amount|qty|count|כמות|מספר/i.test(key) && 
        key !== amountFields[0] // Don't use the same field for amount and quantity
      );

      console.log("Available fields:", Object.keys(sampleRow));
      console.log("Amount fields found:", amountFields);
      console.log("Client fields found:", clientFields);
      console.log("Quantity fields found:", quantityFields);

      let totalRevenue = 0;
      let totalQuantity = 0;
      let uniqueClients = new Set();
      let clientAmounts: Record<string, number> = {};
      let statusCounts: Record<string, { count: number; amount: number }> = {};
      
      const amountField = amountFields[0];
      const clientField = clientFields[0];
      const quantityField = quantityFields[0];

      console.log("Using fields:", { amountField, clientField, quantityField });

      // Calculate metrics
      data.forEach((row, index) => {
        // Skip header rows or empty rows
        if (index === 0 || !row || Object.values(row).every(val => !val || val === '')) {
          return;
        }

        // Handle amount/revenue
        if (amountField && row[amountField]) {
          const amountStr = String(row[amountField]).replace(/[₪,״""]/g, '').trim();
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > 0) {
            totalRevenue += amount;
            
            if (clientField && row[clientField]) {
              const client = String(row[clientField]).replace(/[""]/g, '').trim();
              if (client && client !== '') {
                uniqueClients.add(client);
                clientAmounts[client] = (clientAmounts[client] || 0) + amount;
              }
            }
          }
        }

        // Handle quantity
        if (quantityField && row[quantityField]) {
          const quantityStr = String(row[quantityField]).replace(/[,״""]/g, '').trim();
          const quantity = parseFloat(quantityStr);
          if (!isNaN(quantity) && quantity > 0) {
            totalQuantity += quantity;
          }
        }

        // Handle clients even without amounts
        if (clientField && row[clientField]) {
          const client = String(row[clientField]).replace(/[""]/g, '').trim();
          if (client && client !== '' && !client.includes('סיכום')) {
            uniqueClients.add(client);
          }
        }
      });

      console.log("Calculated metrics:", { totalRevenue, totalQuantity, uniqueClientsCount: uniqueClients.size });

      const avgDealSize = totalRevenue / Math.max(uniqueClients.size, 1);
      
      // Calculate win rate based on data patterns
      const winRate = 0; // We'll calculate this differently since there's no clear status field

      // Top clients
      const topClients = Object.entries(clientAmounts)
        .filter(([name]) => name && !name.includes('סיכום'))
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      // Status breakdown - we'll create a simple one based on data presence
      const statusBreakdown = [
        { status: "רשומות עם נתונים", count: Object.keys(clientAmounts).length, amount: totalRevenue },
        { status: "סך הכל רשומות", count: data.length - 1, amount: totalRevenue } // -1 for header
      ];

      console.log("Final summary:", {
        totalRows: totalRows - 1, // Subtract header row
        totalRevenue,
        uniqueClients: uniqueClients.size,
        avgDealSize,
        topClients,
        statusBreakdown
      });

      setSummary({
        totalRows: totalRows - 1, // Subtract header row
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
      <div className="julius-card p-6 border-l-4 border-l-destructive mb-6">
        <h2 className="text-xl font-semibold mb-4">סיכום נתונים מהדוח שהועלה</h2>
        <div className="text-destructive mb-4">{error}</div>
        <button 
          onClick={loadSummary}
          className="julius-btn"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="julius-card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">סיכום נתונים מהדוח שהועלה</h2>
        <div className="text-muted-foreground">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">סיכום נתונים מהדוח שהועלה</h2>
        <button 
          onClick={loadSummary}
          className="julius-btn text-sm"
          disabled={loading}
        >
          {loading ? "טוען..." : "רענן נתונים"}
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