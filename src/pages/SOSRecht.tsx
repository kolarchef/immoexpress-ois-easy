import { useState } from "react";
import { Shield, ChevronDown, ChevronRight, X } from "lucide-react";
import HaftungsModal from "@/components/HaftungsModal";

const bundeslaender = [
  {
    name: "Wien",
    kuerzel: "W",
    color: "bg-red-500",
    gesetze: [
      { titel: "Maklergesetz (MaklerG)", text: "Makler in Wien unterliegen dem Maklergesetz BGBl I 1996/262. Die Maklergebühr (Provision) beträgt bei Kauf max. 3% + 20% MwSt. des Kaufpreises auf beiden Seiten (Käufer & Verkäufer)." },
      { titel: "Alleinvermittlung (Wiener Praxis)", text: "Alleinvermittlungsverträge sind in Wien üblich. Gemäß § 14 MaklerG entsteht der Provisionsanspruch auch ohne Abschluss, wenn der Auftraggeber vertragswidrig handelt." },
      { titel: "IMV & Nebenkostenübersicht", text: "Gemäß Immobilienmaklerverordnung (IMV BGBl II 1996/297) muss der Makler eine vollständige Nebenkostenübersicht bereitstellen: Grundbucheintragungsgebühr 1,1%, Grunderwerbsteuer 3,5%, Vertragserrichtungskosten ca. 1-2%." },
      { titel: "Finanzamt-Gebühren Wien", text: "Grunderwerbsteuer: 3,5% (bei nahen Angehörigen abgestuft). Eintragungsgebühr: 1,1% des Kaufpreises. Immobilienertragssteuer (ImmoESt): 30% des Veräußerungsgewinns." },
    ],
  },
  {
    name: "Niederösterreich",
    kuerzel: "NÖ",
    color: "bg-yellow-500",
    gesetze: [
      { titel: "Maklerrecht NÖ", text: "In NÖ gelten bundesweites MaklerG sowie landesspezifische Regelungen für Bauland-Widmungen gem. NÖ ROG 2014. Besonderheit: Landwirtschaftliche Grundstücke unterliegen dem NÖ Grundverkehrsgesetz." },
      { titel: "NÖ Grundverkehrsgesetz", text: "Erwerb land- und forstwirtschaftlicher Flächen bedarf der Genehmigung der NÖ Grundverkehrsbehörde. Ausländische Staatsbürger benötigen zusätzliche Genehmigungen." },
    ],
  },
  {
    name: "Steiermark",
    kuerzel: "ST",
    color: "bg-green-600",
    gesetze: [
      { titel: "Stmk. Maklerrecht", text: "Steirische Makler unterliegen dem MaklerG. Besonderheit: Für Graz-Umgebung gelten verschärfte Widmungsvorschriften gem. Stmk. ROG 2010. Bauerwartungsland gesondert zu prüfen." },
      { titel: "Stmk. Grundverkehrsgesetz", text: "Grundverkehr mit land- und forstwirtschaftlichen Grundstücken erfordert Genehmigung. Ausnahmen für Kleinflächen bis 2 ha unter bestimmten Voraussetzungen." },
    ],
  },
  {
    name: "Salzburg",
    kuerzel: "S",
    color: "bg-blue-500",
    gesetze: [
      { titel: "Sbg. Fremdenwohnrecht", text: "In Salzburg unterliegen Zweitwohnsitze dem Sbg. Raumordnungsgesetz 2009. Fremdenverkehrsgemeinden haben besondere Beschränkungen für Nebenwohnsitze." },
      { titel: "Maklergebühren Salzburg", text: "Bundesweites MaklerG gilt. Ortsübliche Provision: Käufer 3% + MwSt., Verkäufer 3% + MwSt. Schriftlicher Maklervertrag empfohlen (§ 1 MaklerG)." },
    ],
  },
  {
    name: "Tirol",
    kuerzel: "T",
    color: "bg-red-700",
    gesetze: [
      { titel: "Tiroler Grundverkehrsgesetz", text: "Das TGVG 1996 regelt den Grunderwerb streng. EU-Bürger wie Inländer behandelt. Drittstaatsangehörige benötigen Genehmigung der Grundverkehrsbehörde." },
      { titel: "Freizeitwohnsitz-Beschränkung", text: "Tiroler ROG 2016 beschränkt Freizeitwohnsitze stark. Neue Widmungen für Freizeitwohnsitze praktisch ausgeschlossen. Bestand hat Bestandsschutz." },
    ],
  },
  {
    name: "Vorarlberg",
    kuerzel: "V",
    color: "bg-red-600",
    gesetze: [
      { titel: "Vlbg. Grundverkehrsgesetz", text: "Das Vlbg. GVG regelt Grunderwerb. Besonderheit: Wohnbauförderungsrecht ist in Vorarlberg besonders restriktiv für Nicht-Hauptwohnsitze." },
      { titel: "Maklerpraxis Vorarlberg", text: "Bundesweites MaklerG. Besonderheit: In Ballungsräumen (Feldkirch, Bregenz) oft Doppelanwaltspflicht bei Immobiliengeschäften > €500.000 empfohlen." },
    ],
  },
  {
    name: "Oberösterreich",
    kuerzel: "OÖ",
    color: "bg-blue-600",
    gesetze: [
      { titel: "OÖ Maklerrecht", text: "Bundesweites MaklerG. OÖ Besonderheit: Bodenreformgesetz regelt landwirtschaftliche Flächen. Linz-Wels-Korridor: Industriewidmungen gesondert zu prüfen." },
    ],
  },
  {
    name: "Kärnten",
    kuerzel: "K",
    color: "bg-yellow-400",
    gesetze: [
      { titel: "Kärntner Grundverkehrsgesetz", text: "K-GVG 1994 regelt Grunderwerb. Seenähe-Grundstücke haben besondere Widmungseinschränkungen (Kärntner Naturschutzgesetz). Wörthersee-Bereich: Strenge Bauvorschriften." },
    ],
  },
  {
    name: "Burgenland",
    kuerzel: "B",
    color: "bg-red-400",
    gesetze: [
      { titel: "Bgld. Raumplanungsgesetz", text: "Das Bgld. RPG 2019 regelt Widmungen. Grenzregionen zu Ungarn/Slowakei: Zusätzliche Prüfpflichten bei Grundstückserwerb durch Drittstaatsangehörige." },
    ],
  },
];

