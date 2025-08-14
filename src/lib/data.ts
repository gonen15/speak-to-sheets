// Mock data functions for now - these views don't exist in the database yet

export async function getKpis() {
  return {
    total_quantity: 15420,
    total_revenue: 185040,
    total_products: 6,
    unique_customers: 8
  };
}

export async function getByStatus() {
  return [
    { status: 'סגור', quantity: 8500, products: 4, color: '#22c55e' },
    { status: 'פתוח', quantity: 4200, products: 3, color: '#3b82f6' },
    { status: 'בהמתנה', quantity: 2720, products: 2, color: '#f59e0b' }
  ];
}

export async function getByMonth() {
  return [
    { year: 2025, month: 1, quantity: 3800, revenue: 45600, products: 5 },
    { year: 2025, month: 2, quantity: 4100, revenue: 49200, products: 6 },
    { year: 2025, month: 3, quantity: 3900, revenue: 46800, products: 5 },
    { year: 2025, month: 4, quantity: 3620, revenue: 43440, products: 4 }
  ];
}

export async function getTopCustomers(limit = 20) {
  return [
    { customer: '100019 - לקוח ראשון', quantity: 3200, revenue: 38400, products: 4 },
    { customer: '100006 - לקוח שני', quantity: 2800, revenue: 33600, products: 3 },
    { customer: '100018 - לקוח שלישי', quantity: 2400, revenue: 28800, products: 3 }
  ];
}
