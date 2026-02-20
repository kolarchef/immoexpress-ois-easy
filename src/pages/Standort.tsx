import { useState } from "react";
import { MapPin, Search, School, Bus, ShoppingBag, FileText, Info, ChevronRight } from "lucide-react";
import HaftungsModal from "@/components/HaftungsModal";

const kategorien = ["Übersicht", "Bildung", "Verkehr", "Nahversorgung"];

const umgebung = [
  { icon: Bus, label: "U4 Kettenbrückengasse", sub: "ÖPNV Anbindung", distanz: "280m", zeit: "4 MIN" },
  { icon: ShoppingBag, label: "Billa Plus", sub: "Nahversorgung", distanz: "120m", zeit: "2 MIN" },
  { icon: School, label: "VS Kettenbrückengasse", sub: "Bildung", distanz: "650m", zeit: "8 MIN" },
  { icon: Bus, label: "Westbahnhof", sub: "Fernverkehr", distanz: "1.2km", zeit: "15 MIN" },
];

export default function Standort() {
  const [haftungOk, setHaftungOk] = useState(false);
  const [aktKat, setAktKat] = useState("Übersicht");
  const [adresse, setAdresse] = useState("Mariahilfer Str. 45, 1060 Wien");

  if (!haftungOk) {
    return <HaftungsModal modul="Standortdaten" onAccept={() => setHaftungOk(true)} />;
  }

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Standortanalyse</h1>
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">ImmoExpress Core · Österreich</p>
        </div>
        <button className="p-2 rounded-xl hover:bg-accent transition-colors">
          <Info size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Suche */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={adresse}
          onChange={e => setAdresse(e.target.value)}
          placeholder="Adresse eingeben..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        />
      </div>

      {/* Karte Placeholder */}
      <div className="relative w-full h-52 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden mb-5 shadow-card">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary shadow-orange flex items-center justify-center mx-auto mb-2 animate-pulse-orange">
              <MapPin size={22} className="text-primary-foreground" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Kartenansicht</p>
            <p className="text-xs text-slate-500">Wien, Österreich</p>
          </div>
        </div>
        {/* Dummy map markers */}
        <div className="absolute top-8 left-16 w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center shadow">
          <MapPin size={14} className="text-white" />
        </div>
        <div className="absolute bottom-10 right-12 w-8 h-8 rounded-full bg-primary/60 flex items-center justify-center shadow">
          <MapPin size={14} className="text-white" />
        </div>
        <div className="absolute top-20 right-8 bg-card rounded-xl px-3 py-2 shadow-card text-xs font-medium flex flex-col items-end gap-1">
          <button className="text-foreground">+</button>
          <div className="w-px h-3 bg-border"></div>
          <button className="text-foreground">−</button>
        </div>
      </div>

      {/* Kategorie-Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-5">
        {kategorien.map(k => (
          <button
            key={k}
            onClick={() => setAktKat(k)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              aktKat === k ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"
            }`}
          >{k}</button>
        ))}
      </div>

      {/* KI Score */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-foreground">KI Standort-Score</h3>
            <p className="text-xs text-muted-foreground">Basierend auf 142 Echtzeit-Indikatoren</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-primary">8.4</div>
            <div className="text-xs font-bold text-primary">RATING A+</div>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div className="bg-primary h-2 rounded-full" style={{ width: "84%" }}></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-accent rounded-xl p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Potential</div>
            <div className="font-bold text-foreground text-lg">Hoch</div>
            <div className="w-16 h-1.5 bg-primary rounded-full mt-1.5"></div>
          </div>
          <div className="bg-accent rounded-xl p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Zielgruppe</div>
            <div className="font-bold text-foreground text-lg">Familien</div>
            <div className="text-xs text-primary font-semibold mt-1">● PRIME STANDORT</div>
          </div>
        </div>
      </div>

      {/* Umgebung & Distanzen */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border mb-5">
        <h3 className="font-bold text-foreground mb-3">Umgebung &amp; Distanzen</h3>
        <div className="space-y-2">
          {umgebung.map((u, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                <u.icon size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground text-sm">{u.label}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{u.sub}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground text-sm">{u.distanz}</div>
                <div className="text-xs text-primary font-semibold">{u.zeit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-bold shadow-orange hover:bg-primary-dark transition-all active:scale-95">
        <FileText size={18} /> PDF Analyse exportieren
      </button>
    </div>
  );
}
