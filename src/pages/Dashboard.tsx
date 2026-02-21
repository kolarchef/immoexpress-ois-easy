import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, MapPin, Clock,
  Users, Building2, ShieldAlert, GraduationCap,
  FileText, Mail, ArrowLeftRight,
  Video, Clipboard, FolderPlus,
  Search as SearchIcon, ShoppingCart, CheckSquare,
  FileSearch, Calculator, Handshake
} from "lucide-react";

const modules = [
  // Reihe 1
  { label: "CRM KUNDEN", icon: Users, path: "/crm" },
  { label: "OBJEKTE", icon: Building2, path: "/objekte" },
  { label: "EXPOSÉ", icon: FileText, path: "/expose" },
  { label: "STANDORT", icon: MapPin, path: "/standort" },
  // Reihe 2
  { label: "SOS RECHT", icon: ShieldAlert, path: "/sos-recht" },
  { label: "MEETINGS", icon: Video, path: "/kalender" },
  { label: "MAIL", icon: Mail, path: "/newsletter" },
  { label: "LEARNING", icon: GraduationCap, path: "/academy" },
  // Reihe 3
  { label: "NEWSLETTER", icon: Clipboard, path: "/newsletter-modul" },
  { label: "SUCHE", icon: SearchIcon, path: "/suche" },
  { label: "IMMOZ", icon: ArrowLeftRight, path: "/immoz" },
  { label: "BESTELLUNGEN", icon: ShoppingCart, path: "/bestellung" },
  // Reihe 4 – Spezial
  { label: "UNTERLAGEN", icon: FolderPlus, path: "/unterlagen" },
  { label: "GRUNDBUCH", icon: FileSearch, path: "/grundbuch" },
  { label: "BEWERTUNG", icon: Calculator, path: "/bewertung" },
  { label: "NETZWERK", icon: Handshake, path: "/netzwerk" },
];

const todos = [
  { id: 1, text: "Alleinvermittlungsvertrag Mayer unterzeichnen lassen", done: false, prio: "hoch" },
  { id: 2, text: "Exposé für Penthouse 1010 Wien finalisieren", done: false, prio: "mittel" },
  { id: 3, text: "Nebenkostenübersicht für Müller vorbereiten", done: true, prio: "niedrig" },
  { id: 4, text: "Finanzamt-Gebühren Kaufvertrag Schober berechnen", done: false, prio: "hoch" },
  { id: 5, text: "Rückruf KlientIn Schmidt (0664 123 4567)", done: false, prio: "mittel" },
];

const appointments = [
  { time: "10:30", duration: "60 MIN", title: "Villa Seeufer Besichtigung", location: "Am See 14, Berlin", type: "besichtigung" },
  { time: "14:00", duration: "30 MIN", title: "Notartermin: Müller & Partner", location: "Beurkundung CRM", type: "notar" },
];

const prioColor: Record<string, string> = {
  hoch: "text-destructive",
  mittel: "text-primary",
  niedrig: "text-muted-foreground",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [todoList, setTodoList] = useState(todos);

  const toggleTodo = (id: number) =>
    setTodoList((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* To-Do Liste */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
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
      </div>

      {/* Heutige Termine */}
      <div>
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
      </div>

      {/* Module Grid – 4×4 */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-3">Module</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modules.map(({ label, icon: Icon, path }) => (
            <button
              key={path + label}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card shadow-card border border-border hover:shadow-card-hover transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center transition-all group-hover:scale-105 text-primary">
                <Icon size={22} />
              </div>
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
