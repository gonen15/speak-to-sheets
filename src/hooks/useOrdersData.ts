import { useState, useEffect } from 'react';

export interface OrderData {
  date: string; // B - תאריך
  customerName: string; // E - שם לקוח
  productCode: string; // G - מק"ט
  unitPrice: number; // J - מחיר בתעודה ש"ח
  quantity: number; // K - מחיר בתעודה כמות
  totalILS: number; // L - סה"כ ב־ש"ח
  totalAfterDiscount: number; // O - סה"כ אחרי הנחה
  month: string; // P - חודש
  year: string; // Q - שנה
  category: string; // R - קטגוריה
}

export interface SummaryData {
  totalRevenue: number;
  totalQuantity: number;
  totalOrders: number;
  uniqueCustomers: number;
  byProduct: Record<string, { quantity: number; revenue: number; orders: number }>;
  byCustomer: Record<string, { quantity: number; revenue: number; orders: number; products: string[] }>;
  byMonth: Array<{ month: string; quantity: number; revenue: number; orders: number }>;
}

export const useOrdersData = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrdersData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('https://vdsryddwzhcnoksamkep.supabase.co/functions/v1/sheet-fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3J5ZGR3emhjbm9rc2Fta2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTE3OTEsImV4cCI6MjA3MDM2Nzc5MX0.pDZKXqFDyHTz3JJHFXlLrBONBcM9w32Dc-jFCJ7Etdc',
          },
          body: JSON.stringify({
            sheetId: '1GsGdNfcSU3QtqtiKUkdQiC4XXRp1DT-W5j55DSHPTxg',
            gid: '1710157144'
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Failed to fetch orders data');
        }

        const parsedOrders = parseOrdersCSV(result.csv);
        setOrders(parsedOrders);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersData();
  }, []);

  const parseOrdersCSV = (csv: string): OrderData[] => {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const orders: OrderData[] = [];
    
    // Skip header row and start from row 2
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      if (cells.length < 18) continue; // Make sure we have all columns up to R

      try {
        const order: OrderData = {
          date: cells[1] || '', // B - תאריך
          customerName: cells[4] || '', // E - שם לקוח
          productCode: cells[6] || '', // G - מק"ט
          unitPrice: parseFloat(cells[9]?.replace(/[^0-9.-]/g, '') || '0') || 0, // J - מחיר בתעודה ש"ח
          quantity: parseFloat(cells[10]?.replace(/[^0-9.-]/g, '') || '0') || 0, // K - כמות
          totalILS: parseFloat(cells[11]?.replace(/[^0-9.-]/g, '') || '0') || 0, // L - סה"כ ב־ש"ח
          totalAfterDiscount: parseFloat(cells[14]?.replace(/[^0-9.-]/g, '') || '0') || 0, // O - סה"כ אחרי הנחה
          month: cells[15] || '', // P - חודש
          year: cells[16] || '', // Q - שנה
          category: cells[17] || '' // R - קטגוריה
        };

        if (order.customerName && order.productCode) {
          orders.push(order);
        }
      } catch (error) {
        console.warn('Error parsing row:', cells, error);
      }
    }

    return orders;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const extractCustomerName = (customerCell: string): string => {
    // Extract customer name from formats like "100019 - Customer Name"
    if (customerCell.includes(' - ')) {
      return customerCell.split(' - ')[1] || customerCell;
    }
    return customerCell;
  };

  const getSummaryData = (): SummaryData => {
    const summary: SummaryData = {
      totalRevenue: 0,
      totalQuantity: 0,
      totalOrders: orders.length,
      uniqueCustomers: 0,
      byProduct: {},
      byCustomer: {},
      byMonth: []
    };

    const customerSet = new Set<string>();
    const monthlyData: Record<string, { quantity: number; revenue: number; orders: number }> = {};

    orders.forEach(order => {
      // Total calculations
      summary.totalRevenue += order.totalAfterDiscount; // Use total after discount
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

      // By month - use existing month field
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

  const extractMonthFromDate = (dateStr: string): string | null => {
    // Try to extract month from various date formats
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 2) {
        const month = parseInt(parts[1]) || parseInt(parts[0]);
        const year = parseInt(parts[2]) || 2025;
        return `${year}-${month.toString().padStart(2, '0')}`;
      }
    }
    return null;
  };

  return {
    orders,
    loading,
    error,
    getSummaryData
  };
};