import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Launchpad from "./pages/Launchpad";
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
import Unterlagen from "./pages/Unterlagen";
import KundenUpload from "./pages/KundenUpload";
import FinanzUpload from "./pages/FinanzUpload";
import Grundbuch from "./pages/Grundbuch";
import Bewertung from "./pages/Bewertung";
import Netzwerk from "./pages/Netzwerk";
import Zinshaus from "./pages/Zinshaus";
import ImmoConcierge from "./pages/ImmoConcierge";
import Gesetzbuch from "./pages/Gesetzbuch";
import KiezCheck from "./pages/KiezCheck";
import FinanzTresor from "./pages/FinanzTresor";
import Profil from "./pages/Profil";
import TeamPerformance from "./pages/TeamPerformance";
import Team from "./pages/Team";
import BestellAdmin from "./pages/BestellAdmin";
import AuditLogs from "./pages/AuditLogs";
import RechtDisclaimer from "./pages/RechtDisclaimer";
import Rechtsarchiv from "./pages/Rechtsarchiv";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Laden...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/upload" element={<KundenUpload />} />
    <Route path="/finanz-upload" element={<FinanzUpload />} />
    <Route path="/recht-disclaimer" element={<RechtDisclaimer />} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/" element={<Index />} />
      <Route path="/launchpad" element={<Launchpad />} />
      <Route path="/dashboard" element={<Dashboard />} />
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
      <Route path="/newsletter-modul" element={<Newsletter />} />
      <Route path="/immoz" element={<ImmoZ />} />
      <Route path="/unterlagen" element={<Unterlagen />} />
      <Route path="/grundbuch" element={<Grundbuch />} />
      <Route path="/bewertung" element={<Bewertung />} />
      <Route path="/netzwerk" element={<Netzwerk />} />
      <Route path="/zinshaus" element={<Zinshaus />} />
      <Route path="/immo-concierge" element={<ImmoConcierge />} />
      <Route path="/gesetzbuch" element={<Gesetzbuch />} />
      <Route path="/kiezcheck" element={<KiezCheck />} />
      <Route path="/finanz-tresor" element={<FinanzTresor />} />
      <Route path="/profil" element={<Profil />} />
      <Route path="/team-performance" element={<TeamPerformance />} />
      <Route path="/team" element={<Team />} />
      <Route path="/bestell-admin" element={<BestellAdmin />} />
      <Route path="/admin/audit-logs" element={<AuditLogs />} />
      <Route path="/admin/sos-audit" element={<AuditLogs />} />
      <Route path="/rechtsarchiv" element={<Rechtsarchiv />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
