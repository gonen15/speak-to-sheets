import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateRangePicker from '@/components/ui/date-range-picker';
import GlobalFilterBar from '@/components/ui/GlobalFilterBar';
import KPI from '@/components/ui/KPI';
import { GoogleSheetsSync } from '@/components/ui/GoogleSheetsSync';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, TrendingUp, Users, DollarSign, Package, AlertTriangle, Save, Filter, Database, RefreshCw, Download, BarChart3, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import PageMeta from '@/components/common/PageMeta';

const MasterDashboard = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [kpiData, setKpiData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [datasets, setDatasets] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    loadSavedFilters();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedStatus, selectedCustomer, selectedCategory]);

  const buildFilters = () => {
    const filters: any[] = [];
    
    if (selectedStatus !== 'all') {
      filters.push({ field: 'status', op: '=', value: selectedStatus });
    }
    
    if (selectedCustomer !== 'all') {
      filters.push({ field: 'customer', op: '=', value: selectedCustomer });
    }
    
    return filters;
  };

  const loadSavedFilters = async () => {
    try {
      const { data } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('dashboard_type', 'master_dashboard')
        .order('created_at', { ascending: false });
      
      setSavedFilters(data || []);
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const handleSaveFilters = async () => {
    if (!filterName.trim()) return;
    
    try {
      const filterData = {
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : null,
        selectedStatus,
        selectedCustomer,
        selectedCategory
      };
      
      const { error } = await supabase
        .from('saved_filters')
        .insert({
          name: filterName,
          filter_data: filterData as any,
          dashboard_type: 'master_dashboard'
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Filter set saved successfully"
      });
      
      setIsSaveDialogOpen(false);
      setFilterName('');
      loadSavedFilters();
    } catch (error) {
      console.error('Error saving filters:', error);
      toast({
        title: "Error",
        description: "Failed to save filters",
        variant: "destructive"
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // First check if we have any datasets
      const { data: datasetsData } = await supabase
        .from('uploaded_datasets')
        .select('*')
        .eq('is_revoked', false)
        .order('created_at', { ascending: false });
        
      setDatasets(datasetsData || []);
      
      if (!datasetsData || datasetsData.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Fetch KPIs using the new data structure
      const { data: kpis } = await supabase.rpc('aggregate_master', {
        p_metrics: ['amount_total', 'rows', 'customers'],
        p_dimensions: [],
        p_filters: buildFilters(),
        p_date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        p_date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null
      });

      if (kpis?.[0]?.rows) {
        setKpiData((kpis[0].rows as any[])[0]);
      }

      // Fetch chart data - monthly trends
      const { data: monthlyData } = await supabase.rpc('aggregate_master', {
        p_metrics: ['amount_total', 'rows'],
        p_dimensions: ['date'],
        p_filters: buildFilters(),
        p_date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        p_date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        p_limit: 12
      });

      if (monthlyData?.[0]?.rows) {
        setChartData(monthlyData[0].rows as any[]);
      }

      // Fetch top customers
      const { data: customersData } = await supabase.rpc('aggregate_master', {
        p_metrics: ['amount_total', 'rows'],
        p_dimensions: ['customer'],
        p_filters: buildFilters(),
        p_date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
        p_date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
        p_limit: 10
      });

      if (customersData?.[0]?.rows) {
        const customers = customersData[0].rows as any[];
        setTopCustomers(customers.filter(c => c.customer));
      }

      // Fetch inventory alerts
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .lt('current_stock', 50)
        .order('current_stock', { ascending: true });

      if (inventory) {
        setInventoryAlerts(inventory);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta 
        title="Master Dashboard - Comprehensive Business Analytics" 
        description="Advanced dashboard with Google Sheets integration, real-time data sync, and comprehensive business insights"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Master Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Comprehensive business analytics and insights
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <GlobalFilterBar />
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save Filters
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Filter set name..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                      />
                      <Button onClick={handleSaveFilters} className="w-full">
                        Save Filters
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={fetchDashboardData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI
                  label="Total Revenue"
                  value={kpiData?.amount_total || 0}
                  format="currency"
                  delta={0.12}
                  deltaLabel="vs last month"
                  className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50"
                />
                <KPI
                  label="Total Orders"
                  value={kpiData?.rows || 0}
                  format="number"
                  delta={0.08}
                  deltaLabel="vs last month"
                  className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50"
                />
                <KPI
                  label="Active Customers"
                  value={kpiData?.customers || 0}
                  format="number"
                  delta={0.15}
                  deltaLabel="vs last month"
                  className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50"
                />
                <KPI
                  label="Average Order"
                  value={kpiData?.amount_total && kpiData?.rows ? (kpiData.amount_total / kpiData.rows) : 0}
                  format="currency"
                  delta={-0.03}
                  deltaLabel="vs last month"
                  className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50"
                />
              </div>

              {/* Charts and Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Revenue Trends
                    </CardTitle>
                    <CardDescription>Monthly revenue performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      {chartData.length > 0 ? 'Chart visualization here' : 'No data available'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Customers
                    </CardTitle>
                    <CardDescription>Highest value customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topCustomers.slice(0, 5).map((customer, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="font-medium">{customer.customer || 'Unknown'}</span>
                          <Badge variant="secondary">
                            ${customer.amount_total?.toLocaleString() || '0'}
                          </Badge>
                        </div>
                      ))}
                      {topCustomers.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No customer data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="data-sources" className="space-y-6">
              <GoogleSheetsSync />
              
              {datasets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Connected Data Sources
                    </CardTitle>
                    <CardDescription>
                      Manage your connected Google Sheets and other data sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {datasets.map((dataset, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div>
                            <h4 className="font-medium">{dataset.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {dataset.row_count} rows • Updated {new Date(dataset.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex gap-1 mt-2">
                              {dataset.columns?.slice(0, 3).map((col: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {col}
                                </Badge>
                              ))}
                              {dataset.columns?.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{dataset.columns.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-500/10 text-green-700">
                              <Activity className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Column Mappings</CardTitle>
                    <CardDescription>AI-detected column mappings for your data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Auto-mapping will be displayed here once data is synced
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Data Quality</CardTitle>
                    <CardDescription>Insights about your data quality</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Data quality metrics will appear here
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Inventory Alerts
                    {inventoryAlerts.length > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {inventoryAlerts.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Low stock items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inventoryAlerts.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                        <div>
                          <span className="font-medium">{item.product_name}</span>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600 dark:text-orange-400">
                            {item.current_stock} units
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Min: {item.minimum_stock}
                          </div>
                        </div>
                      </div>
                    ))}
                    {inventoryAlerts.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No inventory alerts</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default MasterDashboard;