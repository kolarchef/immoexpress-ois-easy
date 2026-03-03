import { useState, useEffect, useRef } from "react";
import { Shield, ChevronDown, Search, Download, Loader2, Lock, Check, ArrowRight, MapPin, Landmark, Mountain, Trees, Building2, Waves, Factory, Grape, Castle, MessageCircle, Mail } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import HaftungsModal from "@/components/HaftungsModal";
import { sendAction, } from "@/lib/sendAction";
import { ACTION_IDS } from "@/lib/webhookService";
import jsPDF from "jspdf";

const HAFTUNGSTEXT = `HAFTUNGSAUSSCHLUSS – ImmoExpress brainy: Diese Anwendung stellt ausschließlich allgemeine Informationen bereit und ersetzt keine individuelle Rechtsberatung. Die bereitgestellten Inhalte wurden mithilfe von Künstlicher Intelligenz generiert und basieren auf öffentlich zugänglichen Quellen des Rechtsinformationssystems des Bundes (RIS – ris.bka.gv.at). Es wird keine Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der Informationen übernommen. Für verbindliche Rechtsauskünfte wenden Sie sich bitte an einen Rechtsanwalt oder Notar. Keine Rechtsberatung gemäß § 2 RAO. Erstellt durch KI-Assistenz System ImmoExpress brainy.`;

const bundeslaender = [
  { name: "Wien", kuerzel: "W", icon: Landmark, gesetze: [
    { titel: "Maklergesetz (MaklerG)", text: "Makler in Wien unterliegen dem Maklergesetz BGBl I 1996/262. Die Maklergebühr (Provision) beträgt bei Kauf max. 3% + 20% MwSt. des Kaufpreises auf beiden Seiten (Käufer & Verkäufer)." },
    { titel: "Alleinvermittlung (Wiener Praxis)", text: "Alleinvermittlungsverträge sind in Wien üblich. Gemäß § 14 MaklerG entsteht der Provisionsanspruch auch ohne Abschluss, wenn der Auftraggeber vertragswidrig handelt." },
    { titel: "IMV & Nebenkostenübersicht", text: "Gemäß Immobilienmaklerverordnung (IMV BGBl II 1996/297) muss der Makler eine vollständige Nebenkostenübersicht bereitstellen: Grundbucheintragungsgebühr 1,1%, Grunderwerbsteuer 3,5%, Vertragserrichtungskosten ca. 1-2%." },
    { titel: "Finanzamt-Gebühren Wien", text: "Grunderwerbsteuer: 3,5% (bei nahen Angehörigen abgestuft). Eintragungsgebühr: 1,1% des Kaufpreises. Immobilienertragssteuer (ImmoESt): 30% des Veräußerungsgewinns." },
  ]},
  { name: "Niederösterreich", kuerzel: "NÖ", icon: Trees, gesetze: [
    { titel: "Maklerrecht NÖ", text: "In NÖ gelten bundesweites MaklerG sowie landesspezifische Regelungen für Bauland-Widmungen gem. NÖ ROG 2014. Besonderheit: Landwirtschaftliche Grundstücke unterliegen dem NÖ Grundverkehrsgesetz." },
    { titel: "NÖ Grundverkehrsgesetz", text: "Erwerb land- und forstwirtschaftlicher Flächen bedarf der Genehmigung der NÖ Grundverkehrsbehörde. Ausländische Staatsbürger benötigen zusätzliche Genehmigungen." },
  ]},
  { name: "Steiermark", kuerzel: "ST", icon: Mountain, gesetze: [
    { titel: "Stmk. Maklerrecht", text: "Steirische Makler unterliegen dem MaklerG. Besonderheit: Für Graz-Umgebung gelten verschärfte Widmungsvorschriften gem. Stmk. ROG 2010." },
    { titel: "Stmk. Grundverkehrsgesetz", text: "Grundverkehr mit land- und forstwirtschaftlichen Grundstücken erfordert Genehmigung. Ausnahmen für Kleinflächen bis 2 ha unter bestimmten Voraussetzungen." },
  ]},
  { name: "Salzburg", kuerzel: "S", icon: Castle, gesetze: [
    { titel: "Sbg. Fremdenwohnrecht", text: "In Salzburg unterliegen Zweitwohnsitze dem Sbg. Raumordnungsgesetz 2009. Fremdenverkehrsgemeinden haben besondere Beschränkungen für Nebenwohnsitze." },
    { titel: "Maklergebühren Salzburg", text: "Bundesweites MaklerG gilt. Ortsübliche Provision: Käufer 3% + MwSt., Verkäufer 3% + MwSt." },
  ]},
  { name: "Tirol", kuerzel: "T", icon: Mountain, gesetze: [
    { titel: "Tiroler Grundverkehrsgesetz", text: "Das TGVG 1996 regelt den Grunderwerb streng. EU-Bürger wie Inländer behandelt. Drittstaatsangehörige benötigen Genehmigung der Grundverkehrsbehörde." },
    { titel: "Freizeitwohnsitz-Beschränkung", text: "Tiroler ROG 2016 beschränkt Freizeitwohnsitze stark. Neue Widmungen für Freizeitwohnsitze praktisch ausgeschlossen." },
  ]},
  { name: "Vorarlberg", kuerzel: "V", icon: Waves, gesetze: [
    { titel: "Vlbg. Grundverkehrsgesetz", text: "Das Vlbg. GVG regelt Grunderwerb. Besonderheit: Wohnbauförderungsrecht ist in Vorarlberg besonders restriktiv für Nicht-Hauptwohnsitze." },
    { titel: "Maklerpraxis Vorarlberg", text: "Bundesweites MaklerG. Besonderheit: In Ballungsräumen oft Doppelanwaltspflicht bei Immobiliengeschäften > €500.000 empfohlen." },
  ]},
  { name: "Oberösterreich", kuerzel: "OÖ", icon: Factory, gesetze: [
    { titel: "OÖ Maklerrecht", text: "Bundesweites MaklerG. OÖ Besonderheit: Bodenreformgesetz regelt landwirtschaftliche Flächen." },
  ]},
  { name: "Kärnten", kuerzel: "K", icon: Waves, gesetze: [
    { titel: "Kärntner Grundverkehrsgesetz", text: "K-GVG 1994 regelt Grunderwerb. Seenähe-Grundstücke haben besondere Widmungseinschränkungen." },
  ]},
  { name: "Burgenland", kuerzel: "B", icon: Grape, gesetze: [
    { titel: "Bgld. Raumplanungsgesetz", text: "Das Bgld. RPG 2019 regelt Widmungen. Grenzregionen: Zusätzliche Prüfpflichten bei Grundstückserwerb durch Drittstaatsangehörige." },
  ]},
];

