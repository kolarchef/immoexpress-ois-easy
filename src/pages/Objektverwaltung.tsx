import { useState, useEffect } from "react";
import { Search, Plus, MapPin, BedDouble, Maximize2, Users, Send, MessageCircle, Phone, Mail, X, Eye, Edit3, Clock, History, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ObjektModal from "@/components/ObjektModal";
import ExposePreviewModal from "@/components/ExposePreviewModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

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
  ki_text: string | null;
  created_at: string;
};

type Interessent = { id: string; name: string; typ: string | null; email: string | null; phone: string | null };
type HistorieEntry = { id: string; feld: string; alter_wert: string | null; neuer_wert: string | null; created_at: string };

const statusStyle: Record<string, string> = {
  aktiv: "bg-green-500 text-white",
  reserviert: "bg-amber-500 text-white",
  verkauft: "bg-muted-foreground text-white",
  vermietet: "bg-blue-500 text-white",
  deaktiviert: "bg-muted text-muted-foreground",
};

const statusTabs = [
  { value: "alle", label: "Alle" },
  { value: "aktiv", label: "🟢 Aktiv" },
  { value: "reserviert", label: "🟡 Reserviert" },
  { value: "verkauft", label: "🔴 Verkauft" },
  { value: "vermietet", label: "🔵 Vermietet" },
  { value: "deaktiviert", label: "⚫ Deaktiviert" },
];

const filterTypen = ["Alle", "Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Grundstück", "Zinshaus"];

