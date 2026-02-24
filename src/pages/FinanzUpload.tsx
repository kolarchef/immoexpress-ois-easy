import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload, Camera, CheckCircle, FileText, Loader2, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

/**
 * Pflichtdokument-Patterns (must match FinanzTresor CHECKLIST_ITEMS)
 */
const CHECKLIST_ITEMS = [
  { key: "grundbuch", label: "Grundbuchauszug", patterns: ["grundbuch"] },
  { key: "gehalt", label: "Gehaltszettel (3 Monate)", patterns: ["gehalt", "lohn", "einkommens"] },
  { key: "ausweis", label: "Lichtbildausweis", patterns: ["ausweis", "reisepass", "führerschein", "personalausweis"] },
  { key: "objektdaten", label: "Objektdaten-Blatt", patterns: ["objektdaten", "objektblatt"] },
];

function detectCategory(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const item of CHECKLIST_ITEMS) {
    if (item.patterns.some(p => lower.includes(p))) return item.key;
  }
  return null;
}

export default function FinanzUpload() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [anfrage, setAnfrage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadedKeys, setUploadedKeys] = useState<Set<string>>(new Set());
  const [sonstigeUploads, setSonstigeUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const sonstigeRef = useRef<HTMLInputElement>(null);
  const sonstigeCamRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from("unterlagen_anfragen")
        .select("*")
        .eq("token", token)
        .single();
      setAnfrage(data);
      if (data) {
        // Load existing uploads
        const { data: existing } = await supabase
          .from("unterlagen_uploads")
          .select("dokument_typ, dateiname")
          .eq("anfrage_id", data.id);
        const keys = new Set<string>();
        const sonstige: string[] = [];
        existing?.forEach((u: any) => {
          if (u.dokument_typ === "sonstige") {
            sonstige.push(u.dateiname);
          } else {
            keys.add(u.dokument_typ);
          }
        });
        setUploadedKeys(keys);
        setSonstigeUploads(sonstige);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleUpload = async (kategorie: string, file: File) => {
    if (!anfrage) return;
    setUploading(kategorie);
    try {
      const ext = file.name.split(".").pop();
      const path = `${anfrage.id}/${kategorie}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("kundenunterlagen")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("unterlagen_uploads").insert({
        anfrage_id: anfrage.id,
        dokument_typ: kategorie,
        dateiname: file.name,
        storage_path: path,
      });

      if (kategorie === "sonstige") {
        setSonstigeUploads(prev => [...prev, file.name]);
      } else {
        setUploadedKeys(prev => new Set([...prev, kategorie]));
      }
      toast({ title: "✓ Hochgeladen", description: file.name });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleSmartUpload = async (file: File) => {
    const category = detectCategory(file.name);
    await handleUpload(category || "sonstige", file);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl p-8 shadow-card border border-border text-center max-w-sm">
          <FileText size={40} className="text-muted-foreground mx-auto mb-4" />
          <h1 className="text-lg font-bold text-foreground">Ungültiger Link</h1>
          <p className="text-sm text-muted-foreground mt-2">Dieser Upload-Link ist nicht gültig. Bitte kontaktieren Sie Ihren Makler.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!anfrage) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl p-8 shadow-card border border-border text-center max-w-sm">
          <FileText size={40} className="text-muted-foreground mx-auto mb-4" />
          <h1 className="text-lg font-bold text-foreground">Link abgelaufen</h1>
          <p className="text-sm text-muted-foreground mt-2">Diese Anfrage existiert nicht mehr.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 max-w-lg mx-auto">
      <div className="text-center mb-6 pt-6">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Upload size={24} className="text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Unterlagen hochladen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bitte laden Sie die angeforderten Dokumente hoch.
          {anfrage.kunde_name && <> · Für: <strong>{anfrage.kunde_name}</strong></>}
        </p>
      </div>

      {/* PFLICHTDOKUMENTE */}
      <h2 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">Pflichtdokumente</h2>
      <div className="space-y-3 mb-6">
        {CHECKLIST_ITEMS.map(item => {
          const done = uploadedKeys.has(item.key);
          return (
            <div key={item.key} className="bg-card rounded-2xl p-4 shadow-card border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {done ? (
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{done ? "Hochgeladen ✓" : "Noch ausstehend"}</p>
                  </div>
                </div>

                {!done && (
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all">
                      {uploading === item.key ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      Foto
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => e.target.files?.[0] && handleUpload(item.key, e.target.files[0])} />
                    </label>
                    <label className="cursor-pointer bg-accent text-foreground border border-border rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:bg-secondary transition-all">
                      <Upload size={14} />
                      Datei
                      <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                        onChange={e => e.target.files?.[0] && handleUpload(item.key, e.target.files[0])} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SONSTIGE UNTERLAGEN */}
      <h2 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <FolderOpen size={14} className="text-primary" /> Sonstige Unterlagen
      </h2>
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-3">
        <p className="text-xs text-muted-foreground mb-3">
          Weitere Dokumente oder Fotos, die nicht zu den Pflichtdokumenten gehören.
        </p>
        {sonstigeUploads.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {sonstigeUploads.map((name, i) => (
              <div key={i} className="flex items-center gap-2 bg-green-50 rounded-xl p-2 border border-green-200">
                <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                <span className="text-xs text-foreground truncate">{name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input ref={sonstigeCamRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload("sonstige", e.target.files[0])} />
          <input ref={sonstigeRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload("sonstige", e.target.files[0])} />
          <Button
            size="sm"
            className="rounded-xl gap-1.5 flex-1"
            onClick={() => sonstigeCamRef.current?.click()}
            disabled={uploading === "sonstige"}
          >
            {uploading === "sonstige" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            Foto aufnehmen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 flex-1"
            onClick={() => sonstigeRef.current?.click()}
            disabled={uploading === "sonstige"}
          >
            <Upload size={14} /> Datei wählen
          </Button>
        </div>
      </div>

      {/* Smart Upload – Auto-Sortierung */}
      <div className="bg-accent rounded-2xl p-4 border border-border mb-4">
        <p className="text-xs font-semibold text-foreground mb-2">📂 Automatische Zuordnung</p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Laden Sie eine beliebige Datei hoch – sie wird automatisch dem passenden Pflichtfeld zugeordnet oder unter „Sonstige" einsortiert.
        </p>
        <label className="cursor-pointer w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          Datei automatisch zuordnen
          <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
            onChange={e => e.target.files?.[0] && handleSmartUpload(e.target.files[0])} />
        </label>
      </div>

      <div className="bg-accent rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          🔒 Ihre Daten werden verschlüsselt übertragen und DSGVO-konform verarbeitet.
        </p>
      </div>
    </div>
  );
}
