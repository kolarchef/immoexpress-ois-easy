import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Lock, FileText, Upload, Download, Trash2, Loader2,
  User, Home, MapPin, Euro, Phone, Mail, StickyNote, FileSpreadsheet,
  File, Building, Save, ChevronRight, AlertTriangle
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

const STATUS_OPTIONS = [
  { value: "uebertragen", label: "🔵 Übertragen", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "nachfordern", label: "🟡 Infos nachfordern", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "abgeschlossen", label: "🟢 Abgeschlossen", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "storniert", label: "🔴 Storniert", color: "bg-red-100 text-red-700 border-red-300" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  const [newNotiz, setNewNotiz] = useState("");
  const [savingNotiz, setSavingNotiz] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStornoInput, setShowStornoInput] = useState(false);
  const [stornoGrund, setStornoGrund] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(data && data.length > 0);
    });
  }, [user]);

  // Load finance-shared customers
  useEffect(() => {
    if (!isAdmin) return;
    loadKunden();
  }, [isAdmin]);

  const loadKunden = () => {
    setLoading(true);
    supabase.from("crm_kunden").select("*").eq("finance_shared", true).order("updated_at", { ascending: false })
      .then(({ data }) => { setKunden((data as Kunde[]) || []); setLoading(false); });
  };

  // Load objekt + notizen + uploads when selecting a Kunde
  useEffect(() => {
    if (!selected) { setObjekt(null); setNotizen([]); setUploads([]); return; }
    if (selected.objekt_id) {
      supabase.from("objekte").select("*").eq("id", selected.objekt_id).single()
        .then(({ data }) => setObjekt(data as Objekt | null));
    } else { setObjekt(null); }
    supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setNotizen((data as TresorNotiz[]) || []));
    supabase.from("finanz_tresor_uploads").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setUploads((data as TresorUpload[]) || []));
  }, [selected]);

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
      // Upload to tresor bucket
      const tresorPath = `tresor/${selected.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("finanz-tresor").upload(tresorPath, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("finanz_tresor_uploads").insert({
        kunde_id: selected.id, user_id: user.id, dateiname: file.name, storage_path: tresorPath
      });
      if (dbErr) throw dbErr;

      // BACKFLOW: Also insert into crm_dokumente so the Makler sees it
      // Use the customer's user_id (the Makler who owns the customer) so RLS allows them to see it
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

  const currentStatusOption = selected?.finance_status ? STATUS_OPTIONS.find(s => s.value === selected.finance_status) : null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#0A0A0A] text-white px-6 py-8 rounded-b-3xl mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={24} className="text-primary" />
          <h1 className="text-2xl font-bold">Finanzierungs-Tresor</h1>
        </div>
        <p className="text-white/50 text-sm">Verschlüsselte Kundenakten · Nur für Admins</p>
        <Badge className="mt-3 bg-primary/20 text-primary border-primary/30">{kunden.length} Akten</Badge>
      </div>

      <div className="px-4 pb-24">
        {!selected ? (
          /* Kundenliste */
          <div className="space-y-3">
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
                <Card key={k.id} className="card-radius shadow-card cursor-pointer hover:shadow-orange transition-shadow" onClick={() => setSelected(k)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{k.name}</p>
                        {sOpt && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sOpt.color}`}>{sOpt.label}</span>
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
          /* Verschmolzene Akte */
          <div className="space-y-4">
            <button onClick={() => { setSelected(null); setShowStornoInput(false); setStornoGrund(""); }} className="text-sm text-primary font-semibold hover:underline mb-2">← Zurück zur Übersicht</button>

            {/* Status-Steuerung */}
            <Card className="card-radius shadow-card border-primary/30">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Finanzierungs-Status ändern</h4>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      disabled={statusUpdating || selected.finance_status === opt.value}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50 ${
                        selected.finance_status === opt.value ? opt.color + " ring-2 ring-offset-1 ring-primary/30" : "bg-card text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Storno-Grund Eingabe */}
                {showStornoInput && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 animate-fade-in">
                    <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Ablehnungsgrund Bank (Pflichtfeld)
                    </p>
                    <textarea
                      value={stornoGrund}
                      onChange={e => setStornoGrund(e.target.value)}
                      placeholder="z.B. Bonität nicht ausreichend, Eigenkapital fehlt..."
                      className="w-full bg-white border border-red-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[80px] text-foreground placeholder:text-muted-foreground"
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
                {/* Ablehnungsgrund anzeigen */}
                {selected.finance_status === "storniert" && selected.ablehnungsgrund_bank && !showStornoInput && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Ablehnungsgrund Bank:</p>
                    <p className="text-sm text-red-800">{selected.ablehnungsgrund_bank}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Kunden-Visitenkarte (read-only) */}
            <Card className="card-radius shadow-card border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground">{selected.typ} · {selected.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail size={13} /><span className="truncate">{selected.email || "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone size={13} /><span>{selected.phone || "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin size={13} /><span>{selected.ort || "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Euro size={13} /><span className="font-bold text-primary">{selected.budget || "–"}</span></div>
                </div>
                {selected.notiz && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote size={11} /> Makler-Notiz</p>
                    <p className="text-sm text-foreground mt-1">{selected.notiz}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Objekt-Karte (read-only) */}
            <Card className="card-radius shadow-card">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <Building size={13} /> Verknüpftes Objekt
                </h4>
                {objekt ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Adresse</span><span className="font-semibold text-foreground">{[objekt.strasse, objekt.hnr].filter(Boolean).join(" ")}, {objekt.plz} {objekt.ort}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Objektart</span><span className="font-semibold">{objekt.objektart || "–"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Zimmer / Fläche</span><span className="font-semibold">{objekt.zimmer ?? "–"} Zi · {objekt.flaeche_m2 ?? "–"} m²</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kaufpreis</span><span className="font-bold text-primary">{formatCurrency(objekt.kaufpreis)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{objekt.status}</Badge></div>
                    {objekt.kurzinfo && <p className="text-xs text-muted-foreground pt-2 border-t border-border">{objekt.kurzinfo}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Kein Objekt verknüpft.</p>
                )}
              </CardContent>
            </Card>

            {/* Admin: Interne Notizen */}
            <Card className="card-radius shadow-card border-amber-500/20">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <Lock size={13} className="text-amber-500" /> Interne Finanzierungs-Notizen
                </h4>
                <div className="space-y-2 mb-3">
                  {notizen.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Noch keine Notizen.</p>
                  ) : notizen.map(n => (
                    <div key={n.id} className="bg-accent rounded-xl p-3 border border-border">
                      <p className="text-sm text-foreground">{n.notiz}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
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
                  >
                    {savingNotiz ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Admin: Bank-Angebote */}
            <Card className="card-radius shadow-card border-amber-500/20">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <Lock size={13} className="text-amber-500" /> Bank-Angebote
                </h4>
                <p className="text-[10px] text-muted-foreground mb-3">Dokumente werden automatisch auch in der Kunden-Dokumentenliste sichtbar.</p>
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
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 mb-3"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? "Wird hochgeladen..." : "Bank-Angebot hochladen"}
                </button>
                {uploads.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Noch keine Bank-Angebote.</p>
                ) : (
                  <div className="space-y-2">
                    {uploads.map(u => (
                      <div key={u.id} className="flex items-center gap-3 bg-accent rounded-xl p-3 border border-border">
                        {getFileIcon(u.dateiname)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.dateiname}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(u.created_at)}</p>
                        </div>
                        <button onClick={() => handleDownload(u)} className="p-2 rounded-lg hover:bg-card transition-colors"><Download size={14} className="text-primary" /></button>
                        <button onClick={() => handleDeleteUpload(u)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={14} className="text-destructive" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
