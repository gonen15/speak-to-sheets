export interface SalesData {
  totalQuantity: number;
  totalRevenue?: number; // Add optional revenue field
  totalProducts: number;
  uniqueCustomers: number;
  avgQuantityPerProduct: number;
  avgRevenuePerProduct?: number; // Add optional avg revenue field
  totalCategories: number;
  salesByMonth: Array<{ month: string; quantity: number; revenue?: number; products: number }>;
  salesByStatus: Array<{ status: string; quantity: number; products: number; color: string }>;
  salesByCategory: Array<{ category: string; quantity: number; revenue?: number; percentage: number }>;
  topCustomers: Array<{ customer: string; quantity: number; revenue?: number; products: number }>;
  topProducts: Array<{ product: string; quantity: number; revenue?: number; categories: number }>;
}

export interface ProductData {
  category: string;
  monthly2024: number[];
  monthly2025: number[];
  total2024: number;
  total2025: number;
  growthMonthly: number | null;
  growthYearly: number;
}

export interface CustomerData {
  customer: string;
  quantity: number;
  revenue?: number; // Add optional revenue field
  products: number;
  categories: string[];
  monthlyData: Array<{ month: string; quantity: number; revenue?: number }>;
}

export interface DrilldownData {
  title: string;
  data: any[];
  chartType: 'bar' | 'pie' | 'line' | 'table';
  metrics: Array<{ key: string; label: string; format: 'number' | 'currency' | 'percentage' }>;
}

export interface SalesFilters {
  dateRange: { from: string; to: string };
  products: string[];
  customers: string[];
  categories: string[];
  view: ViewType;
  drilldownPath: Array<{ type: string; value: string; label: string }>;
}

export type ViewType = 'overview' | 'product' | 'customer' | 'monthly' | 'drilldown';