export default function SOSRecht() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [haftungOk, setHaftungOk] = useState(false);
  const [aktBL, setAktBL] = useState<typeof bundeslaender[0] | null>(null);
  const [aktGesetz, setAktGesetz] = useState<number | null>(null);
  const [gpNummer, setGpNummer] = useState<string | null>(null);

  // KI-Suche State
  const [kiFrage, setKiFrage] = useState("");
  const [kiAntwort, setKiAntwort] = useState("");
  const [kiLoading, setKiLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("geschaeftspartner").select("gp_number").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.gp_number) setGpNummer(data.gp_number); });
  }, [user]);

  const logConsent = async () => {
    if (!user) return;
    const gpData = await supabase.from("geschaeftspartner").select("id, gp_number").eq("user_id", user.id).maybeSingle();
    await supabase.from("audit_legal_consent").insert({
      user_id: user.id,
      gp_id: gpData.data?.id || null,
      gp_nummer: gpData.data?.gp_number || null,
      modul: "SOS Recht",
      confirmation_status: "accepted",
    } as any);
  };

  const handleAccept = async () => {
    await logConsent();
    setHaftungOk(true);
  };

  // Polling ref to allow cleanup
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const askKI = async () => {
    if (!kiFrage.trim() || !haftungOk || !aktBL || !user) return;
    setKiLoading(true);
    setKiAntwort("");

    // Stop any previous polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      // 1. Get user info
      const userName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Unbekannt";
      let userIp = "0.0.0.0";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        userIp = ipData.ip || "0.0.0.0";
      } catch { /* fallback IP */ }

      // 2. Insert row into audit_log
      const { data: auditRow, error: insertError } = await supabase
        .from("audit_log" as any)
        .insert({
          user_id: user.id,
          question: kiFrage,
          user_name: userName,
          user_ip: userIp,
          bundesland: aktBL.name,
        } as any)
        .select("id")
        .single();

      if (insertError) throw insertError;
      const auditId = (auditRow as any).id;

      // 3. Send webhook to Make.com with the audit_log row ID
      sendAction(ACTION_IDS.RECHTSBERATUNG, {
        audit_log_id: auditId,
        question: kiFrage,
        user_name: userName,
        userIp,
        bundesland: aktBL.name,
      }).catch((err) => console.warn("Webhook-Fehler (Make.com):", err));

      // 4. Poll audit_log every 3 seconds for ai_response
      let elapsed = 0;
      const POLL_INTERVAL = 3000;
      const TIMEOUT = 90000;

      pollingRef.current = setInterval(async () => {
        elapsed += POLL_INTERVAL;

        const { data, error } = await supabase
          .from("audit_log" as any)
          .select("ai_response")
          .eq("id", auditId)
          .single();

        if (!error && data && (data as any).ai_response) {
          setKiAntwort((data as any).ai_response);
          setKiLoading(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          return;
        }

        if (elapsed >= TIMEOUT) {
          setKiLoading(false);
          toast({ title: "Timeout", description: "Keine Antwort erhalten. Bitte erneut versuchen.", variant: "destructive" });
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }, POLL_INTERVAL);

    } catch (e: any) {
      toast({ title: "Fehler", description: e.message || "Unbekannter Fehler", variant: "destructive" });
      setKiLoading(false);
    }
  };

  const shareAdvice = async (channel: "whatsapp" | "email") => {
    if (!kiAntwort || !user || !aktBL) return;
    setSharing(true);
    try {
      const { data, error } = await supabase.from("shared_advice").insert({
        user_id: user.id,
        bundesland: aktBL.name,
        frage: kiFrage,
        antwort: kiAntwort,
      } as any).select("id").single();
      if (error) throw error;
      const adviceId = (data as any).id;
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/view-advice?id=${adviceId}`;
      const now = new Date();
      const datum = now.toLocaleDateString("de-AT");
      const uhrzeit = now.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
      const whatsappText = `Guten Tag! Hier finden Sie Ihre Rechtsinformationen (erstellt am ${datum} um ${uhrzeit}): ${link}\n\nHinweis: Der Link ist aus Datenschutzgründen 14 Tage gültig.`;
      const emailBody = `Guten Tag,\n\nhier finden Sie Ihre Rechtsinformationen (erstellt am ${datum} um ${uhrzeit}):\n\n${link}\n\nHinweis: Der Link ist aus Datenschutzgründen 14 Tage gültig.\n\nMit freundlichen Grüßen\nImmoExpress brainy`;

      if (channel === "whatsapp") {
        const waLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        // Fallback: try direct wa.me link (works on mobile without API)
        window.location.href = waLink;
      } else {
        window.open(`mailto:?subject=${encodeURIComponent("Ihre Rechtsinformationen – ImmoExpress brainy")}&body=${encodeURIComponent(emailBody)}`, "_blank");
      }
      toast({ title: "Link erstellt", description: "Der Sharing-Link ist 14 Tage gültig." });
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  const generatePDF = () => {
    if (!kiAntwort) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    const addHeader = () => {
      doc.setFillColor(255, 240, 240);
      doc.rect(margin - 2, 8, contentWidth + 4, 22, "F");
      doc.setDrawColor(200, 30, 30);
      doc.rect(margin - 2, 8, contentWidth + 4, 22, "S");
      doc.setFontSize(6);
      doc.setTextColor(180, 30, 30);
      const headerLines = doc.splitTextToSize(HAFTUNGSTEXT, contentWidth);
      doc.text(headerLines.slice(0, 4), margin, 13);

      doc.setFontSize(8);
      doc.setTextColor(200, 80, 20);
      doc.text("ImmoExpress brainy", margin, 36);
      if (gpNummer) {
        doc.setTextColor(120, 120, 120);
        doc.text(`GP-Nr: ${gpNummer}`, pageWidth - margin, 36, { align: "right" });
      }
      doc.setDrawColor(200, 80, 20);
      doc.line(margin, 39, pageWidth - margin, 39);
    };

    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 15;
      doc.setFillColor(200, 30, 30);
      doc.rect(0, footerY - 5, pageWidth, 20, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("Haftungsausschluss: Keine Rechtsberatung gemäß § 2 RAO. Erstellt durch KI-Assistenz System ImmoExpress brainy. Quelle: RIS (ris.bka.gv.at).", margin, footerY + 2, { maxWidth: contentWidth });
      doc.text(`Seite ${pageNum}`, pageWidth - margin, footerY + 2, { align: "right" });
    };

    addHeader();
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("SOS Recht – KI-Rechtsauskunft", margin, 48);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Bundesland: ${aktBL?.name || "Bundesweit"} | Erstellt: ${new Date().toLocaleDateString("de-AT")}`, margin, 55);

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(kiAntwort, contentWidth);
    let y = 63;
    let page = 1;

    for (const line of lines) {
      if (y > pageHeight - 30) {
        addFooter(page);
        doc.addPage();
        page++;
        addHeader();
        y = 48;
      }
      doc.text(line, margin, y);
      y += 5;
    }

    addFooter(page);
    doc.save(`SOS_Recht_${aktBL?.name || "AT"}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: "PDF erstellt", description: "Download mit Haftungsausschluss gestartet." });
  };

  if (!haftungOk) {
    return <HaftungsModal modul="SOS Recht" onAccept={handleAccept} />;
  }

  // Step indicator
  const currentStep = !aktBL ? 1 : 2;
  const totalSteps = 3;

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-xl mx-auto">
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            Step {currentStep} of {totalSteps}
          </p>
          <Shield size={20} className="text-primary" />
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="h-1.5 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">
          {!aktBL ? "Bundesland wählen" : `KI-Rechtsauskunft für: ${aktBL.name}`}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {!aktBL
            ? "Wählen Sie zuerst Ihr Bundesland, um die regionale Rechtsauskunft zu starten."
            : "Stellen Sie Ihre Rechtsfrage – die KI nutzt ausschließlich RIS (ris.bka.gv.at)."}
        </p>
      </div>

      {/* STEP 1: Bundesland Selection – vertical list */}
      {!aktBL ? (
        <>
          <div className="space-y-2.5">
            {bundeslaender.map((bl) => {
              const Icon = bl.icon;
              return (
                <button
                  key={bl.name}
                  onClick={() => { setAktBL(bl); setAktGesetz(null); setKiAntwort(""); setKiFrage(""); }}
                  className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 shadow-card border border-border hover:border-primary/40 hover:shadow-md transition-all text-left group active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors block">{bl.name}</span>
                    <span className="text-xs text-muted-foreground">{bl.gesetze.length} Rechtsthemen</span>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 group-hover:border-primary/40 transition-colors" />
                </button>
              );
            })}
          </div>

          {/* Locked KI hint */}
          <div className="mt-6 bg-muted/50 rounded-2xl p-4 border border-border flex items-center gap-3 opacity-60">
            <Lock size={18} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">KI-Rechtssuche wird nach Bundesland-Auswahl freigeschaltet.</p>
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          {/* Selected Bundesland card */}
          <button
            onClick={() => { setAktBL(null); setKiAntwort(""); setKiFrage(""); }}
            className="w-full flex items-center gap-4 bg-card rounded-2xl p-4 shadow-card border-2 border-primary mb-6 text-left group hover:bg-accent/50 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <aktBL.icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-foreground text-sm block">{aktBL.name}</span>
              <span className="text-xs text-muted-foreground">Tippen zum Ändern</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Check size={14} className="text-primary-foreground" />
            </div>
          </button>

          {/* KI Search */}
          <div className="bg-card rounded-2xl border border-border shadow-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Search size={18} className="text-primary" />
              <h3 className="font-bold text-foreground text-sm">KI-Rechtsauskunft</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Nur RIS (ris.bka.gv.at) · Paragraph & Bundesland werden genannt</p>
            <div className="flex gap-2 mb-3">
              <input
                value={kiFrage}
                onChange={e => setKiFrage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && haftungOk && askKI()}
                placeholder={`z.B. Wie hoch ist die Maklerprovision bei Kauf in ${aktBL.name}?`}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={askKI}
                disabled={kiLoading || !kiFrage.trim() || !haftungOk}
                title={!haftungOk ? "Bitte zuerst den Haftungsausschluss bestätigen" : undefined}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {kiLoading ? <Loader2 size={16} className="animate-spin" /> : !haftungOk ? <Lock size={16} /> : <Search size={16} />}
                Fragen
              </button>
            </div>

            {/* Loading bubble */}
            {kiLoading && (
              <div className="bg-accent rounded-xl p-4 border border-border animate-fade-in">
                <div className="flex items-center gap-3">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Wird analysiert…</p>
                    <p className="text-xs text-muted-foreground">Die KI prüft Ihre Frage gegen das RIS.</p>
                  </div>
                </div>
              </div>
            )}

            {kiAntwort && (
              <div className="bg-accent rounded-xl p-4 border border-border animate-fade-in">
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{kiAntwort}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => shareAdvice("whatsapp")}
                    disabled={sharing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(142,70%,40%)] text-white text-xs font-semibold hover:bg-[hsl(142,70%,35%)] transition-colors disabled:opacity-50"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button
                    onClick={() => shareAdvice("email")}
                    disabled={sharing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Mail size={14} /> E-Mail
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gesetze */}
          <h3 className="font-bold text-foreground text-sm mb-2">Relevante Rechtsthemen – {aktBL.name}</h3>
          <div className="space-y-2">
            {aktBL.gesetze.map((g, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                <button
                  onClick={() => setAktGesetz(aktGesetz === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-accent transition-colors"
                >
                  <span className="font-semibold text-foreground text-sm pr-3">{g.titel}</span>
                  <ChevronDown size={16} className={`text-primary flex-shrink-0 transition-transform ${aktGesetz === i ? "rotate-180" : ""}`} />
                </button>
                {aktGesetz === i && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{g.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-accent rounded-2xl border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-primary">Quelle:</strong> RIS – Rechtsinformationssystem (ris.bka.gv.at) · MaklerG BGBl I 1996/262 · IMV BGBl II 1996/297
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
