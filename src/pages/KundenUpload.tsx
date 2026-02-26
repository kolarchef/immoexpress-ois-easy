import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload, Camera, CheckCircle, FileText, Loader2, PenLine, Train, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo_immoexpress.png";

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
  const showSignature = searchParams.get("sig") === "1";
  const showTimestamp = searchParams.get("ts") === "1";
  const showScan = searchParams.get("scan") === "1";

  const [anfrage, setAnfrage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [uploadTimestamps, setUploadTimestamps] = useState<Record<string, string>>({});

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

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

  // Signature drawing
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const pos = "touches" in e ? e.touches[0] : e;
    ctx.beginPath();
    ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const pos = "touches" in e ? e.touches[0] : e;
    ctx.strokeStyle = "hsl(43,90%,55%)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

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

      const now = new Date().toISOString();
      await supabase.from("unterlagen_uploads").insert({
        anfrage_id: anfrage.id,
        dokument_typ: typ,
        dateiname: file.name,
        storage_path: path,
      });

      setUploads((prev) => ({ ...prev, [typ]: true }));
      if (showTimestamp) {
        setUploadTimestamps((prev) => ({ ...prev, [typ]: now }));
      }
      toast({ title: "✓ Hochgeladen", description: `${typ} wurde erfolgreich übermittelt.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleSubmitAll = async () => {
    if (showSignature && !hasSigned) {
      toast({ title: "Bitte unterschreiben", description: "Eine Unterschrift ist erforderlich.", variant: "destructive" });
      return;
    }
    // Upload signature as image
    if (showSignature && canvasRef.current && anfrage) {
      try {
        const blob = await new Promise<Blob | null>(resolve => canvasRef.current!.toBlob(resolve, "image/png"));
        if (blob) {
          const path = `${anfrage.id}/signatur_${Date.now()}.png`;
          await supabase.storage.from("kundenunterlagen").upload(path, blob);
          await supabase.from("unterlagen_uploads").insert({
            anfrage_id: anfrage.id,
            dokument_typ: "signatur",
            dateiname: "Unterschrift",
            storage_path: path,
          });
        }
      } catch {}
    }

    // Send notification to makler/trainee
    try {
      if (anfrage.kunde_id) {
        // Find the makler who owns this customer
        const { data: kunde } = await supabase
          .from("crm_kunden")
          .select("user_id, name")
          .eq("id", anfrage.kunde_id)
          .single();
        if (kunde?.user_id) {
          await supabase.from("nachrichten").insert({
            user_id: kunde.user_id,
            empfaenger_id: kunde.user_id,
            titel: `📄 Unterlagen eingegangen: ${anfrage.kunde_name}`,
            inhalt: `Der Kunde ${anfrage.kunde_name} hat alle angeforderten Unterlagen hochgeladen. Bitte prüfen Sie die Dokumente.`,
            typ: "system",
          });
        }
      }
    } catch {}

    setSubmitted(true);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,4%)] flex items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center max-w-sm">
          <FileText size={40} className="text-[hsl(43,90%,55%)] mx-auto mb-4" />
          <h1 className="text-lg font-bold text-white">Ungültiger Link</h1>
          <p className="text-sm text-white/50 mt-2">Dieser Upload-Link ist nicht gültig. Bitte kontaktieren Sie Ihren Makler.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,4%)] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[hsl(43,90%,55%)]" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,4%)] flex items-center justify-center p-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-[hsl(43,90%,55%)]/20 text-center max-w-sm animate-fade-in space-y-4">
          <div className="w-16 h-16 bg-[hsl(43,90%,55%)]/20 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-[hsl(43,90%,55%)]" />
          </div>
          <h1 className="text-xl font-bold text-[hsl(43,90%,55%)]">Erfolgreich übermittelt!</h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Unterlagen erfolgreich in den Immo Express geladen. Vielen Dank!
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Train size={16} className="text-[hsl(43,90%,55%)]" />
            <span className="text-xs text-white/40">Immo Express brainy</span>
          </div>
        </div>
      </div>
    );
  }

  const checkliste: string[] = anfrage?.checkliste || DOKUMENT_TYPEN.map((d) => d.key);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,4%)] p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6 pt-6 space-y-3">
        <img
          src={logoImg}
          alt="ImmoExpress"
          className="h-14 w-14 rounded-2xl mx-auto shadow-lg ring-2 ring-[hsl(43,90%,55%)]/40"
        />
        <h1 className="text-xl font-bold text-[hsl(43,90%,55%)]">Unterlagen hochladen</h1>
        <p className="text-sm text-white/60">
          Bitte laden Sie die angeforderten Dokumente hoch.
          {anfrage?.kunde_name && <> · Für: <strong className="text-white/80">{anfrage.kunde_name}</strong></>}
        </p>
      </div>

      {/* Document Cards */}
      <div className="space-y-3">
        {DOKUMENT_TYPEN.filter((d) => checkliste.includes(d.key)).map((dok) => (
          <div key={dok.key} className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {uploads[dok.key] ? (
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[hsl(43,90%,55%)]/20 flex items-center justify-center">
                    <FileText size={20} className="text-[hsl(43,90%,55%)]" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{dok.label}</p>
                  <p className="text-xs text-white/40">
                    {uploads[dok.key] ? "Hochgeladen ✓" : "Noch ausstehend"}
                  </p>
                  {/* Timestamp display */}
                  {showTimestamp && uploadTimestamps[dok.key] && (
                    <p className="text-[10px] text-[hsl(43,90%,55%)]/70 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {new Date(uploadTimestamps[dok.key]).toLocaleString("de-AT")}
                    </p>
                  )}
                </div>
              </div>

              {!uploads[dok.key] && (
                <div className="flex gap-2">
                  {/* Scan / Camera button */}
                  {showScan ? (
                    <label className="cursor-pointer bg-[hsl(43,90%,55%)] text-black rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all">
                      {uploading === dok.key ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      Scan
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload(dok.key, e.target.files[0])} />
                    </label>
                  ) : (
                    <label className="cursor-pointer bg-[hsl(43,90%,55%)] text-black rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all">
                      {uploading === dok.key ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      Foto
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload(dok.key, e.target.files[0])} />
                    </label>
                  )}
                  <label className="cursor-pointer bg-white/10 text-white border border-white/20 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 hover:bg-white/15 transition-all">
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

      {/* Signature Field - only if enabled */}
      {showSignature && (
        <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[hsl(43,90%,55%)] flex items-center gap-2">
              <PenLine size={16} /> Unterschrift
            </h3>
            {hasSigned && (
              <button onClick={clearSignature} className="text-xs text-white/40 hover:text-white/60 transition-colors">
                Löschen
              </button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={380}
            height={120}
            className="w-full rounded-xl bg-white/5 border border-white/10 touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <p className="text-[10px] text-white/30 text-center">Bitte unterschreiben Sie hier mit dem Finger oder der Maus</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmitAll}
        className="w-full mt-4 bg-[hsl(43,90%,55%)] hover:bg-[hsl(43,90%,48%)] text-black font-bold rounded-xl h-12 text-base shadow-lg shadow-[hsl(43,90%,55%)]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        <Train size={18} />
        Unterlagen absenden
      </button>

      {/* DSGVO Notice */}
      <div className="mt-4 bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
        <p className="text-xs text-white/40 text-center">
          🔒 Ihre Daten werden verschlüsselt übertragen und DSGVO-konform verarbeitet.
        </p>
      </div>
    </div>
  );
}
