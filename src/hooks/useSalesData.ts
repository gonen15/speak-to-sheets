import { useState, useEffect, useMemo } from 'react';
import { SalesData, ProductData, CustomerData, SalesFilters } from '@/types/sales';
import { usePricingData } from './usePricingData';
import { useRealSalesData } from './useRealSalesData';

// מבנה נתונים מפורט לפי מוצר ולקוח - מבוסס על מספרי לקוחות אמיתיים
const productCustomerData = {
  "פראנוי 150 גרם": {
    "100019 - מעיין נציגויות שיווק ממתקים בע\"מ": {
      monthly2025: [27000, 18054, 16272, 28587, 25524, 22436, 70768], // ביולי: 70,768
      total2025: 208641
    },
    "100006 - קפואים פלוס בע\"מ": {
      monthly2025: [22000, 12180, 14000, 20000, 21000, 18500, 35000],
      total2025: 142680
    },
    "100018 - יאנגו דלי ישראל בע\"מ": {
      monthly2025: [18000, 10000, 11500, 16000, 17500, 15000, 25000],
      total2025: 113000
    },
    "100003 - סוויט טיים קנדיס יבוא ושיווק בע\"מ": {
      monthly2025: [12000, 8500, 7800, 10500, 11000, 9500, 14551],
      total2025: 73851
    },
    "100036 - ארומה במדבר בע\"מ": {
      monthly2025: [4500, 3800, 3500, 4200, 4400, 4000, 5000],
      total2025: 29400
    }
  },
  "פראנוי 90 גרם": {
    "100006 - קפואים פלוס בע\"מ": {
      monthly2025: [0, 1026, 1404, 378, 1404, 15000, 8000],
      total2025: 27212
    },
    "100022 - חוות נעמי ניהול מעדניות בע\"מ": {
      monthly2025: [0, 0, 0, 0, 0, 7518, 3952],
      total2025: 11470
    }
  },
  "מוצ'י שישיות": {
    "100019 - מעיין נציגויות שיווק ממתקים בע\"מ": {
      monthly2025: [2000, 3000, 1500, 4000, 3000, 2000, 5000],
      total2025: 20500
    },
    "100018 - יאנגו דלי ישראל בע\"מ": {
      monthly2025: [1500, 2000, 1000, 2500, 2000, 1500, 3000],
      total2025: 13500
    },
    "100022 - חוות נעמי ניהול מעדניות בע\"מ": {
      monthly2025: [700, 1001, 754, 1444, 1117, 590, 1145],
      total2025: 6751
    },
    "100002 - אי סקרים בע\"מ": {
      monthly2025: [18, 0, 0, 0, 0, 500, 0],
      total2025: 518
    }
  },
  "באבל טי - כוסות": {
    "100019 - מעיין נציגויות שיווק ממתקים בע\"מ": {
      monthly2025: [1500, 2000, 1800, 1500, 2500, 8000, 800],
      total2025: 17100
    },
    "100003 - סוויט טיים קנדיס יבוא ושיווק בע\"מ": {
      monthly2025: [1000, 1500, 800, 800, 1500, 4000, 500],
      total2025: 10100
    },
    "100040 - צביקה ש.ב סוכנויות לשיווק בע״מ": {
      monthly2025: [1389, 1052, 760, 340, 1013, 4293, 359],
      total2025: 9206
    }
  },
  "באבל טי - פחיות": {
    "100006 - קפואים פלוס בע\"מ": {
      monthly2025: [393, 0, 24, -94, 1, 18204, 1296],
      total2025: 19824
    }
  },
  "באבל טי - ערכות": {
    "100040 - צביקה ש.ב סוכנויות לשיווק בע״מ": {
      monthly2025: [1626, 0, 48, 0, -234, -223, -102],
      total2025: 1115
    }
  }
};

