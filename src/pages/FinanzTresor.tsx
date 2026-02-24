import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Shield, Lock, FileText, Upload, Download, Trash2, Loader2,
  User, Home, MapPin, Euro, Phone, Mail, StickyNote, FileSpreadsheet,
  File, Building, Save, ChevronRight, AlertTriangle, CircleCheck, Circle,
  Plus, History, Send
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Kunde = {
  id: string; name: string; email: string | null; phone: string | null;
  typ: string | null; ort: string | null; budget: string | null; status: string | null;
  notiz: string | null; finance_shared: boolean;
  objekt_id: string | null;
  finance_status: string | null;
  ablehnungsgrund_bank: string | null;
  user_id: string | null;
};

type Objekt = {
  id: string; strasse: string | null; hnr: string | null; plz: string | null;
  ort: string | null; objektart: string | null; zimmer: number | null;
  flaeche_m2: number | null; kaufpreis: number | null; status: string | null;
  objektnummer: string | null; kurzinfo: string | null;
};

type TresorNotiz = { id: string; notiz: string; created_at: string; updated_at: string };
type TresorUpload = { id: string; dateiname: string; storage_path: string; created_at: string };
type CrmDok = { id: string; dateiname: string; storage_path: string; created_at: string };

const CHECKLIST_ITEMS = [
  { key: "grundbuch", label: "Grundbuchauszug", pflicht: true, patterns: ["grundbuch"] },
  { key: "gehalt", label: "Gehaltszettel (3 Monate)", pflicht: true, patterns: ["gehalt", "lohn", "einkommens"] },
  { key: "ausweis", label: "Lichtbildausweis", pflicht: true, patterns: ["ausweis", "reisepass", "führerschein", "personalausweis"] },
  { key: "objektdaten", label: "Objektdaten-Blatt", pflicht: false, patterns: ["objektdaten", "objektblatt"] },
] as const;

