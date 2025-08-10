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
import Model from "./pages/Model";
import Dashboards from "./pages/Dashboards";
import DashboardDetail from "./pages/DashboardDetail";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import { I18nProvider } from "./i18n/i18n";
import { DataStoreProvider } from "./store/dataStore";

const queryClient = new QueryClient();

const App = () => (
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
                <Route path="/model" element={<Model />} />
                <Route path="/dashboards" element={<Dashboards />} />
                <Route path="/dashboards/:id" element={<DashboardDetail />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DataStoreProvider>
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
