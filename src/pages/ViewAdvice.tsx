import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo_immoexpress.png";

export default function ViewAdvice() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [advice, setAdvice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [consented, setConsented] = useState(false);
  const [maklerName, setMaklerName] = useState("");

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase
      .from("shared_advice")
      .select("*")
      .eq("id", id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        if (new Date(data.expires_at) < new Date()) { setExpired(true); }
        setAdvice(data);
        // Fetch makler display name
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", data.user_id)
          .maybeSingle();
        if (profile?.display_name) setMaklerName(profile.display_name);
        setLoading(false);
      });
  }, [id]);

  const handleConsent = async () => {
    await supabase.from("customer_consent_log").insert({
      token: id || "unknown",
      accepted: true,
    });
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
    <div className="min-h-screen bg-background p-4 lg:p-8 relative overflow-hidden">
      {/* Diagonal Watermark */}
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center z-0"
        aria-hidden="true"
      >
        <p
          className="text-[3.5rem] lg:text-[5rem] font-bold whitespace-nowrap select-none"
          style={{
            transform: "rotate(-35deg)",
            color: "hsl(var(--muted-foreground) / 0.07)",
            letterSpacing: "0.05em",
          }}
        >
          Rechtsinformation gem. § 2 RAO
        </p>
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-3">
          <img src={logoImg} alt="ImmoExpress Logo" className="h-9 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Rechtsauskunft</h1>
            <p className="text-xs text-muted-foreground">ImmoExpress brainy</p>
          </div>
        </div>

        {/* Disclaimer at top – prominent but tasteful */}
        <div className="p-3.5 bg-destructive/10 rounded-2xl border border-destructive/20 mb-5">
          <p className="text-xs text-destructive font-medium leading-relaxed">
            ⚠️ HAFTUNGSAUSSCHLUSS: Diese KI-gestützte Information ersetzt keine Rechtsberatung.
            Quelle: RIS (ris.bka.gv.at). Keine Haftung für Richtigkeit oder Vollständigkeit.
            Keine Rechtsberatung gemäß § 2 RAO.
          </p>
        </div>

        {/* Content card */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 mb-5">
          <p className="text-xs text-muted-foreground mb-1">Bundesland: <strong className="text-foreground">{advice.bundesland}</strong></p>
          <p className="text-xs text-muted-foreground mb-3">Erstellt: {new Date(advice.created_at).toLocaleDateString("de-AT")} um {new Date(advice.created_at).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}</p>
          <p className="text-sm text-foreground font-semibold mb-2">Frage: {advice.frage}</p>
          <div className="bg-accent rounded-xl p-4 border border-border">
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{advice.antwort}</p>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-5 flex items-start gap-4">
          <img src={logoImg} alt="ImmoExpress" className="h-12 w-auto flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              LG {maklerName || "Dominik Kebhart"}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              ImmoExpress Immobilientreuhand GmbH<br />
              Schottenfeldgasse 78/5<br />
              1070 Wien, Österreich<br />
              Tel: +43 1 997 19 52<br />
              office@immoexpress.at
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
