import { useState } from "react";
import { Search, Plus, Phone, Mail, MessageCircle, MapPin, Star, Filter, X } from "lucide-react";

const kunden = [
  { id: 1, name: "Maria Huber", email: "m.huber@email.at", phone: "+43 664 123 4567", typ: "Käufer", ort: "Wien 1010", budget: "€650.000", status: "Aktiv", sterne: 5, notiz: "Sucht 4-Zimmer-Wohnung, Alleinvermittlung bevorzugt" },
  { id: 2, name: "Thomas Müller", email: "t.mueller@firma.at", phone: "+43 676 987 6543", typ: "Verkäufer", ort: "Wien 1030", budget: "€420.000", status: "Aktiv", sterne: 4, notiz: "Verkauf Eigentumswohnung, flexibel bei Übergabe" },
  { id: 3, name: "Anna Schmidt", email: "a.schmidt@web.at", phone: "+43 699 555 1234", typ: "Mieter", ort: "Graz", budget: "€1.800/Mon", status: "In Bearbeitung", sterne: 3, notiz: "Sucht Bürofläche 120m², Nähe Graz-Hauptbahnhof" },
  { id: 4, name: "Karl Bauer", email: "k.bauer@outlook.at", phone: "+43 660 321 7890", typ: "Investor", ort: "Salzburg", budget: "€1.2M", status: "Aktiv", sterne: 5, notiz: "Anlageimmobilien, Rendite min. 4%, Nebenkostenübersicht angefordert" },
  { id: 5, name: "Sandra Lehner", email: "s.lehner@gmx.at", phone: "+43 650 444 8888", typ: "Käufer", ort: "Linz", budget: "€280.000", status: "Neu", sterne: 4, notiz: "Erstmals Kaufinteressentin, Finanzamt-Gebühren klären" },
  { id: 6, name: "Peter Wimmer", email: "p.wimmer@aon.at", phone: "+43 664 777 2222", typ: "Verkäufer", ort: "Wien 1180", budget: "€890.000", status: "Aktiv", sterne: 5, notiz: "Einfamilienhaus, Alleinvermittlungsvertrag unterschrieben" },
];

const statusColors: Record<string, string> = {
  "Aktiv": "bg-green-100 text-green-700",
  "Neu": "bg-blue-100 text-blue-700",
  "In Bearbeitung": "bg-primary-light text-primary",
};

const typColors: Record<string, string> = {
  "Käufer": "bg-blue-50 text-blue-600",
  "Verkäufer": "bg-purple-50 text-purple-600",
  "Mieter": "bg-green-50 text-green-600",
  "Investor": "bg-amber-50 text-amber-600",
};

export default function CRM() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<typeof kunden[0] | null>(null);

  const filtered = kunden.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.ort.toLowerCase().includes(search.toLowerCase()) ||
    k.typ.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Kunden</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{kunden.length} Kontakte · Wien & Bundesländer</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm shadow-orange hover:bg-primary-dark transition-all active:scale-95"
        >
          <Plus size={16} /> Neu anlegen
        </button>
      </div>

      {/* Suche & Filter */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, Ort oder Typ suchen..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
          <Filter size={15} /> Filter
        </button>
      </div>

      {/* Kunden-Karten */}
      <div className="space-y-3">
        {filtered.map((k) => (
          <div key={k.id} className="bg-card rounded-2xl p-4 shadow-card border border-border hover:shadow-card-hover transition-all duration-200 cursor-pointer" onClick={() => setSelected(k)}>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-orange-sm text-primary-foreground font-bold text-lg">
                {k.name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground">{k.name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typColors[k.typ]}`}>{k.typ}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[k.status]}`}>{k.status}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < k.sterne ? "text-primary fill-primary" : "text-muted"} />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} />{k.ort}</span>
                  <span className="text-xs font-semibold text-primary">{k.budget}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{k.notiz}</p>
              </div>
            </div>

            {/* Schnellwahl-Buttons */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
              <a
                href={`https://wa.me/${k.phone.replace(/\s+/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white py-2 rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors active:scale-95"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a
                href={`tel:${k.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-xl text-xs font-semibold shadow-orange-sm hover:bg-primary-dark transition-colors active:scale-95"
              >
                <Phone size={14} /> Anrufen
              </a>
              <a
                href={`mailto:${k.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-accent-foreground py-2 rounded-xl text-xs font-semibold border border-border hover:bg-secondary transition-colors active:scale-95"
              >
                <Mail size={14} /> E-Mail
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-accent transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Typ</span><span className="font-semibold">{selected.typ}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ort</span><span className="font-semibold">{selected.ort}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-bold text-primary">{selected.budget}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{selected.status}</span></div>
              <div className="pt-2 border-t border-border"><span className="text-muted-foreground block mb-1">Notizen</span><p className="text-foreground">{selected.notiz}</p></div>
            </div>
            <div className="flex gap-2 mt-4">
              <a href={`tel:${selected.phone}`} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold text-center shadow-orange hover:bg-primary-dark transition-colors">
                Anrufen
              </a>
              <a href={`mailto:${selected.email}`} className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold text-center border border-border hover:bg-secondary transition-colors">
                E-Mail
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Neu-Anlegen Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Kunden-Neuanlage</h2>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-xl hover:bg-accent transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Vorname</label>
                  <input placeholder="z.B. Max" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nachname</label>
                  <input placeholder="Mustermann" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Mobiltelefon</label>
                <input placeholder="+43 664 123 4567" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">E-Mail Adresse</label>
                <input placeholder="name@beispiel.at" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Typ</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                  <option>Käufer</option><option>Verkäufer</option><option>Mieter</option><option>Investor</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Notizen & Details</label>
                <textarea rows={3} placeholder="Interessen, Budget, Suchprofil..." className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Zuständigkeit</label>
                <select className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                  <option>Vertriebsteam Wien</option><option>Vertriebsteam Ost</option><option>Vertriebsteam West</option>
                </select>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-primary" />
                <span className="text-xs text-muted-foreground">Ich bestätige die Datenschutzerklärung und die Einwilligung zur werblichen Kontaktaufnahme gemäß DSGVO.</span>
              </label>
              <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-orange hover:bg-primary-dark transition-all active:scale-95">
                Kunden anlegen &amp; zuweisen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
