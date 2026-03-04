import { useState, useEffect, useRef } from "react";
import { X, Calendar, Home, Key, FileText, Upload, Download, Trash2, Loader2, Send, CheckCircle, FileSpreadsheet, File, ClipboardCheck, CircleCheck, Circle, Lock, History, StickyNote, Pencil, Save, User, Phone, Mail, MapPin, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { sendAction } from "@/lib/sendAction";
import { Card, CardContent } from "@/components/ui/card";

const CHECKLIST_ITEMS = [
  { key: "grundbuch", label: "Grundbuchauszug", pflicht: true, patterns: ["grundbuch"] },
  { key: "gehalt", label: "Gehaltszettel (3 Monate)", pflicht: true, patterns: ["gehalt", "lohn", "einkommens"] },
  { key: "ausweis", label: "Lichtbildausweis", pflicht: true, patterns: ["ausweis", "reisepass", "führerschein", "personalausweis"] },
  { key: "objektdaten", label: "Objektdaten-Blatt", pflicht: false, patterns: ["objektdaten", "objektblatt"] },
] as const;

function formatDate(dateStr: string) {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return <FileText size={18} className="text-destructive flex-shrink-0" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={18} className="text-green-600 flex-shrink-0" />;
  if (["doc", "docx"].includes(ext)) return <File size={18} className="text-blue-600 flex-shrink-0" />;
  return <FileText size={18} className="text-primary flex-shrink-0" />;
}

type Dok = { id: string; dateiname: string; storage_path: string; created_at: string };

interface Props {
  selected: any;
  editDates: boolean;
  setEditDates: (v: boolean) => void;
  editedDates: { geburtsdatum: string; kaufdatum: string; einzugsdatum: string };
  setEditedDates: (v: any) => void;
  onClose: () => void;
  detailTab: "info" | "dokumente";
  setDetailTab: (v: "info" | "dokumente") => void;
  user: any;
}

export default function CrmDetailModal({ selected, editDates, setEditDates, editedDates, setEditedDates, onClose, detailTab, setDetailTab, user }: Props) {
  const [dokumente, setDokumente] = useState<Dok[]>([]);
  const [loadingDoks, setLoadingDoks] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [financeShared, setFinanceShared] = useState(selected.finance_shared ?? false);
  const [financeStatus, setFinanceStatus] = useState<string>(selected.finance_status ?? "offen");
  const [sendingFinance, setSendingFinance] = useState(false);

  const [showChecklist, setShowChecklist] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Stammdaten editing
  const [editStamm, setEditStamm] = useState(false);
  const [stammData, setStammData] = useState({
    name: selected.name || "",
    email: selected.email || "",
    phone: selected.phone || "",
    typ: selected.typ || "Käufer",
    ort: selected.ort || "",
    budget: selected.budget || "",
  });
  const [savingStamm, setSavingStamm] = useState(false);

  const isLocked = financeStatus === "uebertragen" || financeStatus === "abgeschlossen";

  const detectedItems = CHECKLIST_ITEMS.reduce<Record<string, string | null>>((acc, item) => {
    const found = dokumente.find(dok =>
      item.patterns.some(p => dok.dateiname.toLowerCase().includes(p))
    );
    acc[item.key] = found ? found.dateiname : null;
    return acc;
  }, {});
  const allPflichtChecked = CHECKLIST_ITEMS.filter(i => i.pflicht).every(i => detectedItems[i.key]);

  useEffect(() => {
    if (selected) loadDokumente();
  }, [detailTab, selected]);

  const loadDokumente = async () => {
    setLoadingDoks(true);
    const { data } = await supabase
      .from("crm_dokumente")
      .select("*")
      .eq("kunde_id", selected.id)
      .order("created_at", { ascending: false });
    setDokumente((data as Dok[]) || []);
    setLoadingDoks(false);
  };

  const handleUpload = async (file: File) => {
    if (!user || isLocked) return;
    setUploading(true);
    try {
      const path = `crm/${selected.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("kundenunterlagen").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("crm_dokumente").insert({
        kunde_id: selected.id,
        user_id: user.id,
        dateiname: file.name,
        storage_path: path,
      });
      if (dbErr) throw dbErr;
      toast({ title: "✓ Hochgeladen", description: file.name });
      loadDokumente();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (dok: Dok) => {
    const { data } = supabase.storage.from("kundenunterlagen").getPublicUrl(dok.storage_path);
    window.open(data.publicUrl, "_blank");
  };

  const handleDelete = async (dok: Dok) => {
    if (isLocked) return;
    await supabase.storage.from("kundenunterlagen").remove([dok.storage_path]);
    await supabase.from("crm_dokumente").delete().eq("id", dok.id);
    toast({ title: "Gelöscht", description: dok.dateiname });
    loadDokumente();
  };

  const handleSaveStamm = async () => {
    setSavingStamm(true);
    try {
      const { error } = await supabase.from("customers" as any).update({
        vorname: stammData.name.split(" ")[0]?.trim() || "",
        nachname: stammData.name.split(" ").slice(1).join(" ")?.trim() || "",
        email: stammData.email.trim(),
        mobiltelefon: stammData.phone.trim(),
        typ: stammData.typ,
        ort: stammData.ort.trim(),
        budget: stammData.budget.trim(),
      } as any).eq("id", selected.id);
      if (error) throw error;
      // Update selected object in parent (reflected on next open)
      Object.assign(selected, stammData);
      setEditStamm(false);
      toast({ title: "✓ Stammdaten gespeichert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSavingStamm(false);
    }
  };

  const handleSendFinance = async () => {
    if (financeShared || sendingFinance) return;
    setSendingFinance(true);
    try {
      await sendAction("finance_transfer", {
        kunde_id: selected.id,
        kunde_name: selected.name,
        email: selected.email,
        phone: selected.phone,
        budget: selected.budget,
      });
      await supabase.from("customers" as any).update({ finance_shared: true, finance_status: "uebertragen" } as any).eq("id", selected.id);
      setFinanceShared(true);
      setFinanceStatus("uebertragen");
      toast({ title: "✓ Übertragen", description: `${selected.name} an Finanzierung gesendet.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSendingFinance(false);
    }
  };

  const financeStatusLabel: Record<string, { color: string; label: string }> = {
    uebertragen: { color: "bg-blue-100 text-blue-700", label: "🔵 Übertragen – Schreibschutz aktiv" },
    nachfordern: { color: "bg-yellow-100 text-yellow-700", label: "🟡 Infos nachfordern" },
    abgeschlossen: { color: "bg-green-100 text-green-700", label: "🟢 Finanzierung abgeschlossen" },
    storniert: { color: "bg-red-100 text-red-700", label: "🔴 Finanzierung storniert" },
  };

  const statusInfo = financeStatus !== "offen" ? financeStatusLabel[financeStatus] : null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-surface rounded-2xl shadow-md-custom border border-border w-full max-w-4xl animate-fade-in max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-card rounded-t-2xl px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{selected.name?.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
              <p className="text-xs text-muted-foreground">{selected.typ} · {selected.ort || "–"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && financeStatus !== "abgeschlossen" && financeStatus !== "storniert" && (
              <button
                onClick={() => {
                  if (financeShared) return;
                  loadDokumente().then(() => setShowChecklist(true));
                }}
                disabled={financeShared || sendingFinance}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  financeShared
                    ? "bg-green-600 text-white cursor-default"
                    : "bg-primary text-primary-foreground shadow-orange hover:opacity-90"
                }`}
              >
                {sendingFinance ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : financeShared ? (
                  <CheckCircle size={13} />
                ) : (
                  <Send size={13} />
                )}
                {financeShared ? "Übertragen ✓" : "An Finanzierung senden"}
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Finance Status Banner */}
          {statusInfo && (
            <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${statusInfo.color}`}>
              {isLocked && <Lock size={13} />}
              {statusInfo.label}
            </div>
          )}

          {/* Ablehnungsgrund */}
          {financeStatus === "storniert" && selected.ablehnungsgrund_bank && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-red-700 mb-1">Ablehnungsgrund Bank:</p>
              <p className="text-sm text-red-800">{selected.ablehnungsgrund_bank}</p>
            </div>
          )}

          {/* Checkliste Overlay */}
          {showChecklist && (
            <Card className="card-radius border-primary/20 animate-fade-in">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <ClipboardCheck size={15} className="text-primary" /> Vor-Sende-Checkliste
                  </h3>
                  <button onClick={() => setShowChecklist(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map(item => {
                    const found = detectedItems[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          found ? "border-green-300 bg-green-50" : "border-destructive/20 bg-destructive/5"
                        }`}
                      >
                        {found ? <CircleCheck size={16} className="text-green-500 flex-shrink-0" /> : <Circle size={16} className="text-destructive flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs ${found ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{item.label}</span>
                          {found && <p className="text-[10px] text-green-600 truncate">✓ {found}</p>}
                          {!found && <p className="text-[10px] text-destructive">Nicht gefunden</p>}
                        </div>
                        {item.pflicht && <span className={`text-[9px] font-bold ${found ? "text-green-600" : "text-destructive"}`}>{found ? "OK" : "Pflicht"}</span>}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setShowChecklist(false); handleSendFinance(); }}
                  disabled={!allPflichtChecked || sendingFinance}
                  className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    allPflichtChecked
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-lg"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {sendingFinance ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {allPflichtChecked ? "Jetzt an Finanzierung senden" : "Pflicht-Dokumente fehlen"}
                </button>
              </CardContent>
            </Card>
          )}

          {/* Tab-Leiste */}
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(["info", "dokumente"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${detailTab === tab ? "bg-primary text-primary-foreground shadow-orange" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab === "dokumente" && <FileText size={13} />}
                {tab === "info" ? "Info" : "Dokumente"}
              </button>
            ))}
          </div>

          {detailTab === "info" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Stammdaten */}
              <Card className="card-radius shadow-card">
                <CardContent className="p-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Stammdaten</h4>
                    {!isLocked && (
                      <button
                        onClick={() => {
                          if (editStamm) {
                            setEditStamm(false);
                          } else {
                            setStammData({
                              name: selected.name || "",
                              email: selected.email || "",
                              phone: selected.phone || "",
                              typ: selected.typ || "Käufer",
                              ort: selected.ort || "",
                              budget: selected.budget || "",
                            });
                            setEditStamm(true);
                          }
                        }}
                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        {editStamm ? <X size={11} /> : <Pencil size={11} />}
                        {editStamm ? "Abbrechen" : "Bearbeiten"}
                      </button>
                    )}
                  </div>

                  {editStamm ? (
                    <div className="space-y-2.5">
                      <StammInput icon={<User size={12} />} label="Name" value={stammData.name} onChange={(v) => setStammData({ ...stammData, name: v })} />
                      <StammInput icon={<Mail size={12} />} label="E-Mail" value={stammData.email} onChange={(v) => setStammData({ ...stammData, email: v })} type="email" />
                      <StammInput icon={<Phone size={12} />} label="Telefon" value={stammData.phone} onChange={(v) => setStammData({ ...stammData, phone: v })} type="tel" />
                      <div>
                        <label className="text-xs text-muted-foreground font-semibold block mb-1">Typ</label>
                        <select
                          value={stammData.typ}
                          onChange={(e) => setStammData({ ...stammData, typ: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                        >
                          {["Käufer", "Verkäufer", "Mieter", "Vermieter", "Interessent"].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <StammInput icon={<MapPin size={12} />} label="Ort" value={stammData.ort} onChange={(v) => setStammData({ ...stammData, ort: v })} />
                      <StammInput icon={<DollarSign size={12} />} label="Budget" value={stammData.budget} onChange={(v) => setStammData({ ...stammData, budget: v })} />
                      <button
                        onClick={handleSaveStamm}
                        disabled={savingStamm}
                        className="w-full bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {savingStamm ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Stammdaten speichern
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-semibold">{selected.name}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">E-Mail</span><span className="font-semibold text-xs">{selected.email || "–"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Telefon</span><span className="font-semibold">{selected.phone || "–"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Typ</span><span className="font-semibold">{selected.typ}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Ort</span><span className="font-semibold">{selected.ort || "–"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-bold text-primary">{selected.budget || "–"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{selected.status}</span></div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Dokumenten-Status */}
              <Card className="card-radius shadow-card">
                <CardContent className="p-5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FileText size={12} className="text-primary" /> Dokumenten-Status
                  </h4>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map(item => {
                      const found = detectedItems[item.key];
                      return (
                        <div key={item.key} className="flex items-center gap-2.5">
                          {found ? (
                            <button
                              onClick={() => {
                                const dok = dokumente.find(d => d.dateiname.toLowerCase().includes(item.patterns[0]));
                                if (dok) handleDownload(dok);
                              }}
                              className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
                              title={`Öffnen: ${found}`}
                            >
                              {getFileIcon(found)}
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <Circle size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${found ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{item.label}</p>
                            {found && <p className="text-[10px] text-green-600 truncate">{found}</p>}
                          </div>
                          {item.pflicht && !found && <span className="text-[9px] font-bold text-destructive">Pflicht</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Daten & Notizen */}
              <Card className="card-radius shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar size={12} /> Termine & Daten
                    </h4>
                    {!isLocked && (
                      <button
                        onClick={() => {
                          if (!editDates) setEditedDates({ geburtsdatum: selected.geburtsdatum, kaufdatum: selected.kaufdatum, einzugsdatum: selected.einzugsdatum });
                          setEditDates(!editDates);
                        }}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        {editDates ? "Abbrechen" : "✏️ Bearbeiten"}
                      </button>
                    )}
                  </div>

                  {editDates && !isLocked ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Calendar size={11} /> Geburtsdatum</label>
                        <input type="date" value={editedDates.geburtsdatum} onChange={e => setEditedDates({ ...editedDates, geburtsdatum: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Key size={11} /> Kaufdatum</label>
                        <input type="date" value={editedDates.kaufdatum} onChange={e => setEditedDates({ ...editedDates, kaufdatum: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Home size={11} /> Einzugsdatum</label>
                        <input type="date" value={editedDates.einzugsdatum} onChange={e => setEditedDates({ ...editedDates, einzugsdatum: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                      </div>
                      <button onClick={() => setEditDates(false)} className="w-full bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95">
                        ✓ Daten speichern
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between py-1.5 border-b border-border">
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Calendar size={12} /> Geburtsdatum</span>
                        <span className="font-semibold text-foreground">{formatDate(editedDates.geburtsdatum || selected.geburtsdatum)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-border">
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Key size={12} /> Kauf-/Mietdatum</span>
                        <span className="font-semibold text-foreground">{formatDate(editedDates.kaufdatum || selected.kaufdatum)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Home size={12} /> Einzugsdatum</span>
                        <span className="font-semibold text-foreground">{formatDate(editedDates.einzugsdatum || selected.einzugsdatum)}</span>
                      </div>
                    </div>
                  )}

                  {selected.notiz && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-muted-foreground block mb-1 text-xs font-semibold uppercase">Notizen</span>
                      <div className="note-highlight"><p className="text-foreground text-sm">{selected.notiz}</p></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Actions */}
              <div className="md:col-span-2 flex gap-2">
                <a href={`tel:${selected.phone}`} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold text-center shadow-orange hover:opacity-90 transition-colors">Anrufen</a>
                <a href={`mailto:${selected.email}`} className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold text-center border border-border hover:bg-secondary transition-colors">E-Mail</a>
              </div>
            </div>
          ) : (
            /* Dokumente Tab */
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.png"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              {isLocked ? (
                <div className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground py-2.5 rounded-xl text-sm font-semibold">
                  <Lock size={15} /> Schreibschutz – Upload gesperrt
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? "Wird hochgeladen..." : "Dokument hochladen"}
                </button>
              )}
              <p className="text-xs text-muted-foreground text-center">PDF, Word, Excel, Bilder</p>

              {loadingDoks ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
              ) : dokumente.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Noch keine Dokumente vorhanden</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dokumente.map(dok => (
                    <div key={dok.id} className="flex items-center gap-3 bg-accent rounded-xl p-3 border border-border">
                      {getFileIcon(dok.dateiname)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{dok.dateiname}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(dok.created_at)}</p>
                      </div>
                      <button onClick={() => handleDownload(dok)} className="p-2 rounded-lg hover:bg-card transition-colors" title="Herunterladen">
                        <Download size={15} className="text-primary" />
                      </button>
                      {!isLocked && (
                        <button onClick={() => handleDelete(dok)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Löschen">
                          <Trash2 size={15} className="text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StammInput({ icon, label, value, onChange, type = "text" }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground font-semibold block mb-1 flex items-center gap-1">{icon} {label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
      />
    </div>
  );
}
