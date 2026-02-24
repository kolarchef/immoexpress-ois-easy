import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Clock,
  Users, Building2, ShieldAlert, GraduationCap,
  FileText, Mail, ArrowLeftRight,
  Video, Clipboard, FolderPlus,
  Search as SearchIcon, ShoppingCart, CheckSquare,
  FileSearch, Calculator, Handshake, Vault,
  Megaphone, BookOpen, Scale, Wrench, FileQuestion
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Module = { label: string; icon: any; path: string; adminOnly?: boolean };

const modules: Module[] = [
  { label: "CRM KUNDEN", icon: Users, path: "/crm" },
  { label: "OBJEKTE", icon: Building2, path: "/objekte" },
  { label: "EXPOSÉ", icon: FileText, path: "/expose" },
  { label: "STANDORT", icon: MapPin, path: "/kiezcheck" },
  { label: "SOS RECHT", icon: ShieldAlert, path: "/sos-recht" },
  { label: "MEETINGS", icon: Video, path: "/kalender" },
  { label: "MAIL", icon: Mail, path: "/newsletter" },
  { label: "LEARNING", icon: GraduationCap, path: "/academy" },
  { label: "NEWSLETTER", icon: Clipboard, path: "/newsletter-modul" },
  { label: "SUCHE", icon: SearchIcon, path: "/suche" },
  { label: "IMMOZ", icon: ArrowLeftRight, path: "/immoz" },
  { label: "BESTELLUNGEN", icon: ShoppingCart, path: "/bestellung" },
  { label: "UNTERLAGEN+", icon: FolderPlus, path: "/unterlagen" },
  { label: "GRUNDBUCH", icon: FileSearch, path: "/grundbuch" },
  { label: "BEWERTUNG", icon: Calculator, path: "/bewertung" },
  { label: "NETZWERK", icon: Handshake, path: "/netzwerk" },
  { label: "FINANZ-TRESOR", icon: Vault, path: "/finanz-tresor", adminOnly: true },
  { label: "TEAM", icon: Users, path: "/team-performance", adminOnly: true },
  { label: "WERBUNG", icon: Megaphone, path: "/werbung", adminOnly: true },
];

const todos = [
  { id: 1, text: "Alleinvermittlungsvertrag Mayer unterzeichnen lassen", done: false, prio: "hoch" },
  { id: 2, text: "Exposé für Penthouse 1010 Wien finalisieren", done: false, prio: "mittel" },
  { id: 3, text: "Nebenkostenübersicht für Müller vorbereiten", done: true, prio: "niedrig" },
  { id: 4, text: "Finanzamt-Gebühren Kaufvertrag Schober berechnen", done: false, prio: "hoch" },
  { id: 5, text: "Rückruf KlientIn Schmidt (0664 123 4567)", done: false, prio: "mittel" },
];

const appointments = [
  { time: "10:30", duration: "60 MIN", title: "Villa Seeufer Besichtigung", location: "Am See 14, Berlin" },
  { time: "14:00", duration: "30 MIN", title: "Notartermin: Müller & Partner", location: "Beurkundung CRM" },
];

const prioColor: Record<string, string> = {
  hoch: "text-destructive",
  mittel: "text-primary",
  niedrig: "text-muted-foreground",
};

const expertenTools = [
  { label: "ImmoExpress Concierge", desc: "Alle Daten & Checklisten", icon: Wrench, path: "/immo-concierge" },
  { label: "Provisions-Rechner", desc: "Brutto / Netto Kalkulation", icon: Calculator, path: "/provisions-rechner" },
  { label: "Gesetzbuch", desc: "Mietrecht & Richtwerte", icon: Scale, path: "/gesetzbuch" },
  { label: "Handbuch", desc: "Interne Wissensdatenbank", icon: FileQuestion, path: "/academy" },
];

export default function Launchpad() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todoList, setTodoList] = useState(todos);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(!!data?.length);
    });
  }, [user]);

  const visibleModules = modules.filter(m => !m.adminOnly || isAdmin);

  const toggleTodo = (id: number) =>
    setTodoList((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto" style={{ paddingBottom: 150 }}>
      {/* To-Do Liste */}
      <section className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckSquare size={18} className="text-primary" /> Aufgaben
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {todoList.filter((t) => !t.done).length} offen
          </span>
        </div>
        <div className="space-y-2">
          {todoList.map((todo) => (
            <div
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                todo.done ? "bg-muted opacity-60" : "bg-accent hover:bg-secondary"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  todo.done ? "bg-primary border-primary" : "border-muted-foreground"
                }`}
              >
                {todo.done && <span className="text-primary-foreground text-xs">✓</span>}
              </div>
              <span className={`text-sm flex-1 ${todo.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {todo.text}
              </span>
              <span className={`text-[10px] font-bold uppercase ${prioColor[todo.prio]}`}>{todo.prio}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Heutige Termine */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Heutige Termine</h2>
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="text-primary" /> CLOUD SYNC
          </span>
        </div>
        <div className="space-y-3">
          {appointments.map((apt, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-4 items-center">
              <div className="flex-shrink-0 text-left">
                <div className="font-bold text-primary text-base">{apt.time}</div>
                <div className="text-xs text-muted-foreground">{apt.duration}</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{apt.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {apt.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Module Grid */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Module</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {visibleModules.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card shadow-card border border-border hover:shadow-card-hover transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center transition-all group-hover:scale-105 text-primary">
                <Icon size={22} />
              </div>
              <span className="text-xs font-bold text-foreground uppercase tracking-wide text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Experten-Tools */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Experten-Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expertenTools.map(({ label, desc, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card border border-border hover:shadow-card-hover transition-all group text-left w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105 text-primary">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-foreground block leading-tight">{label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
