import { useState, useEffect, useMemo } from 'react';
import { SalesData, ProductData, CustomerData, SalesFilters } from '@/types/sales';

export const useSalesData = () => {
  const [rawProductData] = useState<ProductData[]>([
    {
      category: "פראנוי 150 גרם",
      monthly2024: [108384, 78888, 79998, 57570, 122460, 96288, 68016, 102348, 73284, 72108, 77568, 62220],
      monthly2025: [96624, 60180, 58272, 99587, 89524, 90436, 145319, 0, 0, 0, 0, 0],
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

  const [rawCustomerData] = useState<CustomerData[]>([
    {
      customer: "מעיין נציגויות שיווק ממתקים בעמ",
      quantity: 189824,
      products: 5,
      categories: ["פראנוי 150 גרם", "מוצ'י שישיות", "באבל טי - כוסות"],
      monthlyData: []
    },
    {
      customer: "קפואים פלוס בעמ", 
      quantity: 149432,
      products: 4,
      categories: ["פראנוי 150 גרם", "פראנוי 90 גרם", "באבל טי - פחיות"],
      monthlyData: []
    },
    {
      customer: "יאנגו דלי ישראל בעמ",
      quantity: 122156,
      products: 3,
      categories: ["פראנוי 150 גרם", "מוצ'י שישיות"],
      monthlyData: []
    },
    {
      customer: "רמי לוי שיווק השקמה", 
      quantity: 81467,
      products: 4,
      categories: ["פראנוי 150 גרם", "באבל טי - כוסות", "באבל טי - פחיות"],
      monthlyData: []
    },
    {
      customer: "נתוני בר מזון",
      quantity: 54312,
      products: 2,
      categories: ["פראנוי 90 גרם", "מוצ'י שישיות"],
      monthlyData: []
    },
    {
      customer: "ויקטורי",
      quantity: 43189,
      products: 3,
      categories: ["באבל טי - כוסות", "באבל טי - ערכות"],
      monthlyData: []
    },
    {
      customer: "מחסני מזון",
      quantity: 29876,
      products: 2,
      categories: ["פראנוי 150 גרם"],
      monthlyData: []
    },
    {
      customer: "מגה בעמ",
      quantity: 13567,
      products: 1,
      categories: ["מוצ'י שישיות"],
      monthlyData: []
    }
  ]);

  const getFilteredSalesData = (filters: SalesFilters): SalesData => {
    // Filter products based on filters
    const filteredProducts = rawProductData.filter(product => {
      if (filters.products.length > 0 && !filters.products.includes(product.category)) {
        return false;
      }
      return product.total2025 > 0; // Only positive sales
    });

    // Calculate totals
    const totalQuantity2025 = filteredProducts.reduce((sum, product) => sum + Math.max(0, product.total2025), 0);
    
    // Generate monthly data
    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי"];
    const salesByMonth = monthNames.map((monthName, idx) => {
      const monthTotal = filteredProducts.reduce((sum, product) => {
        const monthlyValue = product.monthly2025[idx] || 0;
        return sum + Math.max(0, monthlyValue);
      }, 0);
      
      const activeProducts = filteredProducts.filter(product => 
        (product.monthly2025[idx] || 0) > 0
      ).length;
      
      return {
        month: monthName,
        quantity: monthTotal,
        products: activeProducts
      };
    });

    // Generate category data
    const salesByCategory = filteredProducts
      .sort((a, b) => b.total2025 - a.total2025)
      .map(product => ({
        category: product.category,
        quantity: product.total2025,
        percentage: totalQuantity2025 > 0 ? (product.total2025 / totalQuantity2025) * 100 : 0
      }));

    // Generate top products
    const topProducts = salesByCategory.slice(0, 5).map(cat => ({
      product: cat.category,
      quantity: cat.quantity,
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
      totalQuantity: totalQuantity2025,
      totalProducts: salesByCategory.length,
      uniqueCustomers: filteredCustomers.length,
      avgQuantityPerProduct: totalQuantity2025 / Math.max(salesByCategory.length, 1),
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
    getAvailableFilters
  };
};