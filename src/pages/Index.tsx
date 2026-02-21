import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProvisionsRechner from "@/components/ProvisionsRechner";
import {
  MapPin, Clock,
  Users, Building2, ShieldAlert, GraduationCap,
  FileText, ArrowLeftRight,
  Video, FolderPlus,
  Search as SearchIcon, ShoppingCart, CheckSquare,
  FileSearch, Calculator, Handshake, TrendingUp,
  Clipboard, KeyRound, Scale, BookOpen,
  Star
} from "lucide-react";

const mainModules = [
  { label: "CRM KUNDEN", icon: Users, path: "/crm" },
  { label: "OBJEKTE", icon: Building2, path: "/objekte" },
  { label: "EXPOSÉ", icon: FileText, path: "/expose" },
  { label: "STANDORT", icon: MapPin, path: "/standort" },
  { label: "SOS RECHT", icon: ShieldAlert, path: "/sos-recht" },
  { label: "MEETINGS", icon: Video, path: "/kalender" },
  { label: "UNTERLAGEN+", icon: FolderPlus, path: "/unterlagen" },
  { label: "LEARNING", icon: GraduationCap, path: "/academy" },
  { label: "NEWSLETTER", icon: Clipboard, path: "/newsletter-modul" },
  { label: "SUCHE", icon: SearchIcon, path: "/suche" },
  { label: "IMMOZ", icon: ArrowLeftRight, path: "/immoz" },
  { label: "BESTELLUNGEN", icon: ShoppingCart, path: "/bestellung" },
  { label: "GRUNDBUCH", icon: FileSearch, path: "/grundbuch" },
  { label: "BEWERTUNG", icon: Calculator, path: "/bewertung" },
  { label: "NETZWERK", icon: Handshake, path: "/netzwerk" },
  { label: "ZINSHAUS", icon: TrendingUp, path: "/zinshaus" },
];

const initialTodos = [
  { id: 1, text: "Alleinvermittlungsvertrag Mayer unterzeichnen lassen", done: false, prio: "hoch" as const },
  { id: 2, text: "Exposé für Penthouse 1010 Wien finalisieren", done: false, prio: "mittel" as const },
  { id: 3, text: "Nebenkostenübersicht für Müller vorbereiten", done: true, prio: "niedrig" as const },
  { id: 4, text: "Finanzamt-Gebühren Kaufvertrag Schober berechnen", done: false, prio: "hoch" as const },
  { id: 5, text: "Rückruf KlientIn Schmidt (0664 123 4567)", done: false, prio: "mittel" as const },
];

const appointments = [
  { time: "10:30", duration: "60 MIN", title: "Villa Seeufer Besichtigung", location: "Am See 14, Berlin" },
  { time: "14:00", duration: "30 MIN", title: "Notartermin: Müller & Partner", location: "Beurkundung CRM" },
];

const prioColor = { hoch: "text-destructive", mittel: "text-primary", niedrig: "text-muted-foreground" };

export default function Index() {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const [todos, setTodos] = useState(initialTodos);

  const toggle = (id: number) =>
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto animate-fade-in" style={{ overflowY: "auto", height: "auto", paddingBottom: 200 }}>
      {/* Begrüßung */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Willkommen, {displayName || "Makler"} 👋</h1>
        <p className="text-sm text-muted-foreground">Dein Überblick für heute</p>
      </div>

      {/* Aufgaben */}
      <section className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckSquare size={18} className="text-primary" /> Aufgaben
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {todos.filter((t) => !t.done).length} offen
          </span>
        </div>
        <div className="space-y-2">
          {todos.map((t) => (
            <div
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                t.done ? "bg-muted opacity-60" : "bg-accent hover:bg-secondary"
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                t.done ? "bg-primary border-primary" : "border-muted-foreground"
              }`}>
                {t.done && <span className="text-primary-foreground text-xs">✓</span>}
              </div>
              <span className={`text-sm flex-1 ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.text}</span>
              <span className={`text-[10px] font-bold uppercase ${prioColor[t.prio]}`}>{t.prio}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Termine */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Heutige Termine</h2>
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="text-primary" /> SYNC
          </span>
        </div>
        <div className="space-y-3">
          {appointments.map((a, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-4 items-center">
              <div className="flex-shrink-0 text-left">
                <div className="font-bold text-primary text-base">{a.time}</div>
                <div className="text-xs text-muted-foreground">{a.duration}</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {a.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 16 Haupt-Module (4×4) */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Module</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mainModules.map(({ label, icon: Icon, path }) => (
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Experten-Tools</h2>
        <div className="grid grid-cols-2 gap-2">
          {/* Immo-Concierge */}
          <button
            onClick={() => navigate("/immo-concierge")}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border hover:bg-secondary transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
              <KeyRound size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
           <span className="text-xs font-bold text-foreground block truncate">IMMOEXPRESS-CONCIERGE</span>
               <span className="text-[10px] text-muted-foreground block truncate">After-Sales & Checklisten</span>
            </div>
          </button>

          {/* Provisions-Rechner */}
          <ProvisionsRechner
            trigger={
              <button className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border hover:bg-secondary transition-all text-left w-full">
                <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                  <Calculator size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">PROVISIONS-RECHNER</span>
                  <span className="text-[10px] text-muted-foreground block truncate">Brutto/Netto-Kalkulation</span>
                </div>
              </button>
            }
          />

          {/* Gesetzbuch */}
          <button
            onClick={() => navigate("/gesetzbuch")}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border hover:bg-secondary transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
              <Scale size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">GESETZBUCH</span>
              <span className="text-[10px] text-muted-foreground block truncate">Maklergesetz & ÖNORMEN</span>
            </div>
          </button>

          {/* Handbuch */}
          <button className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border hover:bg-secondary transition-all text-left">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">HANDBUCH</span>
              <span className="text-[10px] text-muted-foreground block truncate">Interne Wissensdatenbank</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
