import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SalesTransaction {
  id: string;
  date: string;
  amount: number;
  quantity: number;
  product: string;
  brand: string;
  customer: string;
  status: string;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { level, year, month, week, day } = await req.json();
    
    // Mock sales data based on the structure described
    // In a real implementation, this would read from Google Sheets API
    const salesData: SalesTransaction[] = generateMockSalesData();
    
    let filteredData = salesData;
    
    // Apply filters based on drill-down level
    if (year) {
      filteredData = filteredData.filter(item => new Date(item.date).getFullYear().toString() === year);
    }
    
    if (month) {
      filteredData = filteredData.filter(item => {
        const itemMonth = (new Date(item.date).getMonth() + 1).toString().padStart(2, '0');
        return itemMonth === month;
      });
    }
    
    if (week) {
      filteredData = filteredData.filter(item => {
        const itemWeek = getWeekOfYear(new Date(item.date));
        return itemWeek === week;
      });
    }
    
    if (day) {
      filteredData = filteredData.filter(item => {
        const itemDay = new Date(item.date).toISOString().split('T')[0];
        return itemDay === day;
      });
    }
    
    // Group data based on requested level
    let result: any[] = [];
    
    switch (level) {
      case 'year':
        result = groupByYear(filteredData);
        break;
      case 'month':
        result = groupByMonth(filteredData);
        break;
      case 'week':
        result = groupByWeek(filteredData);
        break;
      case 'day':
        result = groupByDay(filteredData);
        break;
      case 'transaction':
        result = filteredData.map(item => ({
          ...item,
          label: `עסקה ${item.id}`,
          key: item.id
        }));
        break;
      default:
        result = groupByMonth(filteredData);
    }
    
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in sales-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateMockSalesData(): SalesTransaction[] {
  const data: SalesTransaction[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2025-12-31');
  
  const products = ['מוצר A', 'מוצר B', 'מוצר C', 'מוצר D'];
  const brands = ['מותג 1', 'מותג 2', 'מותג 3'];
  const customers = ['לקוח א', 'לקוח ב', 'לקוח ג', 'לקוח ד'];
  const statuses = ['הושלם', 'בטיפול', 'ממתין'];
  
  let id = 1;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Random number of transactions per day (0-5)
    const transactionsPerDay = Math.floor(Math.random() * 6);
    
    for (let i = 0; i < transactionsPerDay; i++) {
      data.push({
        id: id.toString(),
        date: d.toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 10000) + 100,
        quantity: Math.floor(Math.random() * 50) + 1,
        product: products[Math.floor(Math.random() * products.length)],
        brand: brands[Math.floor(Math.random() * brands.length)],
        customer: customers[Math.floor(Math.random() * customers.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        description: `תיאור עסקה ${id}`
      });
      id++;
    }
  }
  
  return data;
}

function getWeekOfYear(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7).toString();
}

function groupByYear(data: SalesTransaction[]) {
  const groups: { [key: string]: { sales: number, quantity: number, orders: number } } = {};
  
  data.forEach(item => {
    const year = new Date(item.date).getFullYear().toString();
    if (!groups[year]) {
      groups[year] = { sales: 0, quantity: 0, orders: 0 };
    }
    groups[year].sales += item.amount;
    groups[year].quantity += item.quantity;
    groups[year].orders += 1;
  });
  
  return Object.entries(groups).map(([year, data]) => ({
    label: year,
    key: year,
    ...data
  })).sort((a, b) => a.key.localeCompare(b.key));
}

function groupByMonth(data: SalesTransaction[]) {
  const groups: { [key: string]: { sales: number, quantity: number, orders: number } } = {};
  
  data.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!groups[monthKey]) {
      groups[monthKey] = { sales: 0, quantity: 0, orders: 0 };
    }
    groups[monthKey].sales += item.amount;
    groups[monthKey].quantity += item.quantity;
    groups[monthKey].orders += 1;
  });
  
  return Object.entries(groups).map(([monthKey, data]) => ({
    label: new Date(monthKey + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
    key: monthKey.split('-')[1],
    monthKey,
    ...data
  })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

function groupByWeek(data: SalesTransaction[]) {
  const groups: { [key: string]: { sales: number, quantity: number, orders: number } } = {};
  
  data.forEach(item => {
    const weekKey = getWeekOfYear(new Date(item.date));
    
    if (!groups[weekKey]) {
      groups[weekKey] = { sales: 0, quantity: 0, orders: 0 };
    }
    groups[weekKey].sales += item.amount;
    groups[weekKey].quantity += item.quantity;
    groups[weekKey].orders += 1;
  });
  
  return Object.entries(groups).map(([week, data]) => ({
    label: `שבוע ${week}`,
    key: week,
    ...data
  })).sort((a, b) => parseInt(a.key) - parseInt(b.key));
}

function groupByDay(data: SalesTransaction[]) {
  const groups: { [key: string]: { sales: number, quantity: number, orders: number } } = {};
  
  data.forEach(item => {
    const dayKey = item.date;
    
    if (!groups[dayKey]) {
      groups[dayKey] = { sales: 0, quantity: 0, orders: 0 };
    }
    groups[dayKey].sales += item.amount;
    groups[dayKey].quantity += item.quantity;
    groups[dayKey].orders += 1;
  });
  
  return Object.entries(groups).map(([day, data]) => ({
    label: new Date(day).toLocaleDateString('he-IL'),
    key: day,
    ...data
  })).sort((a, b) => a.key.localeCompare(b.key));
}