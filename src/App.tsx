import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AppHeader from "./components/layout/AppHeader";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Datasets from "./pages/Datasets";
import DatasetDetail from "./pages/DatasetDetail";

import Dashboards from "./pages/Dashboards";
import DashboardDetail from "./pages/DashboardDetail";
import Settings from "./pages/Settings";
import SalesDashboard from "./pages/SalesDashboard";
import PilotDashboard from "./pages/PilotDashboard";
import DatasetDashboard from "./pages/DatasetDashboard";
import DashboardBuilder from "./pages/DashboardBuilder";
import DashboardView from "./pages/DashboardView";
import { I18nProvider } from "./i18n/i18n";
import { DataStoreProvider } from "./store/dataStore";
import ExecutiveHub from "@/pages/ExecutiveHub";

import Library from "@/pages/Library";
import DepartmentsDashboard from "@/pages/DepartmentsDashboard";
import { ensureAuth } from "@/lib/ensureAuth";
import FloatingChat from "@/components/chat/FloatingChat";


const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Ensure we always have a session (anonymous if needed) for RLS and Edge Functions
    ensureAuth();
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <I18nProvider>
            <DataStoreProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppHeader />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/datasets" element={<Datasets />} />
                  <Route path="/datasets/:id" element={<DatasetDetail />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/dashboards" element={<Dashboards />} />
                  <Route path="/dashboards/sales" element={<SalesDashboard />} />
                  <Route path="/dashboards/pilot" element={<PilotDashboard />} />
                  <Route path="/dashboards/departments" element={<DepartmentsDashboard />} />
                  <Route path="/dashboards/dataset/:id" element={<DatasetDashboard />} />
                  <Route path="/dashboards/:id" element={<DashboardDetail />} />
                  <Route path="/dashboards/builder" element={<DashboardBuilder/>} />
                  <Route path="/dashboards/view" element={<DashboardView/>} />
                  <Route path="/executive" element={<ExecutiveHub/>} />
                  <Route path="/chat" element={<></>} />
                  <Route path="/settings" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <FloatingChat />
               </BrowserRouter>
            </DataStoreProvider>
          </I18nProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
