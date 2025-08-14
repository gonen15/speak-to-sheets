import React from "react";
import PageMeta from "@/components/common/PageMeta";
import OrdersAnalysisDashboard from "@/components/ui/OrdersAnalysisDashboard";

export default function ExecutiveHub() {
  return (
    <>
      <PageMeta 
        title="Executive Hub" 
        description="Dashboard for executive insights and KPIs"
      />
      <div className="min-h-screen bg-background">
        <OrdersAnalysisDashboard />
      </div>
    </>
  );
}
