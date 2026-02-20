import { useState } from "react";
import { Search, Plus, Key, FolderOpen, Heart, Share2, MapPin, BedDouble, Maximize2 } from "lucide-react";

const objekte = [
  { id: "IM-2024-001", adresse: "Schubertring 6, 1010 Wien", bezirk: "Innere Stadt", zimmer: 4, flaeche: 145, preis: "€850.000", typ: "Wohnung", status: "VERFÜGBAR", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=250&fit=crop", favorit: true },
  { id: "IM-2024-002", adresse: "Kärntner Ring 8, 1010 Wien", bezirk: "Innere Stadt", zimmer: 5, flaeche: 220, preis: "€1.800.000", typ: "Penthouse", status: "RESERVIERT", img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=250&fit=crop", favorit: false },
  { id: "IM-2024-003", adresse: "Mariahilfer Str. 45, 1060 Wien", bezirk: "Mariahilf", zimmer: 3, flaeche: 98, preis: "€1.950/Mon", typ: "Wohnung", status: "VERMIETET", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop", favorit: false },
  { id: "IM-2024-004", adresse: "Währinger Str. 120, 1180 Wien", bezirk: "Währing", zimmer: 6, flaeche: 310, preis: "€1.250.000", typ: "Haus", status: "VERFÜGBAR", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=250&fit=crop", favorit: true },
];

const statusStyle: Record<string, string> = {
  "VERFÜGBAR": "bg-green-500 text-white",
  "RESERVIERT": "bg-amber-500 text-white",
  "VERMIETET": "bg-muted-foreground text-white",
};

const filterTypen = ["Alle", "Wohnung", "Haus", "Penthouse", "Gewerbe"];

export default function Objektverwaltung() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Alle");

  const filtered = objekte.filter(o =>
    (filter === "Alle" || o.typ === filter) &&
    (o.adresse.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search))
  );

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objektverwaltung</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{objekte.length} von 128 Objekten geladen</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm shadow-orange hover:bg-primary-dark transition-all active:scale-95">
          <Plus size={16} /> Neues Objekt
        </button>
      </div>

      {/* Suche */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Adresse, PLZ oder ID suchen..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {filterTypen.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === t ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Objekt-Karten */}
      <div className="space-y-4">
        {filtered.map((obj) => (
          <div key={obj.id} className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-card-hover transition-all duration-200">
            {/* Bild */}
            <div className="relative">
              <img src={obj.img} alt={obj.adresse} className="w-full h-44 object-cover" />
              <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-lg ${statusStyle[obj.status]}`}>{obj.status}</span>
              <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                <Heart size={15} className={obj.favorit ? "text-primary fill-primary" : "text-muted-foreground"} />
              </button>
              <span className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm text-xs font-mono text-muted-foreground px-2 py-1 rounded-lg">{obj.id}</span>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-foreground text-sm leading-tight">{obj.adresse}</h3>
                <span className="font-bold text-primary text-sm flex-shrink-0">{obj.preis}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><MapPin size={11} />{obj.bezirk}</span>
                <span className="flex items-center gap-1"><BedDouble size={11} />{obj.zimmer} Zi.</span>
                <span className="flex items-center gap-1"><Maximize2 size={11} />{obj.flaeche}m²</span>
              </div>

              {/* Aktionen */}
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-bold shadow-orange-sm hover:bg-primary-dark transition-all active:scale-95">
                  <Key size={13} /> SCHLÜSSEL
                </button>
                <button className="flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-2.5 rounded-xl text-xs font-bold border border-border hover:bg-secondary transition-all active:scale-95">
                  <FolderOpen size={13} /> DOCS
                </button>
                <button className="flex items-center justify-center bg-accent text-accent-foreground px-3 py-2.5 rounded-xl border border-border hover:bg-secondary transition-all active:scale-95">
                  <Share2 size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6 py-2">{filtered.length} von {objekte.length} Objekten angezeigt</p>
    </div>
  );
}
