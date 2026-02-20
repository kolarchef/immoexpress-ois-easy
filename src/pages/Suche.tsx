import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, BedDouble, Maximize2, Heart, Building2, Home, Briefcase } from "lucide-react";

const ergebnisse = [
  { id: "IM-001", adresse: "Schubertring 6, 1010 Wien", bezirk: "Innere Stadt", zimmer: 4, flaeche: 145, preis: "€850.000", typ: "Wohnung", status: "VERFÜGBAR", favorit: false },
  { id: "IM-002", adresse: "Nussdorfer Str. 18, 1090 Wien", bezirk: "Alsergrund", zimmer: 3, flaeche: 98, preis: "€520.000", typ: "Wohnung", status: "VERFÜGBAR", favorit: true },
  { id: "IM-003", adresse: "Linzer Gasse 12, 5020 Salzburg", bezirk: "Altstadt", zimmer: 5, flaeche: 210, preis: "€1.100.000", typ: "Haus", status: "RESERVIERT", favorit: false },
  { id: "IM-004", adresse: "Mariahilfer Str. 55, 1060 Wien", bezirk: "Mariahilf", zimmer: 2, flaeche: 65, preis: "€1.650/Mon", typ: "Wohnung", status: "VERMIETET", favorit: false },
];

const typen = [
  { label: "Alle", icon: SlidersHorizontal },
  { label: "Wohnung", icon: Building2 },
  { label: "Haus", icon: Home },
  { label: "Gewerbe", icon: Briefcase },
];

const statusStyle: Record<string, string> = {
  "VERFÜGBAR": "bg-green-100 text-green-700",
  "RESERVIERT": "bg-amber-100 text-amber-700",
  "VERMIETET": "bg-muted text-muted-foreground",
};

export default function Suche() {
  const [q, setQ] = useState("");
  const [typ, setTyp] = useState("Alle");
  const [favs, setFavs] = useState<string[]>([]);

  const filtered = ergebnisse.filter(e =>
    (typ === "Alle" || e.typ === typ) &&
    (e.adresse.toLowerCase().includes(q.toLowerCase()) || e.bezirk.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Immobiliensuche</h1>
        <p className="text-muted-foreground text-sm">Wien &amp; alle 9 Bundesländer</p>
      </div>

      {/* Suche */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Adresse, PLZ, Bezirk oder Bundesland..."
          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Typ-Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {typen.map(t => (
          <button
            key={t.label}
            onClick={() => setTyp(t.label)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              typ === t.label ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Ergebnisse */}
      <div className="mb-2 text-xs text-muted-foreground font-medium">{filtered.length} Objekte gefunden</div>
      <div className="space-y-3">
        {filtered.map(obj => (
          <div key={obj.id} className="bg-card rounded-2xl p-4 shadow-card border border-border hover:shadow-card-hover transition-all">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                <MapPin size={22} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{obj.adresse}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin size={10} />{obj.bezirk}</p>
                  </div>
                  <button onClick={() => setFavs(f => f.includes(obj.id) ? f.filter(x => x !== obj.id) : [...f, obj.id])}>
                    <Heart size={18} className={favs.includes(obj.id) || obj.favorit ? "text-primary fill-primary" : "text-muted-foreground"} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BedDouble size={11} />{obj.zimmer} Zi.</span>
                  <span className="flex items-center gap-1"><Maximize2 size={11} />{obj.flaeche}m²</span>
                  <span className="font-bold text-primary">{obj.preis}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[obj.status]}`}>{obj.status}</span>
                  <span className="text-xs text-muted-foreground">{obj.typ}</span>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">{obj.id}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
