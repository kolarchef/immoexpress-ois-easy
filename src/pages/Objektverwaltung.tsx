import { useState, useEffect } from "react";
import { Search, Plus, Heart, MapPin, BedDouble, Maximize2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ObjektModal from "@/components/ObjektModal";

type Objekt = {
  id: string;
  objektnummer: string | null;
  objektart: string | null;
  ort: string | null;
  strasse: string | null;
  hnr: string | null;
  plz: string | null;
  zimmer: number | null;
  flaeche_m2: number | null;
  kaufpreis: number | null;
  status: string | null;
  verkaufsart: string | null;
  beschreibung: string | null;
};

type Interessent = { id: string; name: string; typ: string | null };

const statusStyle: Record<string, string> = {
  aktiv: "bg-green-500 text-white",
  reserviert: "bg-amber-500 text-white",
  verkauft: "bg-muted-foreground text-white",
  vermietet: "bg-muted-foreground text-white",
};

const filterTypen = ["Alle", "Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Grundstück", "Zinshaus"];

export default function Objektverwaltung() {
  const { user } = useAuth();
  const [objekte, setObjekte] = useState<Objekt[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [showModal, setShowModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [interessenten, setInteressenten] = useState<Interessent[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("objekte").select("*").order("created_at", { ascending: false });
    if (data) setObjekte(data);
  };

  useEffect(() => { load(); }, [user]);

  const loadInteressenten = async (objektId: string) => {
    const { data } = await supabase.from("crm_kunden").select("id, name, typ").eq("objekt_id", objektId);
    if (data) setInteressenten(data);
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    loadInteressenten(id);
  };

  const filtered = objekte.filter(o =>
    (filter === "Alle" || o.objektart === filter) &&
    ((o.strasse || "").toLowerCase().includes(search.toLowerCase()) ||
     (o.ort || "").toLowerCase().includes(search.toLowerCase()) ||
     (o.objektnummer || "").toLowerCase().includes(search.toLowerCase()))
  );

  const detailObj = objekte.find(o => o.id === detailId);

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objektverwaltung</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{objekte.length} Objekte</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm shadow-orange hover:bg-primary-dark transition-all active:scale-95">
          <Plus size={16} /> Neues Objekt
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Adresse, PLZ oder Objektnummer…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {filterTypen.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === t ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Keine Objekte gefunden.</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-primary font-semibold text-sm hover:underline">+ Erstes Objekt anlegen</button>
          </div>
        )}
        {filtered.map(obj => (
          <div key={obj.id} onClick={() => openDetail(obj.id)} className="bg-card rounded-2xl shadow-card border border-border p-4 hover:shadow-card-hover transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-foreground text-sm">{obj.strasse ? `${obj.strasse} ${obj.hnr || ""}` : obj.objektart}{obj.ort ? `, ${obj.plz || ""} ${obj.ort}` : ""}</h3>
                <span className="text-xs text-muted-foreground font-mono">{obj.objektnummer}</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusStyle[obj.status || "aktiv"] || "bg-muted text-muted-foreground"}`}>{(obj.status || "aktiv").toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {obj.objektart && <span><MapPin size={11} className="inline mr-0.5" />{obj.objektart}</span>}
              {obj.zimmer && <span><BedDouble size={11} className="inline mr-0.5" />{obj.zimmer} Zi.</span>}
              {obj.flaeche_m2 && <span><Maximize2 size={11} className="inline mr-0.5" />{obj.flaeche_m2}m²</span>}
              {obj.kaufpreis && <span className="font-bold text-primary">€{Number(obj.kaufpreis).toLocaleString("de-AT")}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Detail with Interessenten */}
      {detailObj && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setDetailId(null)}>
          <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{detailObj.strasse ? `${detailObj.strasse} ${detailObj.hnr || ""}` : detailObj.objektart}</h2>
              <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-accent"><span className="text-muted-foreground">✕</span></button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Objektnummer</span><span className="font-semibold">{detailObj.objektnummer || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Art</span><span className="font-semibold">{detailObj.objektart}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fläche</span><span className="font-semibold">{detailObj.flaeche_m2 ? `${detailObj.flaeche_m2} m²` : "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Preis</span><span className="font-bold text-primary">{detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "auf Anfrage"}</span></div>
              {detailObj.beschreibung && <p className="text-muted-foreground text-xs pt-2 border-t border-border">{detailObj.beschreibung}</p>}
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-3"><Users size={15} className="text-primary" /> Interessenten</h3>
              {interessenten.length === 0 ? (
                <p className="text-xs text-muted-foreground">Noch keine Kunden diesem Objekt zugewiesen. Zuweisung erfolgt im CRM.</p>
              ) : (
                <div className="space-y-2">
                  {interessenten.map(k => (
                    <div key={k.id} className="flex items-center gap-2 p-2 bg-accent rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">{k.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{k.name}</p>
                        <p className="text-xs text-muted-foreground">{k.typ}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ObjektModal open={showModal} onClose={() => setShowModal(false)} onSaved={load} />
    </div>
  );
}
