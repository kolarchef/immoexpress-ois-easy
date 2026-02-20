import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, MapPin, ShieldAlert,
  Calendar, GraduationCap, ShoppingCart, Camera, Search, Bell, User, MoreHorizontal, X
} from "lucide-react";
import { useState } from "react";
import logoImg from "@/assets/logo_immoexpress.png";

const mainNav = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/crm", icon: Users, label: "CRM" },
  { path: "/objekte", icon: Building2, label: "Objekte" },
  { path: "/suche", icon: Search, label: "Suche" },
  { path: "/kalender", icon: Calendar, label: "Kalender" },
];

const moreNav = [
  { path: "/standort", icon: MapPin, label: "Standortdaten" },
  { path: "/sos-recht", icon: ShieldAlert, label: "SOS Recht" },
  { path: "/bestellung", icon: ShoppingCart, label: "Bestellung" },
  { path: "/kamera", icon: Camera, label: "Kamera" },
  { path: "/academy", icon: GraduationCap, label: "Academy" },
];

export default function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Top Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-card z-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
          <img src={logoImg} alt="ImmoExpress brainy" className="h-10 w-10 rounded-xl object-cover shadow-orange-sm" />
          <div className="text-left hidden sm:block">
            <div className="font-bold text-foreground text-sm leading-tight">ImmoExpress</div>
            <div className="text-primary text-xs font-bold tracking-widest uppercase">brainy</div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <span>Willkommen,</span>
          <span className="font-semibold text-foreground">Max Mustermann</span>
          <span className="text-xs ml-2 bg-primary-light text-primary px-2 py-0.5 rounded-full font-semibold">Senior Agent · Wien</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl hover:bg-accent transition-colors">
            <Bell size={20} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-orange-sm">
            <User size={16} className="text-primary-foreground" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-md-custom">
        <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
          {mainNav.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0 flex-1
                ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary-light" : ""}`}>
                    <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <span className={`text-[10px] font-semibold truncate ${isActive ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Mehr Button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 text-muted-foreground hover:text-foreground"
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal size={20} />
            </div>
            <span className="text-[10px] font-semibold">Mehr</span>
          </button>
        </div>
      </nav>

      {/* Mehr Drawer */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-md-custom border-t border-border p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-base">Weitere Module</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl hover:bg-accent transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {moreNav.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all
                    ${isActive ? "bg-primary text-primary-foreground shadow-orange" : "bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={22} className={isActive ? "text-primary-foreground" : "text-primary"} />
                      <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-orange-sm text-primary-foreground font-bold">M</div>
              <div>
                <div className="font-semibold text-foreground text-sm">Max Mustermann</div>
                <div className="text-xs text-primary font-semibold">Senior Agent · Wien</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
