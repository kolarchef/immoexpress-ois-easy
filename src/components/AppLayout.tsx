import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, MapPin, ShieldAlert,
  Calendar, GraduationCap, ShoppingCart, Camera, Search, Menu, X, Bell, User
} from "lucide-react";
import { useState } from "react";
import logoImg from "@/assets/logo_immoexpress.png";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/crm", icon: Users, label: "CRM Kunden" },
  { path: "/objekte", icon: Building2, label: "Objektverwaltung" },
  { path: "/standort", icon: MapPin, label: "Standortdaten" },
  { path: "/sos-recht", icon: ShieldAlert, label: "SOS Recht" },
  { path: "/bestellung", icon: ShoppingCart, label: "Bestellung" },
  { path: "/kamera", icon: Camera, label: "Kamera" },
  { path: "/suche", icon: Search, label: "Suche" },
  { path: "/kalender", icon: Calendar, label: "Kalender" },
  { path: "/academy", icon: GraduationCap, label: "Academy" },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-card flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <button onClick={() => { navigate("/"); setSidebarOpen(false); }} className="flex items-center gap-3 w-full group">
            <img src={logoImg} alt="ImmoExpress brainy Logo" className="h-12 w-12 rounded-xl object-cover shadow-orange-sm" />
            <div className="text-left">
              <div className="font-bold text-foreground text-base leading-tight">ImmoExpress</div>
              <div className="text-primary text-xs font-semibold tracking-widest uppercase">brainy</div>
              <div className="text-muted-foreground text-xs">Real Estate OS</div>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-orange"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-orange-sm">
              <User size={18} className="text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Max Mustermann</div>
              <div className="text-xs text-primary font-medium">Senior Agent · Wien</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-accent transition-colors">
            <Menu size={22} className="text-foreground" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Willkommen zurück,</span>
            <span className="text-sm font-semibold text-foreground">Max Mustermann</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-xl hover:bg-accent transition-colors">
              <Bell size={20} className="text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse-orange"></span>
            </button>
            <button onClick={() => navigate("/")} className="lg:hidden">
              <img src={logoImg} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
