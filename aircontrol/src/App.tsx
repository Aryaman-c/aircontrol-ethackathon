import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OrbitAirLanding from "./pages/OrbitAirLanding";
import Index from "./pages/Index";
import MapPage from "./pages/MapPage";
import DelhiLocalitiesPage from "./pages/DelhiLocalitiesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<Index />} />
          <Route path="/home"     element={<Navigate to="/" replace />} />
          <Route path="/landing"  element={<OrbitAirLanding />} />
          <Route path="/map"      element={<MapPage />} />
          <Route path="/delhi"    element={<DelhiLocalitiesPage />} />
          <Route path="/about"    element={<Navigate to="/" replace />} />
          <Route path="/profile"  element={<Navigate to="/" replace />} />
          <Route path="/forecast" element={<Navigate to="/" replace />} />
          <Route path="/alerts"   element={<Navigate to="/" replace />} />
          <Route path="*"         element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