function daysSince(dateStr: string) {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Objektverwaltung() {
  const { user } = useAuth();
  const [objekte, setObjekte] = useState<Objekt[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showModal, setShowModal] = useState(false);
  const [editObjekt, setEditObjekt] = useState<Objekt | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [interessenten, setInteressenten] = useState<Interessent[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [objPhotos, setObjPhotos] = useState<Record<string, string>>({});
  const [showExposePreview, setShowExposePreview] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "historie">("info");
  const [historie, setHistorie] = useState<HistorieEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("objekte").select("*").order("created_at", { ascending: false });
    if (data) {
      setObjekte(data as Objekt[]);
      loadObjektThumbnails(data as Objekt[]);
    }
  };

  const loadObjektThumbnails = async (objs: Objekt[]) => {
    const thumbs: Record<string, string> = {};
    for (const obj of objs.slice(0, 20)) {
      const { data: files } = await supabase.storage.from("objekt-fotos").list(obj.id, { limit: 1, sortBy: { column: "name", order: "asc" } });
      if (files && files.length > 0) {
        const { data: urlData } = supabase.storage.from("objekt-fotos").getPublicUrl(`${obj.id}/${files[0].name}`);
        thumbs[obj.id] = urlData.publicUrl;
      }
    }
    setObjPhotos(thumbs);
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

  const loadHistorie = async (objektId: string) => {
    const { data } = await supabase.from("objekt_historie").select("*").eq("objekt_id", objektId).order("created_at", { ascending: false });
    if (data) setHistorie(data as HistorieEntry[]);
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailTab("info");
    setEditing(false);
    loadInteressenten(id);
    loadPhotos(id);
    loadHistorie(id);
  };

  const changeStatus = async (objId: string, newStatus: string) => {
    if (!user) return;
    const obj = objekte.find(o => o.id === objId);
    if (!obj) return;
    const oldStatus = obj.status || "aktiv";
    await supabase.from("objekte").update({ status: newStatus }).eq("id", objId);
    await supabase.from("objekt_historie").insert({
      objekt_id: objId, user_id: user.id, feld: "status", alter_wert: oldStatus, neuer_wert: newStatus,
    });
    toast({ title: `Status → ${newStatus.toUpperCase()}` });
    load();
    if (detailId === objId) loadHistorie(objId);
  };

  const startEdit = (obj: Objekt) => {
    setEditing(true);
    setEditForm({
      kaufpreis: obj.kaufpreis?.toString() || "",
      kurzinfo: obj.kurzinfo || "",
      beschreibung: obj.beschreibung || "",
      interne_notizen: obj.interne_notizen || "",
      status: obj.status || "aktiv",
    });
  };

  const saveEdit = async () => {
    if (!user || !detailId) return;
    setSavingEdit(true);
    const obj = objekte.find(o => o.id === detailId);
    if (!obj) return;

    const changes: Array<{ feld: string; alter_wert: string | null; neuer_wert: string | null }> = [];
    const update: Record<string, unknown> = {};

    if (editForm.kaufpreis !== (obj.kaufpreis?.toString() || "")) {
      changes.push({ feld: "kaufpreis", alter_wert: obj.kaufpreis?.toString() || null, neuer_wert: editForm.kaufpreis || null });
      update.kaufpreis = editForm.kaufpreis ? parseFloat(editForm.kaufpreis) : null;
    }
    if (editForm.kurzinfo !== (obj.kurzinfo || "")) {
      changes.push({ feld: "kurzinfo", alter_wert: obj.kurzinfo, neuer_wert: editForm.kurzinfo || null });
      update.kurzinfo = editForm.kurzinfo || null;
    }
    if (editForm.beschreibung !== (obj.beschreibung || "")) {
      changes.push({ feld: "beschreibung", alter_wert: obj.beschreibung, neuer_wert: editForm.beschreibung || null });
      update.beschreibung = editForm.beschreibung || null;
    }
    if (editForm.interne_notizen !== (obj.interne_notizen || "")) {
      changes.push({ feld: "interne_notizen", alter_wert: obj.interne_notizen, neuer_wert: editForm.interne_notizen || null });
      update.interne_notizen = editForm.interne_notizen || null;
    }
    if (editForm.status !== (obj.status || "aktiv")) {
      changes.push({ feld: "status", alter_wert: obj.status, neuer_wert: editForm.status });
      update.status = editForm.status;
    }

    if (Object.keys(update).length > 0) {
      await supabase.from("objekte").update(update).eq("id", detailId);
      for (const c of changes) {
        await supabase.from("objekt_historie").insert({ objekt_id: detailId, user_id: user.id, ...c });
      }
      toast({ title: `✓ ${changes.length} Änderung(en) gespeichert` });
      load();
      loadHistorie(detailId);
    }
    setEditing(false);
    setSavingEdit(false);
  };

  const filtered = objekte.filter(o => {
    const matchType = filter === "Alle" || o.objektart === filter;
    const matchStatus = statusFilter === "alle" || (o.status || "aktiv") === statusFilter;
    const matchSearch = (o.strasse || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.ort || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.objektnummer || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const detailObj = objekte.find(o => o.id === detailId);

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objektverwaltung</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{objekte.length} Objekte</p>
        </div>
        <button onClick={() => { setEditObjekt(null); setShowModal(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm shadow-orange hover:bg-primary-dark transition-all active:scale-95">
          <Plus size={16} /> Neues Objekt
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Adresse, PLZ oder Objektnummer…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
      </div>

      {/* Status-Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="w-full flex overflow-x-auto scrollbar-hide bg-card border border-border rounded-xl p-1">
          {statusTabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs font-semibold whitespace-nowrap">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Typ-Filter */}
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
          <div key={obj.id} onClick={() => openDetail(obj.id)}
            className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-card-hover transition-all cursor-pointer">
            {objPhotos[obj.id] ? (
              <div className="relative h-40 w-full bg-muted">
                <img src={objPhotos[obj.id]} alt="" className="w-full h-full object-contain bg-muted" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="font-bold text-white text-sm drop-shadow">{obj.strasse ? `${obj.strasse} ${obj.hnr || ""}` : obj.objektart}{obj.ort ? `, ${obj.plz || ""} ${obj.ort}` : ""}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/80 font-mono">{obj.objektnummer}</span>
                    <button
                      onClick={e => { e.stopPropagation(); const statuses = ["aktiv","reserviert","verkauft","vermietet","deaktiviert"]; const idx = statuses.indexOf(obj.status || "aktiv"); changeStatus(obj.id, statuses[(idx + 1) % statuses.length]); }}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${statusStyle[obj.status || "aktiv"] || "bg-muted text-muted-foreground"}`}
                    >
                      {(obj.status || "aktiv").toUpperCase()}
                    </button>
                    <span className="text-[10px] text-white/70 flex items-center gap-0.5"><Clock size={9} /> {daysSince(obj.created_at)}d</span>
                  </div>
                </div>
                {obj.kaufpreis && <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg shadow">€{Number(obj.kaufpreis).toLocaleString("de-AT")}</span>}
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{obj.strasse ? `${obj.strasse} ${obj.hnr || ""}` : obj.objektart}{obj.ort ? `, ${obj.plz || ""} ${obj.ort}` : ""}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{obj.objektnummer}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock size={9} /> {daysSince(obj.created_at)}d</span>
                    <button
                      onClick={e => { e.stopPropagation(); const statuses = ["aktiv","reserviert","verkauft","vermietet","deaktiviert"]; const idx = statuses.indexOf(obj.status || "aktiv"); changeStatus(obj.id, statuses[(idx + 1) % statuses.length]); }}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-80 ${statusStyle[obj.status || "aktiv"] || "bg-muted text-muted-foreground"}`}
                    >
                      {(obj.status || "aktiv").toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground px-4 py-2.5 border-t border-border">
              {obj.objektart && <span><MapPin size={11} className="inline mr-0.5" />{obj.objektart}</span>}
              {obj.zimmer && <span><BedDouble size={11} className="inline mr-0.5" />{obj.zimmer} Zi.</span>}
              {obj.flaeche_m2 && <span><Maximize2 size={11} className="inline mr-0.5" />{obj.flaeche_m2}m²</span>}
              {!objPhotos[obj.id] && obj.kaufpreis && <span className="font-bold text-primary">€{Number(obj.kaufpreis).toLocaleString("de-AT")}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {detailObj && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setDetailId(null)}>
          <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{detailObj.strasse ? `${detailObj.strasse} ${detailObj.hnr || ""}` : detailObj.objektart}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(detailObj)} className="p-2 rounded-xl hover:bg-accent"><Edit3 size={16} className="text-primary" /></button>
                <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-accent"><X size={16} className="text-muted-foreground" /></button>
              </div>
            </div>

            {/* Seit X Tagen gelistet */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-accent rounded-lg px-3 py-2">
              <Clock size={12} className="text-primary" />
              <span>Seit <strong className="text-foreground">{daysSince(detailObj.created_at)} Tagen</strong> gelistet</span>
              {(detailObj.status === "verkauft" || detailObj.status === "vermietet") && (
                <span className="ml-auto text-primary font-semibold">{detailObj.status === "verkauft" ? "Verkauft" : "Vermietet"}</span>
              )}
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {photos.map((url, i) => (
                  <img key={i} src={url} alt={`Foto ${i+1}`} className="w-24 h-18 rounded-xl object-contain bg-muted flex-shrink-0 border border-border" />
                ))}
              </div>
            )}

            {/* Info / Historie Tabs */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setDetailTab("info")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${detailTab === "info" ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-foreground border-border"}`}>
                📋 Info
              </button>
              <button onClick={() => setDetailTab("historie")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${detailTab === "historie" ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-foreground border-border"}`}>
                <History size={12} className="inline mr-1" /> Historie
              </button>
            </div>

            {detailTab === "info" ? (
              <>
                {editing ? (
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                      <select className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                        {statusTabs.filter(s => s.value !== "alle").map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Kaufpreis €</label>
                      <input type="number" className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm" value={editForm.kaufpreis} onChange={e => setEditForm({ ...editForm, kaufpreis: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Kurzinfo</label>
                      <input className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm" value={editForm.kurzinfo} onChange={e => setEditForm({ ...editForm, kurzinfo: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Beschreibung</label>
                      <textarea className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm resize-none" rows={3} value={editForm.beschreibung} onChange={e => setEditForm({ ...editForm, beschreibung: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">🔒 Interne Notizen</label>
                      <textarea className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm resize-none bg-amber-50/50 dark:bg-amber-900/10" rows={2} value={editForm.interne_notizen} onChange={e => setEditForm({ ...editForm, interne_notizen: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-accent">Abbrechen</button>
                      <button onClick={saveEdit} disabled={savingEdit} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange flex items-center justify-center gap-2">
                        {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : null} Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between"><span className="text-muted-foreground">Objektnummer</span><span className="font-semibold">{detailObj.objektnummer || "–"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Art</span><span className="font-semibold">{detailObj.objektart}</span></div>
                    {detailObj.top && <div className="flex justify-between"><span className="text-muted-foreground">Top</span><span className="font-semibold">{detailObj.top}</span></div>}
                    {detailObj.stock && <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className="font-semibold">{detailObj.stock}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Fläche</span><span className="font-semibold">{detailObj.flaeche_m2 ? `${detailObj.flaeche_m2} m²` : "–"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Preis</span><span className="font-bold text-primary">{detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "auf Anfrage"}</span></div>
                    {detailObj.kaeufer_provision && <div className="flex justify-between"><span className="text-muted-foreground">Käufer-Provision</span><span className="font-semibold">{detailObj.kaeufer_provision}%</span></div>}
                    {detailObj.verkaeufer_provision && <div className="flex justify-between"><span className="text-muted-foreground">Verkäufer-Provision</span><span className="font-semibold">{detailObj.verkaeufer_provision}%</span></div>}
                    {detailObj.kurzinfo && <p className="text-muted-foreground text-xs pt-2 border-t border-border">{detailObj.kurzinfo}</p>}
                    {detailObj.beschreibung && <p className="text-muted-foreground text-xs pt-2 border-t border-border">{detailObj.beschreibung}</p>}
                    {detailObj.interne_notizen && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs font-bold text-amber-600">🔒 Interne Notizen</span>
                        <p className="text-xs text-muted-foreground mt-1">{detailObj.interne_notizen}</p>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => setShowExposePreview(true)}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-sm shadow-orange hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 mb-4">
                  <Eye size={14} /> Exposé Vorschau & Senden
                </button>

                <div className="border-t border-border pt-4">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-3"><Users size={15} className="text-primary" /> Interessenten</h3>
                  {interessenten.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Noch keine Kunden zugewiesen.</p>
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
              </>
            ) : (
              /* Historie Tab */
              <div className="space-y-2">
                {historie.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Noch keine Änderungen aufgezeichnet.</p>
                ) : historie.map(h => (
                  <div key={h.id} className="p-3 bg-accent rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground capitalize">{h.feld.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-destructive line-through">{h.alter_wert || "–"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-600 font-semibold">{h.neuer_wert || "–"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ObjektModal open={showModal} onClose={() => setShowModal(false)} onSaved={load} />

      {detailObj && (
        <ExposePreviewModal
          open={showExposePreview}
          onClose={() => setShowExposePreview(false)}
          data={{
            titel: detailObj.kurzinfo || detailObj.objektart || "Immobilie",
            objektnummer: detailObj.objektnummer || "",
            bezirk: detailObj.ort || "",
            objektart: detailObj.objektart || "",
            verkaufsart: detailObj.verkaufsart || "Kauf",
            flaeche: detailObj.flaeche_m2?.toString() || "",
            zimmer: detailObj.zimmer?.toString() || "",
            kaufpreis: detailObj.kaufpreis?.toString() || "",
            provisionsstellung: "Käufer",
            plz: detailObj.plz || "",
            strasse: detailObj.strasse || "",
            hnr: detailObj.hnr || "",
            aiText: detailObj.ki_text || detailObj.beschreibung || "",
            images: photos,
          }}
        />
      )}
    </div>
  );
}
