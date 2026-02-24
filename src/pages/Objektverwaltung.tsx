import { useState, useEffect, useRef } from "react";
import { Search, Plus, MapPin, BedDouble, Maximize2, Users, Send, MessageCircle, Phone, Mail, X, Eye, Edit3, Clock, History, RefreshCw, Sparkles, ChevronDown, Trash2, Save, Copy, FileText, Film, BarChart3, Share2, Download, ExternalLink, Wand2, Crop, Expand, Check, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ObjektModal from "@/components/ObjektModal";
import ExposePreviewModal from "@/components/ExposePreviewModal";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import VideoSlideshow from "@/components/VideoSlideshow";
import ObjektStatistiken from "@/components/ObjektStatistiken";
import AudioRecorder from "@/components/AudioRecorder";
import { sendAction } from "@/lib/sendAction";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

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
  immoz_exportiert: boolean | null;
  provisionsstellung: string | null;
};

type Interessent = { id: string; name: string; typ: string | null; email: string | null; phone: string | null };
type HistorieEntry = { id: string; feld: string; alter_wert: string | null; neuer_wert: string | null; created_at: string };

const statusOptions = [
  { value: "aktiv", label: "Aktiv", emoji: "\u{1F7E2}", color: "bg-green-500" },
  { value: "reserviert", label: "Reserviert", emoji: "\u{1F7E1}", color: "bg-amber-400" },
  { value: "verkauft", label: "Verkauft", emoji: "\u{1F534}", color: "bg-red-500" },
  { value: "vermietet", label: "Vermietet", emoji: "\u{1F535}", color: "bg-blue-500" },
  { value: "deaktiviert", label: "Deaktiviert", emoji: "\u26AB", color: "bg-gray-800" },
];

const statusBadge: Record<string, string> = {
  aktiv: "bg-green-500 text-white",
  reserviert: "bg-amber-400 text-white",
  verkauft: "bg-red-500 text-white",
  vermietet: "bg-blue-500 text-white",
  deaktiviert: "bg-gray-800 text-white",
  entwurf: "bg-orange-400 text-white",
};

const filterTabs = [
  { value: "alle", label: "Alle" },
  { value: "Eigentumswohnung", label: "Eigentumswohnung" },
  { value: "Mietwohnung", label: "Mietwohnung" },
];

