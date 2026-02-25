import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Search, Camera, User, Bell, MessageCircle, Mic, X, Send, Loader2, BarChart3, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState as useStateHook } from "react";
import { supabase } from "@/integrations/supabase/client";
import MessengerDrawer from "@/components/MessengerDrawer";
import AudioRecorder from "@/components/AudioRecorder";
import logoImg from "@/assets/logo_immoexpress_zug.jpeg";
import { toast } from "@/hooks/use-toast";
import { sendAction } from "@/lib/sendAction";

const bottomNav = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/suche", icon: Search, label: "Suche" },
  { path: "/rechtsarchiv", icon: ShieldCheck, label: "§ Archiv", special: true },
  { path: "/kamera", icon: Camera, label: "Kamera" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { displayName, user, signOut } = useAuth();
  const [showMicPanel, setShowMicPanel] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [isAdmin, setIsAdmin] = useStateHook(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(!!data?.length);
    });
  }, [user]);

  const handleTranscript = (text: string) => {
    setLastTranscript(text);
    // Copy to clipboard for easy pasting
    navigator.clipboard?.writeText(text);
    toast({ title: "🎙️ Sprachnotiz aufgenommen", description: "Text wurde kopiert – füge ihn im Exposé oder Objekt ein." });
  };

  const handleSendNote = async () => {
    if (!lastTranscript.trim()) {
      toast({ title: "Kein Text vorhanden", description: "Bitte zuerst eine Sprachnotiz aufnehmen.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Bitte einloggen", variant: "destructive" });
      return;
    }
    setSendingNote(true);
    try {
      const { ok, status } = await sendAction("notiz_speichern", { text: lastTranscript });
      if (ok) {
        toast({ title: "✅ Notiz gesendet", description: "Sprachnotiz wurde an Make.com übermittelt." });
      } else {
        throw new Error(`Webhook Fehler: ${status}`);
      }
    } catch (err: unknown) {
      toast({ title: "Senden fehlgeschlagen", description: err instanceof Error ? err.message : "Unbekannter Fehler", variant: "destructive" });
    } finally {
      setSendingNote(false);
    }
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
          {isAdmin && (
            <button
              onClick={() => navigate("/team-performance")}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all"
            >
              <BarChart3 size={14} /> BUSINESS-COCKPIT
            </button>
          )}
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
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
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
          <button
            onClick={handleSendNote}
            disabled={!lastTranscript.trim() || sendingNote}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          >
            {sendingNote ? <><Loader2 size={14} className="animate-spin" /> Wird gesendet…</> : <><Send size={14} /> Notiz senden</>}
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-md-custom">
        <div className="flex items-center justify-around px-2 py-1.5 max-w-2xl mx-auto">
          {bottomNav.map(({ path, icon: Icon, label, special }) => (
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
                  {special ? (
                    <div className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center shadow-sm">
                      <Icon size={18} className="text-white" />
                    </div>
                  ) : (
                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary-light" : ""}`}>
                      <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    </div>
                  )}
                  <span className={`text-[10px] font-semibold truncate ${special ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
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
