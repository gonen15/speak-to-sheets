import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SalesFilters, ViewType } from '@/types/sales';
import { X, Filter, Calendar, Package, Users, BarChart3 } from 'lucide-react';

interface SalesFiltersProps {
  filters: SalesFilters;
  onFiltersChange: (filters: SalesFilters) => void;
  availableFilters: {
    products: string[];
    customers: string[];
    categories: string[];
  };
}

export default function SalesFiltersComponent({ filters, onFiltersChange, availableFilters }: SalesFiltersProps) {
  const updateFilters = (updates: Partial<SalesFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleProduct = (product: string) => {
    const newProducts = filters.products.includes(product)
      ? filters.products.filter(p => p !== product)
      : [...filters.products, product];
    updateFilters({ products: newProducts });
  };

  const toggleCustomer = (customer: string) => {
    const newCustomers = filters.customers.includes(customer)
      ? filters.customers.filter(c => c !== customer)
      : [...filters.customers, customer];
    updateFilters({ customers: newCustomers });
  };

  const clearAllFilters = () => {
    updateFilters({
      products: [],
      customers: [],
      categories: [],
      view: 'overview',
      drilldownPath: []
    });
  };

  const viewOptions: Array<{ value: ViewType; label: string; icon: React.ReactNode }> = [
    { value: 'overview', label: 'תצוגה כללית', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'product', label: 'לפי מוצרים', icon: <Package className="w-4 h-4" /> },
    { value: 'customer', label: 'לפי לקוחות', icon: <Users className="w-4 h-4" /> },
    { value: 'monthly', label: 'לפי חודשים', icon: <Calendar className="w-4 h-4" /> }
  ];

  const hasActiveFilters = filters.products.length > 0 || filters.customers.length > 0 || filters.categories.length > 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle className="text-lg">מסננים ותצוגות</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4 ml-2" />
              נקה הכל
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* View Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">תצוגה:</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {viewOptions.map((option) => (
              <Button
                key={option.value}
                variant={filters.view === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters({ view: option.value, drilldownPath: [] })}
                className="justify-start gap-2"
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {filters.drilldownPath.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">נתיב ניווט:</label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFilters({ drilldownPath: [] })}
              >
                🏠 ראשי
              </Button>
              {filters.drilldownPath.map((step, index) => (
                <React.Fragment key={index}>
                  <span className="text-muted-foreground">›</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilters({ 
                      drilldownPath: filters.drilldownPath.slice(0, index + 1) 
                    })}
                  >
                    {step.label}
                  </Button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Product Filters */}
        <div className="space-y-3">
          <label className="text-sm font-medium">מוצרים:</label>
          <div className="flex flex-wrap gap-2">
            {availableFilters.products.map((product) => (
              <Badge
                key={product}
                variant={filters.products.includes(product) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleProduct(product)}
              >
                {product}
                {filters.products.includes(product) && (
                  <X className="w-3 h-3 mr-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Customer Filters */}
        <div className="space-y-3">
          <label className="text-sm font-medium">לקוחות:</label>
          <div className="flex flex-wrap gap-2">
            {availableFilters.customers.slice(0, 6).map((customer) => (
              <Badge
                key={customer}
                variant={filters.customers.includes(customer) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => toggleCustomer(customer)}
              >
                {customer.length > 20 ? customer.substring(0, 20) + '...' : customer}
                {filters.customers.includes(customer) && (
                  <X className="w-3 h-3 mr-1" />
                )}
              </Badge>
            ))}
            {availableFilters.customers.length > 6 && (
              <Badge variant="outline" className="cursor-pointer">
                +{availableFilters.customers.length - 6} נוספים
              </Badge>
            )}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-3 border-t">
            <div className="text-sm text-muted-foreground">
              מסננים פעילים: {filters.products.length} מוצרים, {filters.customers.length} לקוחות
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}