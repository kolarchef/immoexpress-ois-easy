import { useState, useEffect } from "react";
import { Search, Building2, Users, Calendar, ShoppingCart, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type Kategorie = "Alle" | "Objekte" | "Partner" | "Meetings" | "Bestellungen" | "Aufgaben";

interface SearchResult {
  id: string;
  kategorie: Kategorie;
  titel: string;
  untertitel: string;
  extra?: string;
}

const kategorien: { label: Kategorie; icon: any }[] = [
  { label: "Alle", icon: Search },
  { label: "Objekte", icon: Building2 },
  { label: "Partner", icon: Users },
  { label: "Meetings", icon: Calendar },
  { label: "Bestellungen", icon: ShoppingCart },
  { label: "Aufgaben", icon: ClipboardList },
];

const kategorieBadgeStyle: Record<string, string> = {
  Objekte: "bg-primary/15 text-primary",
  Partner: "bg-accent text-accent-foreground",
  Meetings: "bg-secondary text-secondary-foreground",
  Bestellungen: "bg-destructive/15 text-destructive",
  Aufgaben: "bg-muted text-muted-foreground",
};

export default function Suche() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [kat, setKat] = useState<Kategorie>("Alle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!user || q.trim().length < 2) { setResults([]); return; }
    const timeout = setTimeout(() => runSearch(q.trim()), 350);
    return () => clearTimeout(timeout);
  }, [q, user, isAdmin]);

  const runSearch = async (query: string) => {
    setLoading(true);
    const lower = query.toLowerCase();
    const all: SearchResult[] = [];

    // 1. Objekte
    try {
      const { data: objekte } = await supabase
        .from("objekte")
        .select("id, objektnummer, strasse, hnr, plz, ort, objektart, status, kaufpreis")
        .or(`strasse.ilike.%${lower}%,ort.ilike.%${lower}%,objektnummer.ilike.%${lower}%,plz.ilike.%${lower}%`)
        .limit(20);
      if (objekte) {
        objekte.forEach((o: any) => all.push({
          id: o.id, kategorie: "Objekte",
          titel: `${o.strasse || ""} ${o.hnr || ""}, ${o.plz || ""} ${o.ort || ""}`.trim(),
          untertitel: `${o.objektart || "Immobilie"} · ${o.status || ""}`,
          extra: o.kaufpreis ? `€${Number(o.kaufpreis).toLocaleString("de-AT")}` : undefined,
        }));
      }
    } catch {}

    // 2. Geschäftspartner (admin only via RLS)
    try {
      const { data: gps } = await supabase
        .from("geschaeftspartner")
        .select("id, name, gp_number, status, email, phone")
        .or(`name.ilike.%${lower}%,gp_number.ilike.%${lower}%,email.ilike.%${lower}%`)
        .limit(20);
      if (gps) {
        gps.forEach((g: any) => all.push({
          id: g.id, kategorie: "Partner",
          titel: g.name,
          untertitel: `GP-${g.gp_number || "?"} · ${g.status}`,
          extra: g.email || undefined,
        }));
      }
    } catch {}

    // 3. Meetings (RLS filters by zielgruppe)
    try {
      const { data: meetings } = await supabase
        .from("meetings" as any)
        .select("id, titel, datum, zielgruppe, ergebnisse_text, ergebnisse_verfuegbar")
        .or(`titel.ilike.%${lower}%,ergebnisse_text.ilike.%${lower}%`)
        .limit(20);
      if (meetings) {
        (meetings as any[]).forEach((m: any) => all.push({
          id: m.id, kategorie: "Meetings",
          titel: m.titel,
          untertitel: `${new Date(m.datum).toLocaleDateString("de-AT")} · ${m.zielgruppe === "alle" ? "Alle" : m.zielgruppe}`,
          extra: m.ergebnisse_verfuegbar ? "Ergebnisse ✓" : undefined,
        }));
      }
    } catch {}

    // 4. Bestellungen (admin sees all, user sees own via RLS)
    try {
      const { data: bestellungen } = await supabase
        .from("bestellungen")
        .select("id, produkt, status, menge, created_at")
        .or(`produkt.ilike.%${lower}%,status.ilike.%${lower}%`)
        .limit(20);
      if (bestellungen) {
        bestellungen.forEach((b: any) => all.push({
          id: b.id, kategorie: "Bestellungen",
          titel: b.produkt,
          untertitel: `Status: ${b.status} · Menge: ${b.menge}`,
          extra: new Date(b.created_at).toLocaleDateString("de-AT"),
        }));
      }
    } catch {}

    // 5. Aufgaben
    try {
      const { data: aufgaben } = await supabase
        .from("aufgaben" as any)
        .select("id, titel, status, gp_nummer, faellig_am")
        .or(`titel.ilike.%${lower}%,gp_nummer.ilike.%${lower}%`)
        .limit(20);
      if (aufgaben) {
        (aufgaben as any[]).forEach((a: any) => all.push({
          id: a.id, kategorie: "Aufgaben",
          titel: a.titel,
          untertitel: `Status: ${a.status}${a.gp_nummer ? ` · GP-${a.gp_nummer}` : ""}`,
          extra: a.faellig_am ? new Date(a.faellig_am).toLocaleDateString("de-AT") : undefined,
        }));
      }
    } catch {}

    setResults(all);
    setLoading(false);
  };

  const filtered = kat === "Alle" ? results : results.filter(r => r.kategorie === kat);

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto" style={{ paddingBottom: 200 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Globale Suche</h1>
        <p className="text-muted-foreground text-sm">Objekte, Partner, Meetings, Bestellungen & Aufgaben durchsuchen</p>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Suchbegriff eingeben (mind. 2 Zeichen)…"
          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {kategorien.map(k => (
          <button
            key={k.label}
            onClick={() => setKat(k.label)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              kat === k.label ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:bg-accent"
            }`}
          >
            <k.icon size={14} /> {k.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 size={18} className="animate-spin" /> Suche läuft…
        </div>
      ) : q.trim().length < 2 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Gib mindestens 2 Zeichen ein, um zu suchen
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Keine Ergebnisse für „{q}"
        </div>
      ) : (
        <>
          <div className="mb-2 text-xs text-muted-foreground font-medium">{filtered.length} Ergebnis{filtered.length !== 1 ? "se" : ""} gefunden</div>
          <div className="space-y-2">
            {filtered.map(r => (
              <div key={`${r.kategorie}-${r.id}`} className="bg-card rounded-2xl p-4 shadow-sm border border-border hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className={`text-[10px] border-0 ${kategorieBadgeStyle[r.kategorie] || ""}`}>
                        {r.kategorie}
                      </Badge>
                      {r.extra && (
                        <span className="text-xs font-semibold text-primary">{r.extra}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{r.titel}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.untertitel}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