const STATUS_OPTIONS = [
  { value: "uebertragen", label: "Übertragen", dotColor: "bg-blue-500" },
  { value: "nachfordern", label: "Infos nachfordern", dotColor: "bg-yellow-500" },
  { value: "abgeschlossen", label: "Abgeschlossen", dotColor: "bg-green-500" },
  { value: "storniert", label: "Storniert", dotColor: "bg-red-500" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatCurrency(n: number | null) {
  if (!n) return "–";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return <FileText size={16} className="text-destructive flex-shrink-0" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={16} className="text-green-600 flex-shrink-0" />;
  if (["doc", "docx"].includes(ext)) return <File size={16} className="text-blue-600 flex-shrink-0" />;
  return <FileText size={16} className="text-primary flex-shrink-0" />;
}

export default function FinanzTresor() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [selected, setSelected] = useState<Kunde | null>(null);
  const [objekt, setObjekt] = useState<Objekt | null>(null);
  const [notizen, setNotizen] = useState<TresorNotiz[]>([]);
  const [uploads, setUploads] = useState<TresorUpload[]>([]);
  const [crmDokumente, setCrmDokumente] = useState<CrmDok[]>([]);
  const [newNotiz, setNewNotiz] = useState("");
  const [savingNotiz, setSavingNotiz] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStornoInput, setShowStornoInput] = useState(false);
  const [stornoGrund, setStornoGrund] = useState("");
  const [bankEmail, setBankEmail] = useState("");
  const [showMailDialog, setShowMailDialog] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [sendingMail, setSendingMail] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(data && data.length > 0);
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    loadKunden();
  }, [isAdmin]);

  const loadKunden = () => {
    setLoading(true);
    supabase.from("crm_kunden").select("*").eq("finance_shared", true).order("updated_at", { ascending: false })
      .then(({ data }) => { setKunden((data as Kunde[]) || []); setLoading(false); });
  };

  useEffect(() => {
    if (!selected) { setObjekt(null); setNotizen([]); setUploads([]); setCrmDokumente([]); setBankEmail(""); return; }
    if (selected.objekt_id) {
      supabase.from("objekte").select("*").eq("id", selected.objekt_id).single()
        .then(({ data }) => setObjekt(data as Objekt | null));
    } else { setObjekt(null); }
    supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setNotizen((data as TresorNotiz[]) || []));
    supabase.from("finanz_tresor_uploads").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setUploads((data as TresorUpload[]) || []));
    supabase.from("crm_dokumente").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setCrmDokumente((data as CrmDok[]) || []));
  }, [selected]);

  // Checklist detection from CRM documents
  const detectedItems = CHECKLIST_ITEMS.reduce<Record<string, string | null>>((acc, item) => {
    const found = crmDokumente.find(dok =>
      item.patterns.some(p => dok.dateiname.toLowerCase().includes(p))
    );
    acc[item.key] = found ? found.dateiname : null;
    return acc;
  }, {});

  const handleSaveNotiz = async () => {
    if (!newNotiz.trim() || !selected || !user) return;
    setSavingNotiz(true);
    const { error } = await supabase.from("finanz_tresor_notizen").insert({
      kunde_id: selected.id, user_id: user.id, notiz: newNotiz.trim()
    });
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "✓ Notiz gespeichert" });
      setNewNotiz("");
      const { data } = await supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setNotizen((data as TresorNotiz[]) || []);
    }
    setSavingNotiz(false);
  };

  const handleUpload = async (file: File) => {
    if (!selected || !user) return;
    setUploading(true);
    try {
      const tresorPath = `tresor/${selected.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("finanz-tresor").upload(tresorPath, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("finanz_tresor_uploads").insert({
        kunde_id: selected.id, user_id: user.id, dateiname: file.name, storage_path: tresorPath
      });
      if (dbErr) throw dbErr;

      const kundeOwnerUserId = selected.user_id || user.id;
      const crmPath = `crm/${selected.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from("kundenunterlagen").upload(crmPath, file);
      await supabase.from("crm_dokumente").insert({
        kunde_id: selected.id, user_id: kundeOwnerUserId, dateiname: file.name, storage_path: crmPath
      });

      toast({ title: "✓ Hochgeladen", description: `${file.name} (auch in Kunden-Dokumenten sichtbar)` });
      const { data } = await supabase.from("finanz_tresor_uploads").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setUploads((data as TresorUpload[]) || []);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleDeleteUpload = async (u: TresorUpload) => {
    await supabase.storage.from("finanz-tresor").remove([u.storage_path]);
    await supabase.from("finanz_tresor_uploads").delete().eq("id", u.id);
    toast({ title: "Gelöscht", description: u.dateiname });
    setUploads(prev => prev.filter(x => x.id !== u.id));
  };

  const handleDownload = (u: TresorUpload) => {
    const { data } = supabase.storage.from("finanz-tresor").getPublicUrl(u.storage_path);
    window.open(data.publicUrl, "_blank");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;
    if (newStatus === "storniert") {
      setShowStornoInput(true);
      return;
    }
    setStatusUpdating(true);
    const { error } = await supabase.from("crm_kunden").update({ finance_status: newStatus }).eq("id", selected.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Status aktualisiert" });
      setSelected({ ...selected, finance_status: newStatus });
      loadKunden();
    }
    setStatusUpdating(false);
  };

  const handleStorno = async () => {
    if (!selected || !stornoGrund.trim()) return;
    setStatusUpdating(true);
    const { error } = await supabase.from("crm_kunden").update({
      finance_status: "storniert",
      ablehnungsgrund_bank: stornoGrund.trim()
    }).eq("id", selected.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Storniert", description: "Ablehnungsgrund gespeichert." });
      setSelected({ ...selected, finance_status: "storniert", ablehnungsgrund_bank: stornoGrund.trim() });
      setShowStornoInput(false);
      setStornoGrund("");
      loadKunden();
    }
    setStatusUpdating(false);
  };

  const openMailDialog = () => {
    if (!selected) return;
    setMailTo(bankEmail);
    setMailSubject(`Finanzierungsanfrage - ${selected.name}`);
    setMailBody("");
    setShowMailDialog(true);
  };

  const handleSendMail = async () => {
    if (!selected || !user || !mailTo.trim() || !mailSubject.trim()) return;
    setSendingMail(true);
    // Archive as history entry in notizen
    const archiveText = `📧 E-Mail an Bank gesendet\nAn: ${mailTo}\nBetreff: ${mailSubject}\n${mailBody ? `Nachricht: ${mailBody}` : ""}`;
    const { error } = await supabase.from("finanz_tresor_notizen").insert({
      kunde_id: selected.id, user_id: user.id, notiz: archiveText.trim()
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ E-Mail archiviert", description: "Der Inhalt wurde in der Status-Historie gespeichert." });
      setShowMailDialog(false);
      const { data } = await supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setNotizen((data as TresorNotiz[]) || []);
    }
    setSendingMail(false);
  };

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Lock size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Zugriff verweigert</h2>
        <p className="text-muted-foreground text-sm">Dieses Modul ist ausschließlich für autorisierte Finanzierungsberater zugänglich.</p>
      </div>
    );
  }

  const isLocked = selected?.finance_status === "uebertragen" || selected?.finance_status === "abgeschlossen";

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Finanzierungs-Tresor</h1>
            <p className="text-muted-foreground text-xs">Verschlüsselte Kundenakten · Nur für Admins</p>
          </div>
        </div>
        <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">{kunden.length} Akten</Badge>
      </div>

      <div className="p-4 md:p-6 pb-24">
        {!selected ? (
          /* Kundenliste */
          <div className="space-y-3 max-w-2xl mx-auto">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="card-radius"><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            )) : kunden.length === 0 ? (
              <div className="text-center py-16">
                <Shield size={40} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Noch keine übertragenen Kunden.</p>
              </div>
            ) : kunden.map(k => {
              const sOpt = k.finance_status ? STATUS_OPTIONS.find(s => s.value === k.finance_status) : null;
              return (
                <Card key={k.id} className="card-radius shadow-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setSelected(k)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{k.name}</p>
                        {sOpt && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-foreground">
                            <span className={`w-2 h-2 rounded-full ${sOpt.dotColor}`} />
                            {sOpt.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{k.typ} · {k.ort || "–"} · {k.budget || "–"}</p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* ===== DASHBOARD TWO-COLUMN LAYOUT ===== */
          <div className="max-w-5xl mx-auto">
            <button onClick={() => { setSelected(null); setShowStornoInput(false); setStornoGrund(""); }} className="text-sm text-primary font-semibold hover:underline mb-4 inline-flex items-center gap-1">
              ← Zurück zur Übersicht
            </button>

            {/* Customer Header Bar */}
            <Card className="card-radius shadow-card mb-4">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-foreground">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">{selected.typ} · {selected.status}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail size={12} />{selected.email || "–"}</span>
                  <span className="flex items-center gap-1"><Phone size={12} />{selected.phone || "–"}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} />{selected.ort || "–"}</span>
                  <span className="flex items-center gap-1 font-bold text-primary"><Euro size={12} />{selected.budget || "–"}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* ===== LEFT SIDEBAR: Pflichtdokumenten-Checkliste ===== */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="bg-muted rounded-2xl p-4 sticky top-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-4">
                    <CircleCheck size={14} className="text-primary" /> Pflichtdokumente
                  </h4>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map(item => {
                      const found = detectedItems[item.key];
                      return (
                        <div
                          key={item.key}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
                            found
                              ? "bg-green-50 border border-green-200"
                              : "bg-card border border-border"
                          }`}
                        >
                          {found ? (
                            <CircleCheck size={16} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle size={16} className="text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${found ? "text-foreground" : "text-muted-foreground"}`}>
                              {item.label}
                            </p>
                            {found && <p className="text-[10px] text-green-600 truncate">✓ {found}</p>}
                          </div>
                          {item.pflicht && !found && (
                            <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Pflicht</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Verknüpftes Objekt - kompakt */}
                  {objekt && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Building size={12} /> Objekt
                      </h4>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p className="font-medium text-foreground">{[objekt.strasse, objekt.hnr].filter(Boolean).join(" ")}</p>
                        <p>{objekt.plz} {objekt.ort}</p>
                        <p className="font-bold text-primary">{formatCurrency(objekt.kaufpreis)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== RIGHT MAIN AREA ===== */}
              <div className="flex-1 space-y-4">

                {/* Card 1: FINANZIERUNGS-STATUS ÄNDERN - Runde Buttons mit farbigen Punkten */}
                <Card className="card-radius shadow-card">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
                      Finanzierungs-Status ändern
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const isActive = selected.finance_status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleStatusChange(opt.value)}
                            disabled={statusUpdating || isActive}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95 disabled:cursor-default ${
                              isActive
                                ? "bg-card border-border ring-2 ring-primary/30 ring-offset-1 text-foreground shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${opt.dotColor} ${isActive ? "ring-2 ring-offset-1 ring-current" : ""}`} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Storno Input - nur wenn Storniert angeklickt */}
                    {showStornoInput && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
                        <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={13} /> Ablehnungsgrund Bank (Pflichtfeld)
                        </p>
                        <textarea
                          value={stornoGrund}
                          onChange={e => setStornoGrund(e.target.value)}
                          placeholder="z.B. Bonität nicht ausreichend, Eigenkapital fehlt..."
                          className="w-full bg-card border border-red-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[80px] text-foreground placeholder:text-muted-foreground"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleStorno}
                            disabled={!stornoGrund.trim() || statusUpdating}
                            className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {statusUpdating ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Stornierung bestätigen"}
                          </button>
                          <button
                            onClick={() => { setShowStornoInput(false); setStornoGrund(""); }}
                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-card text-muted-foreground hover:bg-accent transition-all"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Ablehnungsgrund NUR bei Status storniert */}
                    {selected.finance_status === "storniert" && selected.ablehnungsgrund_bank && !showStornoInput && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-red-700 mb-1">Ablehnungsgrund Bank:</p>
                        <p className="text-sm text-red-800">{selected.ablehnungsgrund_bank}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card Row: Status-Historie + Interne Notiz (Two Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Status-Historie / Lock Info */}
                  <Card className="card-radius shadow-card">
                    <CardContent className="p-5">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                        <History size={13} /> Status-Historie
                      </h4>
                      {isLocked && (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                          <Lock size={14} className="text-blue-600" />
                          <p className="text-xs text-blue-700 font-medium">Schreibschutz aktiv – Makler-Zugriff gesperrt</p>
                        </div>
                      )}
                      {selected.notiz && (
                        <div className="note-highlight mb-3">
                          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><StickyNote size={10} /> Makler-Notiz</p>
                          <p className="text-sm text-foreground">{selected.notiz}</p>
                        </div>
                      )}
                      {/* Bank-Angebote Liste */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Bank-Angebote ({uploads.length})</p>
                        {uploads.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Noch keine.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {uploads.map(u => (
                              <div key={u.id} className="flex items-center gap-2 bg-accent rounded-xl p-2.5 border border-border">
                                {getFileIcon(u.dateiname)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{u.dateiname}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatDate(u.created_at)}</p>
                                </div>
                                <button onClick={() => handleDownload(u)} className="p-1.5 rounded-lg hover:bg-card transition-colors"><Download size={13} className="text-primary" /></button>
                                <button onClick={() => handleDeleteUpload(u)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={13} className="text-destructive" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right: Interne Notiz */}
                  <Card className="card-radius shadow-card">
                    <CardContent className="p-5">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                        <Lock size={13} className="text-primary" /> Interne Notiz
                      </h4>
                      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto scrollbar-hide">
                        {notizen.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Noch keine Notizen.</p>
                        ) : notizen.map(n => (
                          <div key={n.id} className={`note-highlight ${n.notiz.startsWith("📧") ? "border-l-4 border-l-primary/40" : ""}`}>
                            <p className="text-sm text-foreground whitespace-pre-line">{n.notiz}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={newNotiz}
                          onChange={e => setNewNotiz(e.target.value)}
                          placeholder="Interne Notiz hinzufügen..."
                          className="flex-1 bg-card border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] text-foreground placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={handleSaveNotiz}
                          disabled={!newNotiz.trim() || savingNotiz}
                          className="self-end bg-primary text-primary-foreground p-3 rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                          title="Notiz speichern"
                        >
                          {savingNotiz ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Card: FINANZ-TRESOR with Bank-Email + Upload */}
                <Card className="card-radius shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Lock size={22} className="text-primary" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Finanz-Tresor</h4>
                          <p className="text-[10px] text-muted-foreground">Dokumente werden automatisch auch in der Kunden-Dokumentenliste sichtbar.</p>
                        </div>

                        {/* Bank-E-Mail Eingabe */}
                        <div>
                          <Label htmlFor="bank-email" className="text-xs font-semibold text-foreground mb-1 block">Bank-E-Mail</Label>
                          <div className="flex gap-2">
                            <Input
                              id="bank-email"
                              type="email"
                              placeholder="bank@beispiel.at"
                              value={bankEmail}
                              onChange={e => setBankEmail(e.target.value)}
                              className="flex-1 rounded-xl"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openMailDialog}
                              disabled={!bankEmail.trim()}
                              className="rounded-xl gap-1.5"
                            >
                              <Send size={13} /> Dokumente an Bank mailen
                            </Button>
                          </div>
                        </div>

                        <input
                          ref={fileRef}
                          type="file"
                          accept=".pdf,.xls,.xlsx,.doc,.docx,.csv"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        />
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          {uploading ? "Wird hochgeladen..." : "Bank-Angebot hochladen"}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mail Dialog */}
      <Dialog open={showMailDialog} onOpenChange={setShowMailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail size={18} className="text-primary" /> Dokumente an Bank senden
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="mail-to" className="text-xs font-semibold mb-1 block">Empfänger</Label>
              <Input
                id="mail-to"
                type="email"
                value={mailTo}
                onChange={e => setMailTo(e.target.value)}
                placeholder="bank@beispiel.at"
              />
            </div>
            <div>
              <Label htmlFor="mail-subject" className="text-xs font-semibold mb-1 block">Betreff</Label>
              <Input
                id="mail-subject"
                value={mailSubject}
                onChange={e => setMailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mail-body" className="text-xs font-semibold mb-1 block">Nachricht</Label>
              <Textarea
                id="mail-body"
                value={mailBody}
                onChange={e => setMailBody(e.target.value)}
                placeholder="Ihre Nachricht an die Bank..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMailDialog(false)}>Abbrechen</Button>
            <Button
              onClick={handleSendMail}
              disabled={!mailTo.trim() || !mailSubject.trim() || sendingMail}
              className="gap-1.5"
            >
              {sendingMail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Senden & archivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
