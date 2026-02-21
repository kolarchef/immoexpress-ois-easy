import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Search, CheckSquare, Camera, User, Bell } from "lucide-react";
import logoImg from "@/assets/logo_immoexpress.png";

const bottomNav = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/suche", icon: Search, label: "Suche" },
  { path: "/kalender", icon: CheckSquare, label: "Aufgaben" },
  { path: "/kamera", icon: Camera, label: "Kamera" },
];

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
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
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation – 5 items: Home, Suche, Aufgaben, Kamera, Profil */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-md-custom">
        <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
          {bottomNav.map(({ path, icon: Icon, label }) => (
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

          {/* Profil */}
          <button className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 text-muted-foreground hover:text-foreground">
            <div className="p-1.5 rounded-xl">
              <User size={20} className="text-muted-foreground" />
            </div>
            <span className="text-[10px] font-semibold">Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