export default function SOSRecht() {
  const [haftungOk, setHaftungOk] = useState(false);
  const [aktBL, setAktBL] = useState<typeof bundeslaender[0] | null>(null);
  const [aktGesetz, setAktGesetz] = useState<number | null>(null);

  if (!haftungOk) {
    return <HaftungsModal modul="SOS Recht" onAccept={() => setHaftungOk(true)} />;
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
          <p className="text-xs text-muted-foreground">Alle Informationen basieren auf österreichischem Recht (MaklerG, IMV, KSchG, ABGB) und sind nur zur allgemeinen Orientierung. Landesspezifische Regelungen können abweichen. Kein Ersatz für Rechtsberatung.</p>
        </div>
      </div>

      {/* Bundesland-Auswahl */}
      {!aktBL ? (
        <>
          <h2 className="font-bold text-foreground text-lg mb-1">Bundesland wählen</h2>
          <p className="text-muted-foreground text-sm mb-4">Wählen Sie Ihr Bundesland für lokale Rechtsinfos.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bundeslaender.map((bl) => (
              <button
                key={bl.name}
                onClick={() => { setAktBL(bl); setAktGesetz(null); }}
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
        </>
      ) : (
        <div className="animate-fade-in">
          <button onClick={() => setAktBL(null)} className="flex items-center gap-2 text-primary font-semibold text-sm mb-4 hover:underline">
            ← Alle Bundesländer
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-12 h-12 rounded-xl ${aktBL.color} flex items-center justify-center text-white font-black text-lg shadow-sm`}>
              {aktBL.kuerzel}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xl">{aktBL.name}</h2>
              <p className="text-xs text-muted-foreground">Österreichisches Immobilienrecht</p>
            </div>
          </div>

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
              <strong className="text-primary">Relevante Gesetze:</strong> MaklerG BGBl I 1996/262 · IMV BGBl II 1996/297 · KSchG · ABGB · Grunderwerbsteuergesetz · GrEStG
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
