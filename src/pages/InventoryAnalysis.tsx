import React from "react";
import PageMeta from "@/components/common/PageMeta";
import InventoryDashboard from "@/components/ui/InventoryDashboard";

export default function InventoryAnalysis() {
  return (
    <>
      <PageMeta 
        title="ניתוח מלאי" 
        description="לוח בקרת מלאי וניתוח ימי מלאי"
      />
      <div className="min-h-screen bg-background">
        <InventoryDashboard />
      </div>
    </>
  );
}