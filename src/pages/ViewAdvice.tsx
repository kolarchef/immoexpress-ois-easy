import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendAction } from "@/lib/sendAction";

export default function ViewAdvice() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [advice, setAdvice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase
      .from("shared_advice")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        if (new Date(data.expires_at) < new Date()) { setExpired(true); }
        setAdvice(data);
        setLoading(false);
      });
  }, [id]);

  const handleConsent = async () => {
    // Log IP via customer_consent_log
    await supabase.from("customer_consent_log").insert({
      token: id || "unknown",
      accepted: true,
    });
    // Trigger Make webhook
    try {
      const webhookUrl = "https://hook.eu1.make.com/j5plnvxlv6hvmj1gr93qa5s5nk0hcb1l";
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: "view_advice_opened",
          data: { advice_id: id, timestamp: new Date().toISOString() },
        }),
      }).catch(() => {});
    } catch {}
    setConsented(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (!advice || !id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle size={40} className="text-destructive mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground">Link ungültig</h1>
          <p className="text-sm text-muted-foreground mt-1">Dieser Link existiert nicht oder wurde bereits entfernt.</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle size={40} className="text-destructive mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground">Link abgelaufen</h1>
          <p className="text-sm text-muted-foreground mt-1">Dieser Link war 14 Tage gültig und ist nun abgelaufen.</p>
        </div>
      </div>
    );
  }

  if (!consented) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-card border border-border max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={24} className="text-primary" />
            <h1 className="text-lg font-bold text-foreground">Datenschutzhinweis</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Durch Fortfahren bestätigen Sie, dass Sie den Haftungsausschluss zur Kenntnis nehmen.
            Diese KI-gestützte Information ersetzt keine Rechtsberatung. Ihre IP-Adresse wird aus
            Sicherheitsgründen protokolliert.
          </p>
          <button
            onClick={handleConsent}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors active:scale-95"
          >
            Zur Kenntnis genommen – Anzeigen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Rechtsauskunft</h1>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Bundesland: <strong className="text-foreground">{advice.bundesland}</strong></p>
          <p className="text-xs text-muted-foreground mb-3">Erstellt: {new Date(advice.created_at).toLocaleDateString("de-AT")} um {new Date(advice.created_at).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-sm text-foreground font-semibold mb-2">Frage: {advice.frage}</p>
          <div className="bg-accent rounded-xl p-4 border border-border">
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{advice.antwort}</p>
          </div>
        </div>

        <div className="p-4 bg-destructive/10 rounded-2xl border border-destructive/20">
          <p className="text-xs text-destructive font-medium">
            ⚠️ HAFTUNGSAUSSCHLUSS: Diese KI-gestützte Information ersetzt keine Rechtsberatung.
            Quelle: RIS (ris.bka.gv.at). Keine Haftung für Richtigkeit oder Vollständigkeit.
            Keine Rechtsberatung gemäß § 2 RAO.
          </p>
        </div>
      </div>
    </div>
  );
}