export const useSalesData = () => {
  const { pricingData, loading: pricingLoading, calculateRevenue } = usePricingData();
  const { salesData: realSalesData, ordersData: realOrdersData, loading: realDataLoading, getReportUpdateDate } = useRealSalesData();
  
  const [rawProductData] = useState<ProductData[]>([
    {
      category: "פראנוי 150 גרם",
      monthly2024: [108384, 78888, 79998, 57570, 122460, 96288, 68016, 102348, 73284, 72108, 77568, 62220],
      monthly2025: [96624, 60180, 58272, 99587, 89524, 90436, 145319, 0, 0, 0, 0, 0], // ביולי: 145,319
      total2024: 999132,
      total2025: 639942,
      growthMonthly: 104.63,
      growthYearly: 116.31
    },
    {
      category: "פראנוי 90 גרם", 
      monthly2024: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9216],
      monthly2025: [0, 1026, 1404, 378, 1404, 22518, 11952, 0, 0, 0, 0, 0],
      total2024: 9216,
      total2025: 38682,
      growthMonthly: null,
      growthYearly: 762.19
    },
    {
      category: "מוצ'י שישיות",
      monthly2024: [24890, 31910, 34070, 26350, 40430, 22480, 18780, 22090, 25650, 5810, 15880, 5353],
      monthly2025: [4218, 6001, 3254, 7944, 7117, 3590, 9145, 0, 0, 0, 0, 0],
      total2024: 273693,
      total2025: 41269,
      growthMonthly: 20.75,
      growthYearly: 27.38
    },
    {
      category: "מוצ'י דאבלים",
      monthly2024: [0, 0, 0, 0, 0, 0, 9000, 25050, -1110, -9900, 15210, 8035],
      monthly2025: [0, -1210, 0, 100, 0, -8, 0, 0, 0, 0, 0, 0],
      total2024: 46285,
      total2025: -1118,
      growthMonthly: -12.42,
      growthYearly: -4.39
    },
    {
      category: "באבל טי - כוסות",
      monthly2024: [0, 0, 0, 0, 0, 4896, 2464, 18384, 32, 896, 536, 8668],
      monthly2025: [3889, 4552, 3360, 2640, 5013, 16293, 1659, -11, 0, 0, 0, 0],
      total2024: 35876,
      total2025: 37395,
      growthMonthly: 508.23,
      growthYearly: 189.28
    },
    {
      category: "באבל טי - פחיות",
      monthly2024: [0, 0, 0, 0, 0, 18240, 18144, 4800, 120, 2016, -1800, 690],
      monthly2025: [393, 0, 24, -94, 1, 18204, 1296, 0, 0, 0, 0, 0],
      total2024: 42210,
      total2025: 19824,
      growthMonthly: 54.49,
      growthYearly: 85.29
    },
    {
      category: "באבל טי - ערכות",
      monthly2024: [0, 0, 0, 0, 0, 7416, 2976, 1584, 504, 1416, -552, 1212],
      monthly2025: [1626, 0, 48, 0, -234, -223, -102, -91, 0, 0, 0, 0],
      total2024: 14556,
      total2025: 1024,
      growthMonthly: 10.73,
      growthYearly: 12.77
    }
  ]);

  // חישוב נתוני לקוחות מהנתונים המפורטים עם מחזור מכירות
  const calculateCustomerData = useMemo((): CustomerData[] => {
    const customers: { [key: string]: CustomerData } = {};
    
    Object.entries(productCustomerData).forEach(([product, customerBreakdown]) => {
      Object.entries(customerBreakdown).forEach(([customerName, data]) => {
        if (!customers[customerName]) {
          customers[customerName] = {
            customer: customerName,
            quantity: 0,
            revenue: 0, // Add revenue field
            products: 0,
            categories: [],
            monthlyData: Array.from({ length: 7 }, (_, i) => ({
              month: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי"][i],
              quantity: 0,
              revenue: 0 // Add revenue field
            }))
          };
        }
        
        const quantity = Math.max(0, data.total2025);
        const revenue = calculateRevenue(product, customerName, quantity);
        
        customers[customerName].quantity += quantity;
        customers[customerName].revenue += revenue;
        customers[customerName].products += 1;
        customers[customerName].categories.push(product);
        
        // חיבור נתונים חודשיים
        data.monthly2025.forEach((monthlyQty, index) => {
          if (customers[customerName].monthlyData[index]) {
            const qty = Math.max(0, monthlyQty);
            const rev = calculateRevenue(product, customerName, qty);
            customers[customerName].monthlyData[index].quantity += qty;
            customers[customerName].monthlyData[index].revenue += rev;
          }
        });
      });
    });
    
    return Object.values(customers).sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }, [pricingData, calculateRevenue]);

  const rawCustomerData = calculateCustomerData;

  const getFilteredSalesData = (filters: SalesFilters): SalesData => {
    // Calculate filtered data based on product and customer filters - with revenue
    const calculateFilteredData = (productName: string, monthIndex?: number) => {
      const productData = productCustomerData[productName];
      if (!productData) return { quantity: 0, revenue: 0 };
      
      let totalQuantity = 0;
      let totalRevenue = 0;
      
      Object.entries(productData).forEach(([customerName, data]: [string, any]) => {
        // Apply customer filter
        if (filters.customers.length > 0 && !filters.customers.includes(customerName)) {
          return;
        }
        
        if (monthIndex !== undefined) {
          // Get monthly data
          const monthlyValue = Math.max(0, data.monthly2025[monthIndex] || 0);
          totalQuantity += monthlyValue;
          totalRevenue += calculateRevenue(productName, customerName, monthlyValue);
        } else {
          // Get total data
          const quantity = Math.max(0, data.total2025);
          totalQuantity += quantity;
          totalRevenue += calculateRevenue(productName, customerName, quantity);
        }
      });
      
      return { quantity: totalQuantity, revenue: totalRevenue };
    };

    // Filter products based on filters
    const filteredProducts = rawProductData.filter(product => {
      if (filters.products.length > 0 && !filters.products.includes(product.category)) {
        return false;
      }
      return product.total2025 > 0; // Only positive sales
    });

    // Calculate totals with customer filters applied
    const totals = filteredProducts.reduce((acc, product) => {
      const data = calculateFilteredData(product.category);
      acc.quantity += data.quantity;
      acc.revenue += data.revenue;
      return acc;
    }, { quantity: 0, revenue: 0 });
    
    // Generate monthly data with both product and customer filters
    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי"];
    const salesByMonth = monthNames.map((monthName, idx) => {
      const monthData = filteredProducts.reduce((acc, product) => {
        const data = calculateFilteredData(product.category, idx);
        acc.quantity += data.quantity;
        acc.revenue += data.revenue;
        return acc;
      }, { quantity: 0, revenue: 0 });
      
      const activeProducts = filteredProducts.filter(product => 
        calculateFilteredData(product.category, idx).quantity > 0
      ).length;
      
      return {
        month: monthName,
        quantity: monthData.quantity,
        revenue: monthData.revenue,
        products: activeProducts
      };
    });

    // Generate category data with revenue
    const salesByCategory = filteredProducts
      .map(product => {
        const data = calculateFilteredData(product.category);
        return {
          category: product.category,
          quantity: data.quantity,
          revenue: data.revenue,
          percentage: totals.revenue > 0 ? (data.revenue / totals.revenue) * 100 : 0
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Generate top products with revenue
    const topProducts = salesByCategory.slice(0, 5).map(cat => ({
      product: cat.category,
      quantity: cat.quantity,
      revenue: cat.revenue,
      categories: 1
    }));

    // Generate status breakdown
    const pranoyTotal = filteredProducts
      .filter(p => p.category.includes('פראנוי'))
      .reduce((sum, p) => sum + Math.max(0, p.total2025), 0);
      
    const mochiTotal = filteredProducts
      .filter(p => p.category.includes('מוצ'))
      .reduce((sum, p) => sum + Math.max(0, p.total2025), 0);
      
    const bubbleTeaTotal = filteredProducts
      .filter(p => p.category.includes('באבל'))
      .reduce((sum, p) => sum + Math.max(0, p.total2025), 0);

    const salesByStatus = [
      { 
        status: "פראנוי (150g + 90g)", 
        quantity: pranoyTotal,
        products: filteredProducts.filter(p => p.category.includes('פראנוי')).length,
        color: "#8884d8" 
      },
      { 
        status: "מוצ'י", 
        quantity: mochiTotal,
        products: filteredProducts.filter(p => p.category.includes('מוצ')).length,
        color: "#82ca9d" 
      },
      { 
        status: "באבל טי", 
        quantity: bubbleTeaTotal,
        products: filteredProducts.filter(p => p.category.includes('באבל')).length,
        color: "#ffc658" 
      }
    ].filter(status => status.quantity > 0);

    // Filter customers based on filters
    const filteredCustomers = rawCustomerData
      .filter(customer => {
        if (filters.customers.length > 0 && !filters.customers.includes(customer.customer)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.quantity - a.quantity);

    return {
      totalQuantity: totals.quantity,
      totalRevenue: totals.revenue, // Add total revenue
      totalProducts: salesByCategory.length,
      uniqueCustomers: filteredCustomers.length,
      avgQuantityPerProduct: totals.quantity / Math.max(salesByCategory.length, 1),
      avgRevenuePerProduct: totals.revenue / Math.max(salesByCategory.length, 1), // Add avg revenue
      totalCategories: salesByCategory.length,
      salesByMonth,
      salesByStatus,
      salesByCategory,
      topCustomers: filteredCustomers.slice(0, 8),
      topProducts
    };
  };

  const getProductDetails = (productName: string): ProductData | null => {
    return rawProductData.find(product => product.category === productName) || null;
  };

  const getCustomerDetails = (customerName: string): CustomerData | null => {
    return rawCustomerData.find(customer => customer.customer === customerName) || null;
  };

  const getProductCustomerBreakdown = (productName: string) => {
    return productCustomerData[productName] || {};
  };

  const getAvailableFilters = () => {
    return {
      products: rawProductData.filter(p => p.total2025 > 0).map(p => p.category),
      customers: rawCustomerData.map(c => c.customer),
      categories: ['פראנוי', 'מוצ\'י', 'באבל טי']
    };
  };

  return {
    rawProductData,
    rawCustomerData,
    getFilteredSalesData,
    getProductDetails,
    getCustomerDetails,
    getProductCustomerBreakdown,
    getAvailableFilters,
    pricingLoading: pricingLoading || realDataLoading,
    calculateRevenue,
    getReportUpdateDate,
    realSalesData,
    realOrdersData
  };
};