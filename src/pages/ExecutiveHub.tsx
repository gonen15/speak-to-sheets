import React, { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import OrdersAnalysisDashboard from "@/components/ui/OrdersAnalysisDashboard";
import InventoryDashboard from "@/components/ui/InventoryDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Package, TrendingUp } from "lucide-react";

export default function ExecutiveHub() {
  return (
    <>
      <PageMeta 
        title="Executive Hub" 
        description="Dashboard for executive insights and KPIs"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">מרכז ניהול עליון</h1>
          </div>
          
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                ניתוח מכירות
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                ניתוח מלאי
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sales">
              <OrdersAnalysisDashboard />
            </TabsContent>
            
            <TabsContent value="inventory">
              <InventoryDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
