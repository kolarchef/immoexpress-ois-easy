import { useNavigate } from "react-router-dom";
import {
  CheckSquare, Calendar, MapPin, Clock,
  Users, Building2, ShieldAlert, GraduationCap,
  ShoppingCart, FileText, Mail, ArrowLeftRight,
  Search, Camera
} from "lucide-react";

const modules = [
  { label: "CRM Kunden", icon: Users, path: "/crm", color: "bg-blue-50 text-blue-600" },
  { label: "Objekte", icon: Building2, path: "/objekte", color: "bg-amber-50 text-amber-600" },
  { label: "Standort", icon: MapPin, path: "/standort", color: "bg-emerald-50 text-emerald-600" },
  { label: "SOS Recht", icon: ShieldAlert, path: "/sos-recht", color: "bg-red-50 text-red-600" },
  { label: "Exposé", icon: FileText, path: "/expose", color: "bg-primary-light text-primary" },
  { label: "Newsletter", icon: Mail, path: "/newsletter", color: "bg-purple-50 text-purple-600" },
  { label: "ImmoZ", icon: ArrowLeftRight, path: "/immoz", color: "bg-cyan-50 text-cyan-600" },
  { label: "Academy", icon: GraduationCap, path: "/academy", color: "bg-indigo-50 text-indigo-600" },
  { label: "Bestellung", icon: ShoppingCart, path: "/bestellung", color: "bg-orange-50 text-orange-500" },
  { label: "Kamera", icon: Camera, path: "/kamera", color: "bg-slate-100 text-slate-600" },
  { label: "Suche", icon: Search, path: "/suche", color: "bg-teal-50 text-teal-600" },
  { label: "Kalender", icon: Calendar, path: "/kalender", color: "bg-rose-50 text-rose-600" },
];

const todos = [
  { id: 1, text: "Alleinvermittlungsvertrag Mayer unterzeichnen lassen", done: false, prio: "hoch" },
  { id: 2, text: "Exposé für Penthouse 1010 Wien finalisieren", done: false, prio: "mittel" },
  { id: 3, text: "Nebenkostenübersicht für Müller vorbereiten", done: true, prio: "niedrig" },
  { id: 4, text: "Finanzamt-Gebühren Kaufvertrag Schober berechnen", done: false, prio: "hoch" },
  { id: 5, text: "Rückruf KlientIn Schmidt (0664 123 4567)", done: false, prio: "mittel" },
];

const appointments = [
  { time: "09:00", duration: "60 MIN", title: "Besichtigung: Penthouse 1010", location: "Schubertring 6, Wien", type: "besichtigung" },
  { time: "11:00", duration: "90 MIN", title: "Notartermin: Abschluss Huber", location: "Notar Dr. Wagner, 1030 Wien", type: "notar" },
  { time: "14:00", duration: "30 MIN", title: "Alleinvermittlung: Müller & Partner", location: "Beurkundung CRM", type: "vertrag" },
  { time: "16:30", duration: "45 MIN", title: "Marktanalyse: 1220 Wien Donaustadt", location: "Online Meeting", type: "analyse" },
];

const days = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
const today = new Date().getDay();
const weekDates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  const day = d.getDay() || 7;
  const diff = i + 1 - day;
  const nd = new Date(d);
  nd.setDate(d.getDate() + diff);
  return nd.getDate();
});

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Guten Morgen, Max 🏠</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Wien, Österreich</div>
          <div className="text-sm font-semibold text-foreground">
            {new Date().toLocaleDateString("de-AT", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border">
        <h2 className="font-bold text-foreground text-sm mb-3 uppercase tracking-wide text-muted-foreground">Module</h2>
        <div className="grid grid-cols-4 gap-3">
          {modules.map(({ label, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-accent transition-all group"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-card transition-all group-hover:scale-105 ${color}`}>
                <Icon size={22} />
              </div>
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Two columns: To-Do & Termine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* To-Do Liste */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-primary" />
              <h2 className="font-bold text-foreground">To-Do Liste</h2>
            </div>
            <span className="text-xs bg-primary-light text-primary font-semibold px-2.5 py-1 rounded-full">
              {todos.filter(t => !t.done).length} offen
            </span>
          </div>
          <div className="space-y-2">
            {todos.map((todo) => (
              <div key={todo.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${todo.done ? "opacity-50 bg-muted" : "bg-accent hover:bg-secondary border-border"}`}>
                <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 ${todo.done ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                  {todo.done && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-primary-foreground fill-current"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${todo.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.text}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  todo.prio === "hoch" ? "bg-destructive/10 text-destructive" :
                  todo.prio === "mittel" ? "bg-primary-light text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>{todo.prio}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heutige Termine */}
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <h2 className="font-bold text-foreground">Heutige Termine</h2>
            </div>
            <span className="text-xs text-muted-foreground">{appointments.length} Termine</span>
          </div>
          <div className="space-y-2">
            {appointments.map((apt, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded-xl border-l-4 ${apt.type === "notar" ? "bg-primary text-primary-foreground border-l-primary" : "bg-accent border-l-primary"}`}>
                <div className="flex-shrink-0 text-right">
                  <div className={`font-bold text-sm tabular-nums ${apt.type === "notar" ? "text-primary-foreground" : "text-primary"}`}>{apt.time}</div>
                  <div className={`text-xs ${apt.type === "notar" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{apt.duration}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm truncate ${apt.type === "notar" ? "text-primary-foreground" : "text-foreground"}`}>{apt.title}</div>
                  <div className={`text-xs flex items-center gap-1 mt-0.5 ${apt.type === "notar" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <MapPin size={10} />{apt.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kalender Wochenansicht */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Wochenübersicht</h2>
          </div>
          <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString("de-AT", { month: "long", year: "numeric" })}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-3">
          {days.map((d, i) => (
            <div key={d} className="text-center">
              <div className="text-xs text-muted-foreground font-medium mb-1">{d}</div>
              <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${i + 1 === (today || 7) ? "bg-primary text-primary-foreground shadow-orange" : "hover:bg-accent text-foreground cursor-pointer"}`}>
                {weekDates[i]}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 mt-4 border-t border-border pt-3">
          {appointments.slice(0, 3).map((apt, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary w-10 tabular-nums">{apt.time}</span>
              <div className="flex-1 h-7 rounded-lg bg-accent border-l-2 border-primary flex items-center px-3">
                <span className="text-xs font-medium text-foreground truncate">{apt.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
