import { ShoppingCart, Package, ChevronRight, Plus, Tag, Truck } from "lucide-react";

const produkte = [
  { name: "Exposé Premium Druck A4", preis: "€ 4,90", einheit: "je Seite", kategorie: "Druck", icon: "📄", bestand: 150 },
  { name: "Schlüsselbund-Etiketten", preis: "€ 12,00", einheit: "100 Stk.", kategorie: "Büro", icon: "🔑", bestand: 45 },
  { name: "Besichtigungs-Mappen A4", preis: "€ 28,50", einheit: "50 Stk.", kategorie: "Druck", icon: "📁", bestand: 8 },
  { name: "ImmoExpress Visitenkarten", preis: "€ 35,00", einheit: "250 Stk.", kategorie: "Marketing", icon: "💼", bestand: 200 },
  { name: "Grundriss-Stempel Set", preis: "€ 18,00", einheit: "Set", kategorie: "Büro", icon: "📐", bestand: 22 },
  { name: "Immobilien-Schilder Wien", preis: "€ 45,00", einheit: "je Stück", kategorie: "Marketing", icon: "🏠", bestand: 5 },
];

const kategorien = ["Alle", "Druck", "Marketing", "Büro"];

export default function Bestellung() {
  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bestellung</h1>
          <p className="text-muted-foreground text-sm">Materialien & Druckerzeugnisse</p>
        </div>
        <button className="relative p-2.5 rounded-xl bg-card border border-border shadow-card hover:bg-accent transition-colors">
          <ShoppingCart size={20} className="text-primary" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">0</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {kategorien.map(k => (
          <button key={k} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${k === "Alle" ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
            {k}
          </button>
        ))}
      </div>

      {/* Schnelllieferung Banner */}
      <div className="bg-accent rounded-2xl p-4 border border-primary/20 mb-5 flex items-center gap-3">
        <Truck size={20} className="text-primary flex-shrink-0" />
        <div>
          <p className="font-bold text-foreground text-sm">Expresslieferung Wien &amp; Bundesländer</p>
          <p className="text-xs text-muted-foreground">Bestellung bis 12:00 Uhr → Lieferung Werktag</p>
        </div>
      </div>

      {/* Produkte */}
      <div className="space-y-3">
        {produkte.map((p, i) => (
          <div key={i} className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center gap-4 hover:shadow-card-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl flex-shrink-0">
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{p.einheit}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.bestand < 10 ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-700"}`}>
                  {p.bestand < 10 ? "⚠ Niedrig" : "✓ Verfügbar"}
                </span>
              </div>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{p.kategorie}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-primary text-base">{p.preis}</div>
              <button className="mt-1.5 flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold shadow-orange-sm hover:bg-primary-dark transition-all active:scale-95">
                <Plus size={12} /> In Korb
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
