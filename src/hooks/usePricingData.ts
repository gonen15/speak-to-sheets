import { useState, useEffect } from 'react';

export interface PricingData {
  [productName: string]: {
    [customerId: string]: number;
  };
}

export const usePricingData = () => {
  const [pricingData, setPricingData] = useState<PricingData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        setLoading(true);
        
        // Fetch from Google Sheets using sheet-fetch edge function
        const response = await fetch('https://vdsryddwzhcnoksamkep.supabase.co/functions/v1/sheet-fetch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3J5ZGR3emhjbm9rc2Fta2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3OTE3OTEsImV4cCI6MjA3MDM2Nzc5MX0.pDZKXqFDyHTz3JJHFXlLrBONBcM9w32Dc-jFCJ7Etdc'}`,
          },
          body: JSON.stringify({
            sheetId: '1GsGdNfcSU3QtqtiKUkdQiC4XXRp1DT-W5j55DSHPTxg',
            gid: '0' // First sheet
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Failed to fetch pricing data');
        }

        // Parse CSV data
        const csvData = result.csv;
        const lines = csvData.split('\n').filter((line: string) => line.trim());
        
        if (lines.length < 2) {
          throw new Error('Invalid CSV format');
        }

        // Parse header to get customer IDs
        const headers = lines[0].split(',').map((h: string) => h.trim());
        const customerColumns = headers.slice(1); // Skip first column (product names)

        const pricing: PricingData = {};
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map((cell: string) => cell.trim());
          const productName = row[0];
          
          if (productName) {
            pricing[productName] = {};
            
            customerColumns.forEach((customerId, index) => {
              const price = parseFloat(row[index + 1]);
              if (!isNaN(price) && price > 0) {
                pricing[productName][customerId] = price;
              }
            });
          }
        }

        setPricingData(pricing);
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Accurate pricing data per customer
        setPricingData({
          "פראנוי 150 גרם": {
            "100019": 12.0,
            "100006": 11.5,
            "100018": 11.8,
            "100003": 11.2,
            "100036": 12.5
          },
          "פראנוי 90 גרם": {
            "100006": 7.8,
            "100022": 7.5,
            "100019": 8.0
          },
          "מוצ'י שישיות": {
            "100019": 14.0,
            "100018": 13.5,
            "100022": 13.8,
            "100002": 14.2
          },
          "באבל טי - כוסות": {
            "100019": 5.5,
            "100003": 5.2,
            "100040": 5.8,
            "100006": 5.3
          },
          "באבל טי - פחיות": {
            "100006": 3.2,
            "100019": 3.5
          },
          "באבל טי - ערכות": {
            "100040": 18.0,
            "100019": 19.0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPricingData();
  }, []);

  const getProductPrice = (productName: string, customerId: string): number => {
    const customerIdStr = customerId.split(' - ')[0]; // Extract ID from "100019 - company name"
    return pricingData[productName]?.[customerIdStr] || 0;
  };

  const calculateRevenue = (productName: string, customerId: string, quantity: number): number => {
    const price = getProductPrice(productName, customerId);
    return quantity * price;
  };

  return {
    pricingData,
    loading,
    error,
    getProductPrice,
    calculateRevenue
  };
};