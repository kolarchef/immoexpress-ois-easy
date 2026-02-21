import { useState, useEffect } from "react";
import { Search, Plus, MapPin, BedDouble, Maximize2, Users, Send, MessageCircle, Phone, Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ObjektModal from "@/components/ObjektModal";
import { Input } from "@/components/ui/input";

type Objekt = {
  id: string;
  objektnummer: string | null;
  objektart: string | null;
  ort: string | null;
  strasse: string | null;
  hnr: string | null;
  plz: string | null;
  top: string | null;
  stock: string | null;
  zimmer: number | null;
  flaeche_m2: number | null;
  kaufpreis: number | null;
  status: string | null;
  verkaufsart: string | null;
  beschreibung: string | null;
  interne_notizen: string | null;
  kaeufer_provision: number | null;
  verkaeufer_provision: number | null;
  kurzinfo: string | null;
};

type Interessent = { id: string; name: string; typ: string | null; email: string | null; phone: string | null };

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
  const [photos, setPhotos] = useState<string[]>([]);

  // Exposé send
  const [showExposeSend, setShowExposeSend] = useState(false);
  const [kundenList, setKundenList] = useState<Interessent[]>([]);
  const [kundenSearch, setKundenSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("objekte").select("*").order("created_at", { ascending: false });
    if (data) setObjekte(data as Objekt[]);
  };

  useEffect(() => { load(); }, [user]);

  const loadInteressenten = async (objektId: string) => {
    const { data } = await supabase.from("crm_kunden").select("id, name, typ, email, phone").eq("objekt_id", objektId);
    if (data) setInteressenten(data);
  };

  const loadPhotos = async (objektId: string) => {
    const { data } = await supabase.storage.from("objekt-fotos").list(objektId);
    if (data && data.length > 0) {
      const urls = data.map(f => {
        const { data: urlData } = supabase.storage.from("objekt-fotos").getPublicUrl(`${objektId}/${f.name}`);
        return urlData.publicUrl;
      });
      setPhotos(urls);
    } else {
      setPhotos([]);
    }
  };

  const loadAllKunden = async () => {
    const { data } = await supabase.from("crm_kunden").select("id, name, typ, email, phone");
    if (data) setKundenList(data);
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    loadInteressenten(id);
    loadPhotos(id);
  };

  const sendExpose = (kunde: Interessent, obj: Objekt) => {
    const text = `📋 Exposé: ${obj.kurzinfo || obj.objektart || "Immobilie"}\n\n📍 ${obj.strasse || ""} ${obj.hnr || ""}, ${obj.plz || ""} ${obj.ort || ""}\n🏠 ${obj.objektart} · ${obj.flaeche_m2 || "–"} m² · ${obj.zimmer || "–"} Zi.\n💰 €${obj.kaufpreis ? Number(obj.kaufpreis).toLocaleString("de-AT") : "auf Anfrage"}\n\nBei Interesse bitte melden!\nImmoExpress`;
    if (kunde.phone) {
      const phone = kunde.phone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    } else if (kunde.email) {
      window.open(`mailto:${kunde.email}?subject=${encodeURIComponent(`Exposé: ${obj.kurzinfo || obj.objektart}`)}&body=${encodeURIComponent(text)}`, "_blank");
    }
    setShowExposeSend(false);
  };

  const filtered = objekte.filter(o =>
    (filter === "Alle" || o.objektart === filter) &&
    ((o.strasse || "").toLowerCase().includes(search.toLowerCase()) ||
     (o.ort || "").toLowerCase().includes(search.toLowerCase()) ||
     (o.objektnummer || "").toLowerCase().includes(search.toLowerCase()))
  );

  const detailObj = objekte.find(o => o.id === detailId);
  const filteredKunden = kundenList.filter(k => k.name.toLowerCase().includes(kundenSearch.toLowerCase()));

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

      {/* Detail Modal */}
      {detailObj && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => { setDetailId(null); setShowExposeSend(false); }}>
          <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{detailObj.strasse ? `${detailObj.strasse} ${detailObj.hnr || ""}` : detailObj.objektart}</h2>
              <button onClick={() => { setDetailId(null); setShowExposeSend(false); }} className="p-2 rounded-xl hover:bg-accent"><span className="text-muted-foreground">✕</span></button>
            </div>

            {/* Photos */}
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {photos.map((url, i) => (
                  <img key={i} src={url} alt={`Foto ${i+1}`} className="w-24 h-18 rounded-xl object-cover flex-shrink-0 border border-border" />
                ))}
              </div>
            )}

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Objektnummer</span><span className="font-semibold">{detailObj.objektnummer || "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Art</span><span className="font-semibold">{detailObj.objektart}</span></div>
              {detailObj.top && <div className="flex justify-between"><span className="text-muted-foreground">Top</span><span className="font-semibold">{detailObj.top}</span></div>}
              {detailObj.stock && <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className="font-semibold">{detailObj.stock}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Fläche</span><span className="font-semibold">{detailObj.flaeche_m2 ? `${detailObj.flaeche_m2} m²` : "–"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Preis</span><span className="font-bold text-primary">{detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "auf Anfrage"}</span></div>
              {detailObj.kaeufer_provision && <div className="flex justify-between"><span className="text-muted-foreground">Käufer-Provision</span><span className="font-semibold">{detailObj.kaeufer_provision}%</span></div>}
              {detailObj.verkaeufer_provision && <div className="flex justify-between"><span className="text-muted-foreground">Verkäufer-Provision</span><span className="font-semibold">{detailObj.verkaeufer_provision}%</span></div>}
              {detailObj.beschreibung && <p className="text-muted-foreground text-xs pt-2 border-t border-border">{detailObj.beschreibung}</p>}
              {detailObj.interne_notizen && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs font-bold text-amber-600">🔒 Interne Notizen</span>
                  <p className="text-xs text-muted-foreground mt-1">{detailObj.interne_notizen}</p>
                </div>
              )}
            </div>

            {/* Exposé senden Button */}
            <button
              onClick={() => { setShowExposeSend(true); loadAllKunden(); setKundenSearch(""); }}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-sm shadow-orange hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4"
            >
              <Send size={14} /> Exposé senden
            </button>

            {/* Exposé Send Panel */}
            {showExposeSend && (
              <div className="bg-accent rounded-xl p-3 mb-4 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Kunde suchen</label>
                <Input value={kundenSearch} onChange={e => setKundenSearch(e.target.value)} placeholder="Name eingeben…" />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredKunden.map(k => (
                    <div key={k.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{k.name}</p>
                        <p className="text-xs text-muted-foreground">{k.typ}</p>
                      </div>
                      <div className="flex gap-1">
                        {k.phone && (
                          <button onClick={() => sendExpose(k, detailObj)} className="bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                            <MessageCircle size={11} /> WA
                          </button>
                        )}
                        {k.email && (
                          <button onClick={() => { const kCopy = { ...k, phone: null }; sendExpose(kCopy, detailObj); }} className="bg-primary text-primary-foreground px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                            <Mail size={11} /> Mail
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredKunden.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Keine Kunden gefunden</p>}
                </div>
              </div>
            )}

            {/* Interessenten */}
            <div className="border-t border-border pt-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-3"><Users size={15} className="text-primary" /> Interessenten</h3>
              {interessenten.length === 0 ? (
                <p className="text-xs text-muted-foreground">Noch keine Kunden zugewiesen. Zuweisung im CRM.</p>
              ) : (
                <div className="space-y-2">
                  {interessenten.map(k => (
                    <div key={k.id} className="flex items-center gap-2 p-2 bg-accent rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">{k.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{k.name}</p>
                        <p className="text-xs text-muted-foreground">{k.typ}</p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {k.phone && <a href={`tel:${k.phone}`} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"><Phone size={12} className="text-primary" /></a>}
                        {k.email && <a href={`mailto:${k.email}`} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20"><Mail size={12} className="text-primary" /></a>}
                        {k.phone && <a href={`https://wa.me/${k.phone.replace(/[^0-9+]/g, "")}`} target="_blank" className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20"><MessageCircle size={12} className="text-green-600" /></a>}
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
