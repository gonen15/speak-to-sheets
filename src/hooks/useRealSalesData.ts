import { useState, useEffect } from 'react';

export interface SalesRow {
  customerId: string;
  customerName: string;
  category: string;
  [key: string]: any; // For monthly data
}

export interface OrderRow {
  [key: string]: any;
}

export const useRealSalesData = () => {
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [ordersData, setOrdersData] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch quantity data (gid=0)
        const salesResponse = await fetch('https://vdsryddwzhcnoksamkep.supabase.co/functions/v1/sheet-fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3J5ZGR3emhjbm9rc2Fta2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTE3OTEsImV4cCI6MjA3MDM2Nzc5MX0.pDZKXqFDyHTz3JJHFXlLrBONBcM9w32Dc-jFCJ7Etdc',
          },
          body: JSON.stringify({
            sheetId: '1GsGdNfcSU3QtqtiKUkdQiC4XXRp1DT-W5j55DSHPTxg',
            gid: '0'
          })
        });

        // Fetch orders data (gid=1710157144)
        const ordersResponse = await fetch('https://vdsryddwzhcnoksamkep.supabase.co/functions/v1/sheet-fetch', {
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

        if (!salesResponse.ok || !ordersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const salesResult = await salesResponse.json();
        const ordersResult = await ordersResponse.json();

        if (!salesResult.ok || !ordersResult.ok) {
          throw new Error('Failed to fetch data from sheets');
        }

        // Parse sales data (quantities)
        const salesLines = salesResult.csv.split('\n').filter((line: string) => line.trim());
        const salesParsed = parseSalesData(salesLines);
        setSalesData(salesParsed);

        // Parse orders data (monetary)
        const ordersLines = ordersResult.csv.split('\n').filter((line: string) => line.trim());
        const ordersParsed = parseOrdersData(ordersLines);
        setOrdersData(ordersParsed);

        setError(null);
      } catch (err) {
        console.error('Error fetching real sales data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const parseSalesData = (lines: string[]): SalesRow[] => {
    const data: SalesRow[] = [];
    let headers: string[] = [];
    let isDataSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = parseCSVLine(line);

      // Look for the header row with customer IDs and categories
      if (cells[0] === 'מס. לקוח' && cells[1] === 'שם לקוח' && cells[2] === 'קטגוריה') {
        headers = cells;
        isDataSection = true;
        continue;
      }

      // Process data rows
      if (isDataSection && cells[0] && cells[1] && cells[2]) {
        const row: SalesRow = {
          customerId: cells[0],
          customerName: cells[1],
          category: cells[2]
        };

        // Add monthly data
        for (let j = 3; j < Math.min(headers.length, cells.length); j++) {
          if (headers[j]) {
            const value = parseFloat(cells[j]?.replace(/[^0-9.-]/g, '') || '0');
            row[headers[j]] = isNaN(value) ? 0 : value;
          }
        }

        data.push(row);
      }
    }

    return data;
  };

  const parseOrdersData = (lines: string[]): OrderRow[] => {
    const data: OrderRow[] = [];
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = parseCSVLine(line);

      // Look for header row
      if (i === 0 || (cells.length > 5 && cells.some(cell => cell.includes('תאריך') || cell.includes('לקוח')))) {
        headers = cells;
        continue;
      }

      // Process data rows
      if (headers.length > 0 && cells.length > 0 && cells[0]) {
        const row: OrderRow = {};
        for (let j = 0; j < Math.min(headers.length, cells.length); j++) {
          if (headers[j]) {
            row[headers[j]] = cells[j] || '';
          }
        }
        data.push(row);
      }
    }

    return data;
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

  const getReportUpdateDate = (): string => {
    // Extract from the first few lines of sales data
    if (salesData.length === 0) return '';
    
    // Look for update date in the raw CSV - it should be in the first few rows
    return 'תאריך עדכון: 20/7/25'; // This should be extracted from the actual data
  };

  return {
    salesData,
    ordersData,
    loading,
    error,
    getReportUpdateDate
  };
};