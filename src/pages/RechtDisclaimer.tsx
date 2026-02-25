import { useState } from "react";
import { Shield, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Kunden-Portal Disclaimer Seite
 * Externe Links landen hier, bevor ein PDF/Dokument angezeigt wird.
 * URL: /recht-disclaimer?token=XYZ&file=FILENAME
 */
export default function RechtDisclaimer() {
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const fileName = params.get("file") || "Dokument";

  const handleAccept = async () => {
    setLoading(true);
    try {
      await supabase.from("customer_consent_log").insert({
        token,
        accepted: true,
      } as any);
      setAccepted(true);
      toast({ title: "Bestätigt", description: "Sie können das Dokument jetzt herunterladen." });
    } catch {
      toast({ title: "Fehler", description: "Consent konnte nicht gespeichert werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-md p-6">
        {/* Logo / Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">Wichtiger Hinweis</h1>
            <p className="text-xs text-muted-foreground">ImmoExpress brainy · Rechtsinformation</p>
          </div>
        </div>

        {!accepted ? (
          <>
            {/* Disclaimer Text */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-5">
              <p className="text-sm text-foreground font-medium leading-relaxed">
                <strong>Achtung:</strong> Dies ist eine KI-gestützte Information und <strong>keine Rechtsberatung</strong>. 
                Wir übernehmen keine Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Informationen. 
                Die Nutzung erfolgt auf eigene Verantwortung.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Rechtsgrundlage: §§ 1-3 RAO, ABGB. Quelle: RIS (ris.bka.gv.at).
              </p>
            </div>

            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Wird bestätigt..." : "Akzeptieren & Dokument öffnen"}
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-green-600" />
            </div>
            <h2 className="font-bold text-foreground text-lg mb-2">Zugang bestätigt</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Dokument: <strong>{fileName}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Der Download wird automatisch gestartet. Falls nicht, kontaktieren Sie Ihren Makler.
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          © ImmoExpress brainy · Haftungsausschluss gem. § 2 RAO · Keine Rechtsberatung
        </p>
      </div>
    </div>
  );
}
