import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Objektverwaltung from "./pages/Objektverwaltung";
import Standort from "./pages/Standort";
import SOSRecht from "./pages/SOSRecht";
import Kalender from "./pages/Kalender";
import Academy from "./pages/Academy";
import Bestellung from "./pages/Bestellung";
import Kamera from "./pages/Kamera";
import Suche from "./pages/Suche";
import Expose from "./pages/Expose";
import Newsletter from "./pages/Newsletter";
import ImmoZ from "./pages/ImmoZ";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/objekte" element={<Objektverwaltung />} />
            <Route path="/standort" element={<Standort />} />
            <Route path="/sos-recht" element={<SOSRecht />} />
            <Route path="/kalender" element={<Kalender />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/bestellung" element={<Bestellung />} />
            <Route path="/kamera" element={<Kamera />} />
            <Route path="/suche" element={<Suche />} />
            <Route path="/expose" element={<Expose />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/immoz" element={<ImmoZ />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