function daysSince(dateStr: string) {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Objektverwaltung() {
  const { user } = useAuth();
  const [objekte, setObjekte] = useState<Objekt[]>([]);
  const [search, setSearch] = useState("");
  const [typFilter, setTypFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showModal, setShowModal] = useState(false);
  const [editObjekt, setEditObjekt] = useState<Objekt | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [interessenten, setInteressenten] = useState<Interessent[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [objPhotos, setObjPhotos] = useState<Record<string, string>>({});
  const [showExposePreview, setShowExposePreview] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "historie" | "medien" | "statistiken">("info");
  const [historie, setHistorie] = useState<HistorieEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Magic Tools state (ported from Kamera)
  const [magicEditOpen, setMagicEditOpen] = useState(false);
  const [magicEditPhoto, setMagicEditPhoto] = useState<string | null>(null);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicEditing, setMagicEditing] = useState(false);
  const [smartCropping, setSmartCropping] = useState(false);
  const [outpainting, setOutpainting] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  // NotebookLM state for edit mode
  const [notebookLmText, setNotebookLmText] = useState("");

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
    if (oldStatus === newStatus) return;
    await supabase.from("objekte").update({ status: newStatus }).eq("id", objId);
    await supabase.from("objekt_historie").insert({
      objekt_id: objId, user_id: user.id, feld: "status", alter_wert: oldStatus, neuer_wert: newStatus,
    });
    toast({ title: `Status → ${newStatus.toUpperCase()}` });
    load();
    if (detailId === objId) loadHistorie(objId);
  };

  const deleteObjekt = async (objId: string) => {
    if (!user) return;
    const { data: files } = await supabase.storage.from("objekt-fotos").list(objId);
    if (files && files.length > 0) {
      const paths = files.map(f => `${objId}/${f.name}`);
      await supabase.storage.from("objekt-fotos").remove(paths);
    }
    await supabase.from("objekt_historie").delete().eq("objekt_id", objId);
    const { error } = await supabase.from("objekte").delete().eq("id", objId);
    if (error) {
      toast({ title: "❌ Fehler beim Löschen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Objekt endgültig gelöscht" });
      setDetailId(null);
      load();
    }
  };

  const startEdit = (obj: Objekt) => {
    setEditing(true);
    setEditForm({
      kaufpreis: obj.kaufpreis?.toString() || "",
      kurzinfo: obj.kurzinfo || "",
      beschreibung: obj.beschreibung || "",
      interne_notizen: obj.interne_notizen || "",
      status: obj.status || "aktiv",
      objektart: obj.objektart || "",
      verkaufsart: obj.verkaufsart || "Kauf",
      plz: obj.plz || "",
      ort: obj.ort || "",
      strasse: obj.strasse || "",
      hnr: obj.hnr || "",
      top: obj.top || "",
      stock: obj.stock || "",
      flaeche_m2: obj.flaeche_m2?.toString() || "",
      zimmer: obj.zimmer?.toString() || "",
      kaeufer_provision: obj.kaeufer_provision?.toString() || "",
      verkaeufer_provision: obj.verkaeufer_provision?.toString() || "",
    });
    setNotebookLmText("");
  };

  const saveEdit = async (exportToImmoZ?: boolean) => {
    if (!user || !detailId) return;
    setSavingEdit(true);
    const obj = objekte.find(o => o.id === detailId);
    if (!obj) return;

    const changes: Array<{ feld: string; alter_wert: string | null; neuer_wert: string | null }> = [];
    const update: Record<string, unknown> = {};

    const trackField = (key: string, dbKey: string, parse?: (v: string) => unknown) => {
      const oldVal = (obj as Record<string, unknown>)[dbKey];
      const oldStr = oldVal != null ? String(oldVal) : "";
      const newStr = editForm[key] || "";
      if (newStr !== oldStr) {
        changes.push({ feld: dbKey, alter_wert: oldStr || null, neuer_wert: newStr || null });
        update[dbKey] = parse ? parse(newStr) : (newStr || null);
      }
    };

    trackField("kaufpreis", "kaufpreis", v => v ? parseFloat(v) : null);
    trackField("kurzinfo", "kurzinfo");
    trackField("beschreibung", "beschreibung");
    trackField("interne_notizen", "interne_notizen");
    trackField("status", "status");
    trackField("objektart", "objektart");
    trackField("verkaufsart", "verkaufsart");
    trackField("plz", "plz");
    trackField("ort", "ort");
    trackField("strasse", "strasse");
    trackField("hnr", "hnr");
    trackField("top", "top");
    trackField("stock", "stock");
    trackField("flaeche_m2", "flaeche_m2", v => v ? parseFloat(v) : null);
    trackField("zimmer", "zimmer", v => v ? parseFloat(v) : null);
    trackField("kaeufer_provision", "kaeufer_provision", v => v ? parseFloat(v) : null);
    trackField("verkaeufer_provision", "verkaeufer_provision", v => v ? parseFloat(v) : null);

    if (exportToImmoZ) {
      update.immoz_exportiert = true;
      update.immoz_export_datum = new Date().toISOString();
      if (!update.status) update.status = "aktiv";
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from("objekte").update(update).eq("id", detailId);
      if (error) {
        toast({ title: "❌ Fehler beim Speichern", description: error.message, variant: "destructive" });
        setSavingEdit(false);
        return;
      }
      for (const c of changes) {
        await supabase.from("objekt_historie").insert({ objekt_id: detailId, user_id: user.id, ...c });
      }
      if (exportToImmoZ) {
        await supabase.from("immoz_exporte").insert({
          objekte_ids: [detailId], anzahl: 1, status: "Erfolgreich",
          dateiname: `immoZ_export_${new Date().toLocaleDateString("de-AT").replace(/\./g, "")}.xml`,
        });
        toast({ title: "✅ Gespeichert & an ImmoZ übertragen" });
      } else {
        toast({ title: `✅ ${changes.length} Änderung(en) gespeichert` });
      }
      load();
      loadHistorie(detailId);
    } else {
      toast({ title: "Keine Änderungen erkannt" });
    }
    setEditing(false);
    setSavingEdit(false);
  };

  // === Magic Tools functions (ported from Kamera) ===
  const handleMagicEdit = async () => {
    if (!magicEditPhoto) return;
    setMagicEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: {
          action: "magic-edit",
          imageDataUrls: [magicEditPhoto],
          context: magicPrompt || "Entferne störende Objekte, verbessere das Foto für ein professionelles Immobilien-Exposé.",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.editedImage) {
        setEditedImage(data.editedImage);
        toast({ title: "✨ Magic Edit fertig" });
      } else {
        toast({ title: "Kein bearbeitetes Bild erhalten", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Magic Edit fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setMagicEditing(false);
    }
  };

  const handleSmartCrop = async () => {
    if (!magicEditPhoto) return;
    setSmartCropping(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "smart-crop", imageDataUrls: [magicEditPhoto] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.editedImage) {
        setEditedImage(data.editedImage);
        toast({ title: "✅ Smart Crop fertig" });
      }
    } catch (err) {
      toast({ title: "Smart Crop fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setSmartCropping(false);
    }
  };

  const handleOutpainting = async () => {
    if (!magicEditPhoto) return;
    setOutpainting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: {
          action: "outpainting",
          imageDataUrls: [magicEditPhoto],
          context: "Erweitere dieses Immobilienfoto zu einer beeindruckenden Weitwinkel-Aufnahme.",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.editedImage) {
        setEditedImage(data.editedImage);
        toast({ title: "🖼️ Outpainting fertig" });
      }
    } catch (err) {
      toast({ title: "Outpainting fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setOutpainting(false);
    }
  };

  const applyEditedImage = () => {
    if (editedImage) {
      setMagicEditPhoto(editedImage);
      setEditedImage(null);
      toast({ title: "✓ Bearbeitetes Bild übernommen" });
    }
  };

  const openMagicEdit = (photoUrl: string) => {
    setMagicEditPhoto(photoUrl);
    setMagicEditOpen(true);
    setEditedImage(null);
    setMagicPrompt("");
  };

  const filtered = objekte.filter(o => {
    const matchType = typFilter === "alle" || o.objektart === typFilter;
    const s = o.status || "aktiv";
    const matchStatus = statusFilter === "alle" || s === statusFilter;
    const matchSearch = (o.strasse || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.ort || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.objektnummer || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.plz || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const detailObj = objekte.find(o => o.id === detailId);
  const isEntwurf = (obj: Objekt) => obj.status === "entwurf";

  const inputCls = "mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Objektverwaltung</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{objekte.length} Objekte</p>
        </div>
        <button onClick={() => { setEditObjekt(null); setShowModal(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm shadow-orange hover:opacity-90 transition-all active:scale-95">
          <Plus size={16} /> Neues Objekt
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Adresse, PLZ oder Objektnummer…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
      </div>

      {/* Typ-Filter Pill Bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-3">
        {filterTabs.map(t => (
          <button key={t.value} onClick={() => setTypFilter(t.value)}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${typFilter === t.value ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Status-Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-5">
        <button onClick={() => setStatusFilter("alle")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${statusFilter === "alle" ? "bg-primary text-primary-foreground shadow-orange" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
          Alle
        </button>
        {statusOptions.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === s.value ? `${s.color} text-white` : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
            <span className={`w-2 h-2 rounded-full ${statusFilter === s.value ? "bg-white/60" : s.color}`} />
            {s.label}
          </button>
        ))}
        <button onClick={() => setStatusFilter("entwurf")}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${statusFilter === "entwurf" ? "bg-orange-400 text-white" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
          <span className={`w-2 h-2 rounded-full ${statusFilter === "entwurf" ? "bg-white/60" : "bg-orange-400"}`} />
          Entwurf
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Keine Objekte gefunden.</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-primary font-semibold text-sm hover:underline">+ Erstes Objekt anlegen</button>
          </div>
        )}
        {filtered.map(obj => {
          const objStatus = obj.status || "aktiv";
          const entwurf = isEntwurf(obj);
          return (
            <div key={obj.id} onClick={() => openDetail(obj.id)}
              className="bg-card rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-md-custom transition-all cursor-pointer">
              {objPhotos[obj.id] ? (
                <div className="relative h-44 w-full">
                  <img src={objPhotos[obj.id]} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                  {entwurf && (
                    <span className="absolute top-2 left-2 bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide">Entwurf</span>
                  )}
                  <div className="absolute bottom-2 left-3 right-3">
                    <h3 className="font-bold text-white text-sm drop-shadow">{obj.strasse ? `${obj.strasse} ${obj.hnr || ""}` : obj.objektart}{obj.ort ? `, ${obj.plz || ""} ${obj.ort}` : ""}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/80 font-mono">{obj.objektnummer}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={e => e.stopPropagation()}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer hover:opacity-80 ${statusBadge[objStatus] || "bg-muted text-muted-foreground"}`}>
                            {objStatus.toUpperCase()} <ChevronDown size={9} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[140px]">
                          {statusOptions.map(s => (
                            <DropdownMenuItem key={s.value} onClick={(e) => { e.stopPropagation(); changeStatus(obj.id, s.value); }}>
                              {s.emoji} {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <span className="text-[10px] text-white/70 flex items-center gap-0.5"><Clock size={9} /> {daysSince(obj.created_at)}d</span>
                    </div>
                  </div>
                  {obj.kaufpreis && <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg shadow">€{Number(obj.kaufpreis).toLocaleString("de-AT")}</span>}
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm">{obj.strasse ? `${obj.strasse} ${obj.hnr || ""}` : obj.objektart}{obj.ort ? `, ${obj.plz || ""} ${obj.ort}` : ""}</h3>
                        {entwurf && <span className="bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Entwurf</span>}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{obj.objektnummer}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock size={9} /> {daysSince(obj.created_at)}d</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={e => e.stopPropagation()}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-80 flex items-center gap-1 ${statusBadge[objStatus] || "bg-muted text-muted-foreground"}`}>
                            {objStatus.toUpperCase()} <ChevronDown size={10} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          {statusOptions.map(s => (
                            <DropdownMenuItem key={s.value} onClick={(e) => { e.stopPropagation(); changeStatus(obj.id, s.value); }}>
                              {s.emoji} {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          );
        })}
      </div>

      {/* Detail Modal */}
      {detailObj && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setDetailId(null)}>
          <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{detailObj.strasse ? `${detailObj.strasse} ${detailObj.hnr || ""}` : detailObj.objektart}</h2>
                {isEntwurf(detailObj) && <span className="bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Entwurf / Offline</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(detailObj)} className="p-2 rounded-xl hover:bg-accent"><Edit3 size={16} className="text-primary" /></button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 rounded-xl hover:bg-destructive/10"><Trash2 size={16} className="text-destructive" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Objekt endgültig löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Das Objekt "{detailObj.strasse ? `${detailObj.strasse} ${detailObj.hnr || ""}` : detailObj.objektart}" wird mit allen Fotos und der Historie unwiderruflich gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteObjekt(detailObj.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Endgültig löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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

            {/* Photos */}
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {photos.map((url, i) => (
                  <img key={i} src={url} alt={`Foto ${i+1}`} className="w-28 h-20 rounded-xl object-cover flex-shrink-0 border border-border" />
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
              <button onClick={() => setDetailTab("info")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${detailTab === "info" ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-foreground border-border"}`}>
                📋 Info
              </button>
              <button onClick={() => setDetailTab("medien")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${detailTab === "medien" ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-foreground border-border"}`}>
                <Film size={12} className="inline mr-1" /> Medien
              </button>
              <button onClick={() => setDetailTab("statistiken")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${detailTab === "statistiken" ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-foreground border-border"}`}>
                <BarChart3 size={12} className="inline mr-1" /> Stats
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
                      <label className={labelCls}>Status</label>
                      <select className={inputCls} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                        {statusOptions.map(s => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
                        <option value="entwurf">📝 Entwurf</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Objektart</label>
                        <select className={inputCls} value={editForm.objektart} onChange={e => setEditForm({ ...editForm, objektart: e.target.value })}>
                          <option value="">Auswählen…</option>
                          {["Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Doppelhaushälfte", "Reihenhaus", "Grundstück", "Büro/Gewerbefläche", "Zinshaus", "Dachgeschosswohnung", "Penthouse"].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Vermarktung</label>
                        <select className={inputCls} value={editForm.verkaufsart} onChange={e => setEditForm({ ...editForm, verkaufsart: e.target.value })}>
                          <option>Kauf</option><option>Miete</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div><label className={labelCls}>PLZ</label><input className={inputCls} value={editForm.plz} onChange={e => setEditForm({ ...editForm, plz: e.target.value })} /></div>
                      <div><label className={labelCls}>Ort</label><input className={inputCls} value={editForm.ort} onChange={e => setEditForm({ ...editForm, ort: e.target.value })} /></div>
                      <div><label className={labelCls}>Straße</label><input className={inputCls} value={editForm.strasse} onChange={e => setEditForm({ ...editForm, strasse: e.target.value })} /></div>
                      <div><label className={labelCls}>HNR</label><input className={inputCls} value={editForm.hnr} onChange={e => setEditForm({ ...editForm, hnr: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Top</label><input className={inputCls} value={editForm.top} onChange={e => setEditForm({ ...editForm, top: e.target.value })} /></div>
                      <div><label className={labelCls}>Stock</label><input className={inputCls} value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={labelCls}>Fläche m²</label><input type="number" className={inputCls} value={editForm.flaeche_m2} onChange={e => setEditForm({ ...editForm, flaeche_m2: e.target.value })} /></div>
                      <div><label className={labelCls}>Zimmer</label><input type="number" className={inputCls} value={editForm.zimmer} onChange={e => setEditForm({ ...editForm, zimmer: e.target.value })} /></div>
                      <div><label className={labelCls}>Kaufpreis €</label><input type="number" className={inputCls} value={editForm.kaufpreis} onChange={e => setEditForm({ ...editForm, kaufpreis: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>Käufer-Prov. %</label><input type="number" step="0.1" className={inputCls} value={editForm.kaeufer_provision} onChange={e => setEditForm({ ...editForm, kaeufer_provision: e.target.value })} /></div>
                      <div><label className={labelCls}>Verkäufer-Prov. %</label><input type="number" step="0.1" className={inputCls} value={editForm.verkaeufer_provision} onChange={e => setEditForm({ ...editForm, verkaeufer_provision: e.target.value })} /></div>
                    </div>
                    <div>
                      <label className={labelCls}>Kurzinfo</label>
                      <input className={inputCls} value={editForm.kurzinfo} onChange={e => setEditForm({ ...editForm, kurzinfo: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Beschreibung</label>
                      <textarea className={`${inputCls} resize-none`} rows={6} value={editForm.beschreibung} onChange={e => setEditForm({ ...editForm, beschreibung: e.target.value })} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className={labelCls}>🔒 Interne Notizen</label>
                        <AudioRecorder
                          onTranscript={(text) => setEditForm(prev => ({
                            ...prev,
                            interne_notizen: prev.interne_notizen ? prev.interne_notizen + "\n" + text : text
                          }))}
                        />
                      </div>
                      <textarea className={`${inputCls} resize-none`} rows={4} style={{ minHeight: "300px" }} value={editForm.interne_notizen} onChange={e => setEditForm({ ...editForm, interne_notizen: e.target.value })} />
                    </div>

                    {/* NotebookLM in edit mode */}
                    <div className="border border-border rounded-xl p-4 bg-accent/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-primary" />
                        <label className={labelCls}>NotebookLM-Analyse</label>
                      </div>
                      <textarea
                        className={`${inputCls} resize-none`}
                        style={{ minHeight: "300px" }}
                        placeholder="NotebookLM-Output hier einfügen (Marktdaten, Infrastruktur-Analyse, Mietpreisentwicklung…)"
                        value={notebookLmText}
                        onChange={e => setNotebookLmText(e.target.value)}
                      />
                      {notebookLmText && (
                        <p className="text-xs text-primary font-semibold">✓ {notebookLmText.length} Zeichen</p>
                      )}
                      <button
                        onClick={async () => {
                          const { ok } = await sendAction("notiz_speichern", {
                            text: notebookLmText,
                            objekt_id: detailObj.id,
                            quelle: "notebook_lm_objekt",
                          });
                          if (ok) toast({ title: "✅ Notiz & Analyse gespeichert" });
                          else toast({ title: "Fehler beim Speichern", variant: "destructive" });
                        }}
                        disabled={!notebookLmText.trim()}
                        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save size={14} /> Notiz & Analyse speichern
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-accent">Abbrechen</button>
                      <button onClick={() => saveEdit(false)} disabled={savingEdit} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-orange">
                        {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Intern speichern
                      </button>
                    </div>
                    <button onClick={() => saveEdit(true)} disabled={savingEdit} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange flex items-center justify-center gap-2">
                      <Copy size={14} /> Speichern & an ImmoZ übertragen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between"><span className="text-muted-foreground">Objektnummer</span><span className="font-semibold">{detailObj.objektnummer || "–"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Art</span><span className="font-semibold">{detailObj.objektart}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Vermarktung</span><span className="font-semibold">{detailObj.verkaufsart || "Kauf"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Adresse</span><span className="font-semibold">{[detailObj.strasse, detailObj.hnr, detailObj.plz, detailObj.ort].filter(Boolean).join(", ") || "–"}</span></div>
                    {detailObj.top && <div className="flex justify-between"><span className="text-muted-foreground">Top</span><span className="font-semibold">{detailObj.top}</span></div>}
                    {detailObj.stock && <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className="font-semibold">{detailObj.stock}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Fläche</span><span className="font-semibold">{detailObj.flaeche_m2 ? `${detailObj.flaeche_m2} m²` : "–"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Zimmer</span><span className="font-semibold">{detailObj.zimmer || "–"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Preis</span><span className="font-bold text-primary">{detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "auf Anfrage"}</span></div>
                    {detailObj.kaeufer_provision && <div className="flex justify-between"><span className="text-muted-foreground">Käufer-Provision</span><span className="font-semibold">{detailObj.kaeufer_provision}%</span></div>}
                    {detailObj.verkaeufer_provision && <div className="flex justify-between"><span className="text-muted-foreground">Verkäufer-Provision</span><span className="font-semibold">{detailObj.verkaeufer_provision}%</span></div>}
                    {/* Homepage Link */}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-muted-foreground text-xs">Homepage</span>
                      <a
                        href={`https://immoexpress.at/objekt/${detailObj.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> Auf Homepage anzeigen
                      </a>
                    </div>
                    {detailObj.kurzinfo && <p className="text-muted-foreground text-xs pt-2 border-t border-border">{detailObj.kurzinfo}</p>}
                    {detailObj.beschreibung && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-muted-foreground text-xs whitespace-pre-wrap leading-relaxed">{detailObj.beschreibung}</p>
                      </div>
                    )}
                    {detailObj.interne_notizen && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs font-bold text-primary">🔒 Interne Notizen</span>
                        <p className="text-xs text-muted-foreground mt-1">{detailObj.interne_notizen}</p>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => setShowExposePreview(true)}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-sm shadow-orange hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 mb-3">
                  <Eye size={14} /> Exposé Vorschau & Senden
                </button>

                {/* One-Click Share Bundle */}
                <div className="bg-accent rounded-2xl p-3 border border-border mb-4">
                  <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Share2 size={12} className="text-primary" /> One-Click-Share Paket
                  </h4>
                  <p className="text-[10px] text-muted-foreground mb-2.5">
                    Exposé + Analyse-Link + Video gebündelt versenden
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => {
                      const addr = [detailObj.strasse, detailObj.hnr, detailObj.plz, detailObj.ort].filter(Boolean).join(", ");
                      const kiText = `🏠 *${detailObj.kurzinfo || detailObj.objektart}*\n📍 ${addr}\n💰 ${detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "Preis auf Anfrage"}\n📐 ${detailObj.flaeche_m2 || "–"} m² · ${detailObj.zimmer || "–"} Zimmer\n\n${(detailObj.beschreibung || "").slice(0, 200)}${(detailObj.beschreibung || "").length > 200 ? "…" : ""}\n\n📄 Exposé: https://immoexpress.at/objekt/${detailObj.id}\n🎬 Video: https://immoexpress.at/video/${detailObj.id}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(kiText)}`, "_blank");
                      if (user) supabase.from("objekt_statistiken").insert({ objekt_id: detailObj.id, user_id: user.id, typ: "expose", kanal: "whatsapp" });
                    }} className="bg-green-600 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-green-700 transition-all active:scale-95">
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                    <button onClick={() => {
                      const subject = detailObj.kurzinfo || detailObj.objektart || "Immobilie";
                      const addr = [detailObj.strasse, detailObj.hnr, detailObj.plz, detailObj.ort].filter(Boolean).join(", ");
                      const body = `${subject}\n\n📍 ${addr}\nPreis: ${detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "auf Anfrage"}\nFläche: ${detailObj.flaeche_m2 || "–"} m²\n\n${(detailObj.beschreibung || "").slice(0, 300)}\n\n📄 Exposé: https://immoexpress.at/objekt/${detailObj.id}\n🎬 Video: https://immoexpress.at/video/${detailObj.id}`;
                      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      if (user) supabase.from("objekt_statistiken").insert({ objekt_id: detailObj.id, user_id: user.id, typ: "expose", kanal: "email" });
                    }} className="bg-card border border-border text-foreground rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent transition-all active:scale-95">
                      <Mail size={13} /> E-Mail
                    </button>
                  </div>
                </div>

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
            ) : detailTab === "medien" ? (
              <div className="space-y-4">
                {/* Large photo area – 65vh with click-to-edit */}
                {photos.length > 0 ? (
                  <div
                    className="relative rounded-2xl overflow-hidden border border-border cursor-pointer"
                    style={{ height: "65vh" }}
                    onClick={() => openMagicEdit(photos[0])}
                  >
                    <img src={photos[0]} alt="Titelbild" className="w-full h-full object-cover" />
                    <button
                      className="absolute bottom-4 right-4 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Wand2 size={16} /> Magic Edit
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card" style={{ height: "65vh" }}>
                    <Film size={40} className="text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Keine Fotos vorhanden – lade Fotos hoch für einen Video-Rundgang.</p>
                  </div>
                )}

                {/* Thumbnails – click to open Magic Edit */}
                {photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {photos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Foto ${i+1}`}
                        className="w-20 h-14 rounded-xl object-cover flex-shrink-0 border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => openMagicEdit(url)}
                      />
                    ))}
                  </div>
                )}

                {/* KI Action Buttons with fixed actionIds */}
                <div className="space-y-2.5">
                  <button
                    onClick={async () => {
                      setVideoLoading(true);
                      try {
                        const { ok, status } = await sendAction("expose_video_ki", {
                          objekt_id: detailObj.id,
                          objekt: { titel: detailObj.kurzinfo || detailObj.objektart, objektnummer: detailObj.objektnummer, ort: detailObj.ort, plz: detailObj.plz },
                          bilder_anzahl: photos.length,
                        });
                        if (ok) toast({ title: "✅ Video-Auftrag gesendet" });
                        else throw new Error(`Fehler: ${status}`);
                      } catch (err: unknown) {
                        toast({ title: "Fehler", description: err instanceof Error ? err.message : "Unbekannt", variant: "destructive" });
                      } finally {
                        setVideoLoading(false);
                      }
                    }}
                    disabled={videoLoading || photos.length === 0}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {videoLoading ? <><Loader2 size={16} className="animate-spin" /> Video wird erstellt…</> : <><Film size={16} /> KI Video Rundgang</>}
                  </button>
                  {videoLoading && <Progress value={45} className="h-1.5 rounded-full" />}

                  <button
                    onClick={async () => {
                      setPdfLoading(true);
                      try {
                        const { ok, status } = await sendAction("expose_pdf_gen", {
                          objekt_id: detailObj.id,
                          objekt: { titel: detailObj.kurzinfo || detailObj.objektart, objektnummer: detailObj.objektnummer },
                        });
                        if (ok) toast({ title: "✅ PDF wird generiert" });
                        else throw new Error(`Fehler: ${status}`);
                      } catch (err: unknown) {
                        toast({ title: "Fehler", description: err instanceof Error ? err.message : "Unbekannt", variant: "destructive" });
                      } finally {
                        setPdfLoading(false);
                      }
                    }}
                    disabled={pdfLoading}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {pdfLoading ? <><Loader2 size={16} className="animate-spin" /> PDF wird erstellt…</> : <><FileText size={16} /> PDF generieren</>}
                  </button>
                  {pdfLoading && <Progress value={60} className="h-1.5 rounded-full" />}
                </div>

                {/* Video slideshow */}
                {photos.length > 0 && (
                  <VideoSlideshow
                    images={photos}
                    titel={detailObj.kurzinfo || detailObj.objektart || "Immobilie"}
                    preis={detailObj.kaufpreis?.toString() || ""}
                    flaeche={detailObj.flaeche_m2?.toString() || ""}
                    zimmer={detailObj.zimmer?.toString() || ""}
                    beschreibung={detailObj.beschreibung || ""}
                    onShare={(type) => {
                      const addr = [detailObj.strasse, detailObj.hnr, detailObj.plz, detailObj.ort].filter(Boolean).join(", ");
                      const shareText = `🏠 *${detailObj.kurzinfo || detailObj.objektart}*\n📍 ${addr}\n💰 ${detailObj.kaufpreis ? `€${Number(detailObj.kaufpreis).toLocaleString("de-AT")}` : "Preis auf Anfrage"}\n📐 ${detailObj.flaeche_m2 || "–"} m² · ${detailObj.zimmer || "–"} Zimmer\n\n👉 https://immoexpress.at/objekt/${detailObj.id}`;
                      if (type === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
                      else window.open(`mailto:?subject=${encodeURIComponent(detailObj.kurzinfo || "Immobilie")}&body=${encodeURIComponent(shareText)}`);
                      if (user) supabase.from("objekt_statistiken").insert({ objekt_id: detailObj.id, user_id: user.id, typ: "video", kanal: type });
                    }}
                  />
                )}
              </div>
            ) : detailTab === "statistiken" ? (
              <ObjektStatistiken objektId={detailObj.id} />
            ) : (
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

      {/* ===== MAGIC EDIT FULLSCREEN OVERLAY ===== */}
      {magicEditOpen && magicEditPhoto && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in" onClick={() => setMagicEditOpen(false)}>
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Wand2 size={18} className="text-primary" /> Magic Tools
              </h2>
              <button onClick={() => setMagicEditOpen(false)} className="p-2 rounded-xl hover:bg-accent"><X size={18} /></button>
            </div>

            {/* Large Image */}
            <div className="relative rounded-2xl overflow-hidden border border-border flex-1 min-h-0">
              <img
                src={editedImage || magicEditPhoto}
                alt="Bearbeitung"
                className="w-full h-full object-contain bg-card"
              />
            </div>

            {/* Magic Tools Toolbar */}
            <div className="mt-3 space-y-3">
              <input
                className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="z.B. Entferne den Müll, verbessere die Beleuchtung…"
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleMagicEdit}
                  disabled={magicEditing}
                  className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold shadow-orange hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {magicEditing ? <><RefreshCw size={12} className="animate-spin" /> …</> : <><Wand2 size={12} /> Magic Edit</>}
                </button>
                <button
                  onClick={handleSmartCrop}
                  disabled={smartCropping}
                  className="flex items-center justify-center gap-1.5 bg-accent text-foreground border border-border rounded-xl py-2.5 text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50"
                >
                  {smartCropping ? <><RefreshCw size={12} className="animate-spin" /> …</> : <><Crop size={12} /> Crop 9:16</>}
                </button>
                <button
                  onClick={handleOutpainting}
                  disabled={outpainting}
                  className="flex items-center justify-center gap-1.5 bg-accent text-foreground border border-border rounded-xl py-2.5 text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50"
                >
                  {outpainting ? <><RefreshCw size={12} className="animate-spin" /> …</> : <><Expand size={12} /> Outpaint</>}
                </button>
              </div>

              {editedImage && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={applyEditedImage}
                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:opacity-90 transition-all"
                  >
                    <Check size={14} /> Übernehmen
                  </button>
                  <button
                    onClick={() => setEditedImage(null)}
                    className="flex items-center justify-center gap-2 bg-accent text-foreground border border-border rounded-xl py-2.5 text-sm font-bold hover:bg-secondary transition-all"
                  >
                    <X size={14} /> Verwerfen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ObjektModal open={showModal} onClose={() => setShowModal(false)} onSaved={load} />

      {detailObj && (
        <ExposePreviewModal
          open={showExposePreview}
          onClose={() => setShowExposePreview(false)}
          template="expose-style"
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
