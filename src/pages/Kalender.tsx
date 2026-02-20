import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MapPin, Shield, Clock } from "lucide-react";

const monate = ["Jänner","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const wochentage = ["MO","DI","MI","DO","FR","SA","SO"];

const termine = [
  { datum: new Date().toISOString().slice(0, 10), uhrzeit: "09:00", dauer: "60 MIN", titel: "Besichtigung: Penthouse 1010", ort: "Schubertring 6, Wien", typ: "besichtigung", wichtig: false },
  { datum: new Date().toISOString().slice(0, 10), uhrzeit: "11:00", dauer: "90 MIN", titel: "Notartermin: Abschluss Huber", ort: "Dr. Wagner, 1030 Wien", typ: "notar", wichtig: true },
  { datum: new Date().toISOString().slice(0, 10), uhrzeit: "14:00", dauer: "30 MIN", titel: "Alleinvermittlung: Müller & Partner", ort: "Beurkundung CRM", typ: "vertrag", wichtig: false },
  { datum: new Date().toISOString().slice(0, 10), uhrzeit: "16:30", dauer: "45 MIN", titel: "Team Lunch", ort: "Café Central, Wien", typ: "sonstig", wichtig: false },
];

export default function Kalender() {
  const [ansicht, setAnsicht] = useState<"Tag" | "Woche" | "Agenda">("Tag");
  const [heute] = useState(new Date());

  const monat = monate[heute.getMonth()];
  const jahr = heute.getFullYear();
  const dayOfWeek = heute.getDay() || 7;

  const wochenDaten = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(heute);
    d.setDate(heute.getDate() - (dayOfWeek - 1) + i);
    return { tag: d.getDate(), aktiv: i + 1 === dayOfWeek };
  });

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
            <Clock size={18} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{monat} {jahr}</h1>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card border border-border rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            Cloud Sync aktiv
          </div>
          <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-bold shadow-orange hover:bg-primary-dark transition-all">
            HEUTE
          </button>
        </div>
      </div>

      {/* Ansicht Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        {(["Tag", "Woche", "Agenda"] as const).map(a => (
          <button
            key={a}
            onClick={() => setAnsicht(a)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              ansicht === a ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"
            }`}
          >{a}</button>
        ))}
      </div>

      {/* Wochenübersicht */}
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4">
        <div className="grid grid-cols-7 gap-1">
          {wochentage.map((wt, i) => (
            <div key={wt} className="text-center">
              <div className="text-xs text-muted-foreground font-medium mb-2">{wt}</div>
              <button className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${wochenDaten[i]?.aktiv
                  ? "bg-primary text-primary-foreground shadow-orange"
                  : "hover:bg-accent text-foreground"
                }`}>
                {wochenDaten[i]?.tag}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Termine des Tages */}
      <div className="space-y-3">
        {termine.map((t, i) => (
          <div key={i} className={`relative rounded-2xl border overflow-hidden shadow-card ${
            t.typ === "notar" ? "bg-primary border-primary" : "bg-card border-border"
          }`}>
            {t.typ !== "notar" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-2xl"></div>}
            <div className="p-4 pl-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-lg tabular-nums ${t.typ === "notar" ? "text-primary-foreground" : "text-primary"}`}>{t.uhrzeit}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.typ === "notar" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary-light text-primary"}`}>{t.dauer}</span>
                  </div>
                  <h3 className={`font-bold text-base ${t.typ === "notar" ? "text-primary-foreground" : "text-foreground"}`}>{t.titel}</h3>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${t.typ === "notar" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <MapPin size={11} />{t.ort}
                  </div>
                  {t.wichtig && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-primary-foreground/20 text-primary-foreground">
                      <Shield size={10} /> WICHTIG
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-orange flex items-center justify-center hover:bg-primary-dark transition-all active:scale-90 hover:scale-105">
        <Plus size={24} />
      </button>
    </div>
  );
}
