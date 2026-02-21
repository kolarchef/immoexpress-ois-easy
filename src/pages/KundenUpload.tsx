import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload, Camera, CheckCircle, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const DOKUMENT_TYPEN = [
  { key: "strom", label: "Strom-Foto (Zählerstand)" },
  { key: "wasser", label: "Wasserzähler" },
  { key: "reisepass", label: "Reisepass / Ausweis" },
  { key: "mietvertrag", label: "Mietvertrag" },
  { key: "grundbuch", label: "Grundbuchauszug" },
];

export default function KundenUpload() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [anfrage, setAnfrage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);

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
        const { data: existing } = await supabase
          .from("unterlagen_uploads")
          .select("dokument_typ")
          .eq("anfrage_id", data.id);
        const done: Record<string, boolean> = {};
        existing?.forEach((u: any) => { done[u.dokument_typ] = true; });
        setUploads(done);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleUpload = async (typ: string, file: File) => {
    if (!anfrage) return;
    setUploading(typ);
    try {
      const ext = file.name.split(".").pop();
      const path = `${anfrage.id}/${typ}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("kundenunterlagen")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      await supabase.from("unterlagen_uploads").insert({
        anfrage_id: anfrage.id,
        dokument_typ: typ,
        dateiname: file.name,
        storage_path: path,
      });

      setUploads((prev) => ({ ...prev, [typ]: true }));
      toast({ title: "✓ Hochgeladen", description: `${typ} wurde erfolgreich übermittelt.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
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

  const checkliste: string[] = anfrage?.checkliste || DOKUMENT_TYPEN.map((d) => d.key);

  return (
    <div className="min-h-screen bg-surface p-4 max-w-lg mx-auto">
      <div className="text-center mb-6 pt-6">
        <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Upload size={24} className="text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Unterlagen hochladen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bitte laden Sie die angeforderten Dokumente hoch.
          {anfrage?.kunde_name && <> · Für: <strong>{anfrage.kunde_name}</strong></>}
        </p>
      </div>

      <div className="space-y-3">
        {DOKUMENT_TYPEN.filter((d) => checkliste.includes(d.key)).map((dok) => (
          <div key={dok.key} className="bg-card rounded-2xl p-4 shadow-card border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {uploads[dok.key] ? (
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                    <FileText size={20} className="text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{dok.label}</p>
                  <p className="text-xs text-muted-foreground">{uploads[dok.key] ? "Hochgeladen ✓" : "Noch ausstehend"}</p>
                </div>
              </div>

              {!uploads[dok.key] && (
                <div className="flex gap-2">
                  <label className="cursor-pointer bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all">
                    {uploading === dok.key ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    Foto
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(dok.key, e.target.files[0])} />
                  </label>
                  <label className="cursor-pointer bg-accent text-foreground border border-border rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:bg-secondary transition-all">
                    <Upload size={14} />
                    Datei
                    <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(dok.key, e.target.files[0])} />
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-accent rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          🔒 Ihre Daten werden verschlüsselt übertragen und DSGVO-konform verarbeitet.
        </p>
      </div>
    </div>
  );
}
