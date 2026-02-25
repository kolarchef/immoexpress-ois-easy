import { useState, useEffect } from "react";
import { Shield, ChevronDown, Search, Download, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import HaftungsModal from "@/components/HaftungsModal";
import jsPDF from "jspdf";

const HAFTUNGSTEXT = `HAFTUNGSAUSSCHLUSS – ImmoExpress brainy: Diese Anwendung stellt ausschließlich allgemeine Informationen bereit und ersetzt keine individuelle Rechtsberatung. Die bereitgestellten Inhalte wurden mithilfe von Künstlicher Intelligenz generiert und basieren auf öffentlich zugänglichen Quellen des Rechtsinformationssystems des Bundes (RIS – ris.bka.gv.at). Es wird keine Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der Informationen übernommen. Für verbindliche Rechtsauskünfte wenden Sie sich bitte an einen Rechtsanwalt oder Notar. Keine Rechtsberatung gemäß § 2 RAO. Erstellt durch KI-Assistenz System ImmoExpress brainy.`;

const bundeslaender = [
  { name: "Wien", kuerzel: "W", color: "bg-red-500", gesetze: [
    { titel: "Maklergesetz (MaklerG)", text: "Makler in Wien unterliegen dem Maklergesetz BGBl I 1996/262. Die Maklergebühr (Provision) beträgt bei Kauf max. 3% + 20% MwSt. des Kaufpreises auf beiden Seiten (Käufer & Verkäufer)." },
    { titel: "Alleinvermittlung (Wiener Praxis)", text: "Alleinvermittlungsverträge sind in Wien üblich. Gemäß § 14 MaklerG entsteht der Provisionsanspruch auch ohne Abschluss, wenn der Auftraggeber vertragswidrig handelt." },
    { titel: "IMV & Nebenkostenübersicht", text: "Gemäß Immobilienmaklerverordnung (IMV BGBl II 1996/297) muss der Makler eine vollständige Nebenkostenübersicht bereitstellen: Grundbucheintragungsgebühr 1,1%, Grunderwerbsteuer 3,5%, Vertragserrichtungskosten ca. 1-2%." },
    { titel: "Finanzamt-Gebühren Wien", text: "Grunderwerbsteuer: 3,5% (bei nahen Angehörigen abgestuft). Eintragungsgebühr: 1,1% des Kaufpreises. Immobilienertragssteuer (ImmoESt): 30% des Veräußerungsgewinns." },
  ]},
  { name: "Niederösterreich", kuerzel: "NÖ", color: "bg-yellow-500", gesetze: [
    { titel: "Maklerrecht NÖ", text: "In NÖ gelten bundesweites MaklerG sowie landesspezifische Regelungen für Bauland-Widmungen gem. NÖ ROG 2014. Besonderheit: Landwirtschaftliche Grundstücke unterliegen dem NÖ Grundverkehrsgesetz." },
    { titel: "NÖ Grundverkehrsgesetz", text: "Erwerb land- und forstwirtschaftlicher Flächen bedarf der Genehmigung der NÖ Grundverkehrsbehörde. Ausländische Staatsbürger benötigen zusätzliche Genehmigungen." },
  ]},
  { name: "Steiermark", kuerzel: "ST", color: "bg-green-600", gesetze: [
    { titel: "Stmk. Maklerrecht", text: "Steirische Makler unterliegen dem MaklerG. Besonderheit: Für Graz-Umgebung gelten verschärfte Widmungsvorschriften gem. Stmk. ROG 2010." },
    { titel: "Stmk. Grundverkehrsgesetz", text: "Grundverkehr mit land- und forstwirtschaftlichen Grundstücken erfordert Genehmigung. Ausnahmen für Kleinflächen bis 2 ha unter bestimmten Voraussetzungen." },
  ]},
  { name: "Salzburg", kuerzel: "S", color: "bg-blue-500", gesetze: [
    { titel: "Sbg. Fremdenwohnrecht", text: "In Salzburg unterliegen Zweitwohnsitze dem Sbg. Raumordnungsgesetz 2009. Fremdenverkehrsgemeinden haben besondere Beschränkungen für Nebenwohnsitze." },
    { titel: "Maklergebühren Salzburg", text: "Bundesweites MaklerG gilt. Ortsübliche Provision: Käufer 3% + MwSt., Verkäufer 3% + MwSt." },
  ]},
  { name: "Tirol", kuerzel: "T", color: "bg-red-700", gesetze: [
    { titel: "Tiroler Grundverkehrsgesetz", text: "Das TGVG 1996 regelt den Grunderwerb streng. EU-Bürger wie Inländer behandelt. Drittstaatsangehörige benötigen Genehmigung der Grundverkehrsbehörde." },
    { titel: "Freizeitwohnsitz-Beschränkung", text: "Tiroler ROG 2016 beschränkt Freizeitwohnsitze stark. Neue Widmungen für Freizeitwohnsitze praktisch ausgeschlossen." },
  ]},
  { name: "Vorarlberg", kuerzel: "V", color: "bg-red-600", gesetze: [
    { titel: "Vlbg. Grundverkehrsgesetz", text: "Das Vlbg. GVG regelt Grunderwerb. Besonderheit: Wohnbauförderungsrecht ist in Vorarlberg besonders restriktiv für Nicht-Hauptwohnsitze." },
    { titel: "Maklerpraxis Vorarlberg", text: "Bundesweites MaklerG. Besonderheit: In Ballungsräumen oft Doppelanwaltspflicht bei Immobiliengeschäften > €500.000 empfohlen." },
  ]},
  { name: "Oberösterreich", kuerzel: "OÖ", color: "bg-blue-600", gesetze: [
    { titel: "OÖ Maklerrecht", text: "Bundesweites MaklerG. OÖ Besonderheit: Bodenreformgesetz regelt landwirtschaftliche Flächen." },
  ]},
  { name: "Kärnten", kuerzel: "K", color: "bg-yellow-400", gesetze: [
    { titel: "Kärntner Grundverkehrsgesetz", text: "K-GVG 1994 regelt Grunderwerb. Seenähe-Grundstücke haben besondere Widmungseinschränkungen." },
  ]},
  { name: "Burgenland", kuerzel: "B", color: "bg-red-400", gesetze: [
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

  const askKI = async () => {
    if (!kiFrage.trim() || !haftungOk || !aktBL) return;
    setKiLoading(true);
    setKiAntwort("");
    try {
      const { data, error } = await supabase.functions.invoke("sos-recht-ki", {
        body: { frage: kiFrage, bundesland: aktBL.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setKiAntwort(data.text || "Keine Antwort erhalten.");
    } catch (e: any) {
      toast({ title: "KI-Fehler", description: e.message || "Unbekannter Fehler", variant: "destructive" });
    } finally {
      setKiLoading(false);
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
      // Disclaimer as unlöschbarer Header
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

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SOS Legal Q&A</h1>
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">ImmoExpress Professional · Österreich</p>
        </div>
        <Shield size={28} className="text-primary" />
      </div>

      {/* Haftungshinweis Banner */}
      <div className="bg-accent rounded-2xl p-4 border border-primary/20 mb-6 flex items-start gap-3">
        <Shield size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Rechtliche Information</p>
          <p className="text-xs text-muted-foreground">Alle Informationen basieren auf österreichischem Recht (MaklerG, IMV, KSchG, ABGB) und sind nur zur allgemeinen Orientierung. Quelle: RIS (ris.bka.gv.at). Kein Ersatz für Rechtsberatung.</p>
        </div>
      </div>

      {/* STEP 1: Bundesland-Auswahl GANZ OBEN */}
      {!aktBL ? (
        <>
          <h2 className="font-bold text-foreground text-lg mb-1">1. Bundesland wählen</h2>
          <p className="text-muted-foreground text-sm mb-4">Wählen Sie zuerst Ihr Bundesland – danach erscheint das KI-Suchfeld.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bundeslaender.map((bl) => (
              <button
                key={bl.name}
                onClick={() => { setAktBL(bl); setAktGesetz(null); setKiAntwort(""); setKiFrage(""); }}
                className="bg-card rounded-2xl p-4 shadow-card border border-border hover:shadow-card-hover hover:border-primary/30 transition-all text-left group active:scale-95"
              >
                <div className={`w-10 h-10 rounded-xl ${bl.color} flex items-center justify-center text-white font-black text-sm mb-3 shadow-sm`}>
                  {bl.kuerzel}
                </div>
                <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{bl.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{bl.gesetze.length} Themen</div>
              </button>
            ))}
          </div>

          {/* Locked KI hint */}
          <div className="mt-6 bg-muted/50 rounded-2xl p-4 border border-border flex items-center gap-3 opacity-60">
            <Lock size={18} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">KI-Rechtssuche wird nach Bundesland-Auswahl freigeschaltet.</p>
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          <button onClick={() => { setAktBL(null); setKiAntwort(""); setKiFrage(""); }} className="flex items-center gap-2 text-primary font-semibold text-sm mb-4 hover:underline">
            ← Alle Bundesländer
          </button>

          {/* Bundesland Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-xl ${aktBL.color} flex items-center justify-center text-white font-black text-lg shadow-sm`}>
              {aktBL.kuerzel}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xl">{aktBL.name}</h2>
              <p className="text-xs text-muted-foreground">Österreichisches Immobilienrecht</p>
            </div>
          </div>

          {/* STEP 2: KI-Rechtssuche – nur sichtbar wenn Bundesland gewählt */}
          <div className="bg-card rounded-2xl border border-border shadow-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Search size={18} className="text-primary" />
              <h3 className="font-bold text-foreground text-sm">KI-Rechtsauskunft für: {aktBL.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Nur RIS (ris.bka.gv.at) · Paragraph & Bundesland werden genannt</p>
            <div className="flex gap-2 mb-3">
              <input
                value={kiFrage}
                onChange={e => setKiFrage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && haftungOk && askKI()}
                placeholder={`z.B. Wie hoch ist die Maklerprovision bei Kauf in ${aktBL.name}?`}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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

            {kiAntwort && (
              <div className="bg-accent rounded-xl p-4 border border-border">
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{kiAntwort}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Download size={14} /> PDF mit Haftungsausschluss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gesetze für gewähltes Bundesland */}
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
