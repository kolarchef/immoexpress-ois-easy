import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Search, CheckSquare, Camera, User, Bell, MessageCircle, Mic, MicOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MessengerDrawer from "@/components/MessengerDrawer";
import AudioRecorder from "@/components/AudioRecorder";
import logoImg from "@/assets/logo_immoexpress_zug.jpeg";
import { toast } from "@/hooks/use-toast";

const bottomNav = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/suche", icon: Search, label: "Suche" },
  { path: "/kalender", icon: CheckSquare, label: "Aufgaben" },
  { path: "/kamera", icon: Camera, label: "Kamera" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const [showMicPanel, setShowMicPanel] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");

  const handleTranscript = (text: string) => {
    setLastTranscript(text);
    // Copy to clipboard for easy pasting
    navigator.clipboard?.writeText(text);
    toast({ title: "🎙️ Sprachnotiz aufgenommen", description: "Text wurde kopiert – füge ihn im Exposé oder Objekt ein." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Top Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-card z-10">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
          <img src={logoImg} alt="ImmoExpress brainy" className="h-12 w-auto object-contain" />
          <div className="text-left">
            <div className="font-bold text-foreground text-sm leading-tight">ImmoExpress</div>
            <div className="text-primary text-xs font-bold tracking-widest uppercase">Brainy</div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <span>Willkommen,</span>
          <span className="font-semibold text-foreground">{displayName || "Makler"}</span>
          <span className="text-xs ml-2 bg-primary-light text-primary px-2 py-0.5 rounded-full font-semibold">Senior Agent · Wien</span>
        </div>

        <div className="flex items-center gap-2">
          <MessengerDrawer
            trigger={
              <button className="relative p-2 rounded-xl hover:bg-accent transition-colors">
                <MessageCircle size={20} className="text-muted-foreground" />
              </button>
            }
          />
          <button className="relative p-2 rounded-xl hover:bg-accent transition-colors">
            <Bell size={20} className="text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <button onClick={() => navigate("/profil")} className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-orange-sm">
            <User size={16} className="text-primary-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Floating Mic Panel */}
      {showMicPanel && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-md-custom p-4 w-[90%] max-w-sm animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Mic size={14} className="text-primary" /> Sprachnotiz
            </h3>
            <button onClick={() => setShowMicPanel(false)} className="p-1 rounded-lg hover:bg-accent">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
          <AudioRecorder onTranscript={handleTranscript} />
          {lastTranscript && (
            <div className="mt-3 bg-accent rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Letzte Aufnahme (in Zwischenablage):</p>
              <p className="text-sm text-foreground">{lastTranscript}</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
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

          {/* Mikrofon */}
          <button
            onClick={() => setShowMicPanel(!showMicPanel)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 ${showMicPanel ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${showMicPanel ? "bg-primary-light" : ""}`}>
              <Mic size={20} className={showMicPanel ? "text-primary" : "text-muted-foreground"} />
            </div>
            <span className={`text-[10px] font-semibold ${showMicPanel ? "text-primary" : "text-muted-foreground"}`}>Diktieren</span>
          </button>

          {/* Profil */}
          <button onClick={() => navigate("/profil")} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 text-muted-foreground hover:text-foreground">
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
