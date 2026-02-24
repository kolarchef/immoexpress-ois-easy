import { useState, useEffect, useRef } from "react";
import { X, Calendar, Home, Key, FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function formatDate(dateStr: string) {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (detailTab === "dokumente" && selected) loadDokumente();
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
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
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
    await supabase.storage.from("kundenunterlagen").remove([dok.storage_path]);
    await supabase.from("crm_dokumente").delete().eq("id", dok.id);
    toast({ title: "Gelöscht", description: dok.dateiname });
    loadDokumente();
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors"><X size={18} /></button>
        </div>

        {/* Tab-Leiste */}
        <div className="flex gap-1 mb-4 bg-muted rounded-xl p-1">
          <button
            onClick={() => setDetailTab("info")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${detailTab === "info" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Info
          </button>
          <button
            onClick={() => setDetailTab("dokumente")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${detailTab === "dokumente" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileText size={13} /> Dokumente
          </button>
        </div>

        {detailTab === "info" ? (
          <>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Typ</span><span className="font-semibold">{selected.typ}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ort</span><span className="font-semibold">{selected.ort}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-bold text-primary">{selected.budget}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{selected.status}</span></div>

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar size={13} /> Newsletter-Trigger Daten
                  </p>
                  <button
                    onClick={() => {
                      if (!editDates) setEditedDates({ geburtsdatum: selected.geburtsdatum, kaufdatum: selected.kaufdatum, einzugsdatum: selected.einzugsdatum });
                      setEditDates(!editDates);
                    }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    {editDates ? "Abbrechen" : "✏️ Bearbeiten"}
                  </button>
                </div>

                {editDates ? (
                  <div className="space-y-3 bg-accent rounded-xl p-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Calendar size={11} /> Geburtsdatum</label>
                      <input type="date" value={editedDates.geburtsdatum} onChange={e => setEditedDates({ ...editedDates, geburtsdatum: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1"><Key size={11} /> Kaufdatum / Mietdatum</label>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-border">
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Calendar size={13} /> Geburtsdatum</span>
                      <span className={`font-semibold text-sm ${!selected.geburtsdatum ? "text-muted-foreground" : "text-foreground"}`}>
                        {formatDate(editedDates.geburtsdatum || selected.geburtsdatum)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border">
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Key size={13} /> Kauf-/Mietdatum</span>
                      <span className={`font-semibold text-sm ${!selected.kaufdatum ? "text-muted-foreground" : "text-foreground"}`}>
                        {formatDate(editedDates.kaufdatum || selected.kaufdatum)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><Home size={13} /> Einzugsdatum</span>
                      <span className={`font-semibold text-sm ${!selected.einzugsdatum ? "text-muted-foreground" : "text-foreground"}`}>
                        {formatDate(editedDates.einzugsdatum || selected.einzugsdatum)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-border"><span className="text-muted-foreground block mb-1">Notizen</span><p className="text-foreground">{selected.notiz}</p></div>
            </div>
            <div className="flex gap-2 mt-4">
              <a href={`tel:${selected.phone}`} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold text-center shadow-orange hover:bg-primary-dark transition-colors">Anrufen</a>
              <a href={`mailto:${selected.email}`} className="flex-1 bg-accent text-accent-foreground py-2.5 rounded-xl text-sm font-semibold text-center border border-border hover:bg-secondary transition-colors">E-Mail</a>
            </div>
          </>
        ) : (
          /* Dokumente Tab */
          <div className="space-y-3">
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold shadow-orange hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {uploading ? "Wird hochgeladen..." : "Dokument hochladen"}
            </button>

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
                    <FileText size={18} className="text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{dok.dateiname}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(dok.created_at)}</p>
                    </div>
                    <button onClick={() => handleDownload(dok)} className="p-2 rounded-lg hover:bg-card transition-colors" title="Herunterladen">
                      <Download size={15} className="text-primary" />
                    </button>
                    <button onClick={() => handleDelete(dok)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Löschen">
                      <Trash2 size={15} className="text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
