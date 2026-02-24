import { useState, useEffect } from "react";
import { Search, Plus, Phone, Mail, MessageCircle, MapPin, Star, Filter, X, Calendar, Home, Key, FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import CrmDetailModal from "@/components/CrmDetailModal";

const kunden = [
  {
    id: 1, name: "Maria Huber", email: "m.huber@email.at", phone: "+43 664 123 4567",
    typ: "Käufer", ort: "Wien 1010", budget: "€650.000", status: "Aktiv", sterne: 5,
    notiz: "Sucht 4-Zimmer-Wohnung, Alleinvermittlung bevorzugt",
    geburtsdatum: "1982-03-15", kaufdatum: "2024-06-01", einzugsdatum: "2024-07-15",
  },
  {
    id: 2, name: "Thomas Müller", email: "t.mueller@firma.at", phone: "+43 676 987 6543",
    typ: "Verkäufer", ort: "Wien 1030", budget: "€420.000", status: "Aktiv", sterne: 4,
    notiz: "Verkauf Eigentumswohnung, flexibel bei Übergabe",
    geburtsdatum: "1975-11-28", kaufdatum: "2023-09-10", einzugsdatum: "2023-11-01",
  },
  {
    id: 3, name: "Anna Schmidt", email: "a.schmidt@web.at", phone: "+43 699 555 1234",
    typ: "Mieter", ort: "Graz", budget: "€1.800/Mon", status: "In Bearbeitung", sterne: 3,
    notiz: "Sucht Bürofläche 120m², Nähe Graz-Hauptbahnhof",
    geburtsdatum: "1990-07-04", kaufdatum: "2025-01-15", einzugsdatum: "2025-02-01",
  },
  {
    id: 4, name: "Karl Bauer", email: "k.bauer@outlook.at", phone: "+43 660 321 7890",
    typ: "Investor", ort: "Salzburg", budget: "€1.2M", status: "Aktiv", sterne: 5,
    notiz: "Anlageimmobilien, Rendite min. 4%, Nebenkostenübersicht angefordert",
    geburtsdatum: "1968-12-25", kaufdatum: "2022-04-20", einzugsdatum: "2022-06-01",
  },
  {
    id: 5, name: "Sandra Lehner", email: "s.lehner@gmx.at", phone: "+43 650 444 8888",
    typ: "Käufer", ort: "Linz", budget: "€280.000", status: "Neu", sterne: 4,
    notiz: "Erstmals Kaufinteressentin, Finanzamt-Gebühren klären",
    geburtsdatum: "1995-05-20", kaufdatum: "", einzugsdatum: "",
  },
  {
    id: 6, name: "Peter Wimmer", email: "p.wimmer@aon.at", phone: "+43 664 777 2222",
    typ: "Verkäufer", ort: "Wien 1180", budget: "€890.000", status: "Aktiv", sterne: 5,
    notiz: "Einfamilienhaus, Alleinvermittlungsvertrag unterschrieben",
    geburtsdatum: "1970-08-10", kaufdatum: "2021-12-01", einzugsdatum: "2022-02-15",
  },
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

function formatDate(dateStr: string) {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Kunde = typeof kunden[0];

export default function CRM() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Kunde | null>(null);
  const [editDates, setEditDates] = useState(false);
  const [editedDates, setEditedDates] = useState({ geburtsdatum: "", kaufdatum: "", einzugsdatum: "" });
  const [detailTab, setDetailTab] = useState<"info" | "dokumente">("info");

  const [newForm, setNewForm] = useState({
    vorname: "", nachname: "", phone: "", email: "", typ: "Käufer",
    notiz: "", zustaendigkeit: "Vertriebsteam Wien",
    geburtsdatum: "", kaufdatum: "", einzugsdatum: "", dsgvo: false,
    objekt_id: "",
  });

  const [objekte, setObjekte] = useState<{ id: string; objektnummer: string | null; objektart: string | null; ort: string | null }[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      supabase.from("objekte").select("id, objektnummer, objektart, ort").then(({ data }) => {
        if (data) setObjekte(data);
      });
    }
  }, [user]);

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
                {/* Datums-Chips */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {k.geburtsdatum && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                      <Calendar size={10} /> GEB {formatDate(k.geburtsdatum)}
                    </span>
                  )}
                  {k.kaufdatum && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                      <Key size={10} /> KAUF {formatDate(k.kaufdatum)}
                    </span>
                  )}
                  {k.einzugsdatum && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                      <Home size={10} /> EINZUG {formatDate(k.einzugsdatum)}
                    </span>
                  )}
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
        <CrmDetailModal
          selected={selected}
          editDates={editDates}
          setEditDates={setEditDates}
          editedDates={editedDates}
          setEditedDates={setEditedDates}
          onClose={() => { setSelected(null); setEditDates(false); setDetailTab("info"); }}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          user={user}
        />
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
                  <input value={newForm.vorname} onChange={e => setNewForm({...newForm, vorname: e.target.value})} placeholder="z.B. Max" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nachname</label>
                  <input value={newForm.nachname} onChange={e => setNewForm({...newForm, nachname: e.target.value})} placeholder="Mustermann" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Mobiltelefon</label>
                <input value={newForm.phone} onChange={e => setNewForm({...newForm, phone: e.target.value})} placeholder="+43 664 123 4567" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">E-Mail Adresse</label>
                <input value={newForm.email} onChange={e => setNewForm({...newForm, email: e.target.value})} placeholder="name@beispiel.at" className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Typ</label>
                <select value={newForm.typ} onChange={e => setNewForm({...newForm, typ: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                  <option>Käufer</option><option>Verkäufer</option><option>Mieter</option><option>Investor</option>
                </select>
              </div>

              {/* Neue Datumsfelder */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5"><Calendar size={13} /> Wichtige Daten (Newsletter-Trigger)</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Geburtsdatum</label>
                    <input type="date" value={newForm.geburtsdatum} onChange={e => setNewForm({...newForm, geburtsdatum: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Kaufdatum / Mietdatum des Objekts</label>
                    <input type="date" value={newForm.kaufdatum} onChange={e => setNewForm({...newForm, kaufdatum: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Einzugsdatum</label>
                    <input type="date" value={newForm.einzugsdatum} onChange={e => setNewForm({...newForm, einzugsdatum: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Objekt zuweisen (optional)</label>
                <select value={newForm.objekt_id} onChange={e => setNewForm({...newForm, objekt_id: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                  <option value="">Kein Objekt</option>
                  {objekte.map(o => (
                    <option key={o.id} value={o.id}>{o.objektnummer || "–"} · {o.objektart} · {o.ort || ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Notizen & Details</label>
                <textarea rows={3} value={newForm.notiz} onChange={e => setNewForm({...newForm, notiz: e.target.value})} placeholder="Interessen, Budget, Suchprofil..." className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Zuständigkeit</label>
                <select value={newForm.zustaendigkeit} onChange={e => setNewForm({...newForm, zustaendigkeit: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                  <option>Vertriebsteam Wien</option><option>Vertriebsteam Ost</option><option>Vertriebsteam West</option>
                </select>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={newForm.dsgvo} onChange={e => setNewForm({...newForm, dsgvo: e.target.checked})} className="mt-0.5 accent-primary" />
                <span className="text-xs text-muted-foreground">Ich bestätige die Datenschutzerklärung und die Einwilligung zur werblichen Kontaktaufnahme gemäß DSGVO.</span>
              </label>
              <button disabled={!newForm.dsgvo} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-orange hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50">
                Kunden anlegen &amp; zuweisen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
