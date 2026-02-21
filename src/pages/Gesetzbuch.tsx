import { Scale, ExternalLink } from "lucide-react";

const links = [
  { kategorie: "Maklerrecht", items: [
    { text: "Maklergesetz (MaklerG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10003864" },
    { text: "Immobilienmaklerverordnung (IMV)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20002938" },
    { text: "Konsumentenschutzgesetz (KSchG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10002462" },
  ]},
  { kategorie: "Immobilienrecht", items: [
    { text: "Mietrechtsgesetz (MRG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10002531" },
    { text: "Wohnungseigentumsgesetz (WEG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20001921" },
    { text: "Grundbuchgesetz (GBG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001653" },
    { text: "Grunderwerbsteuergesetz (GrEStG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10004412" },
  ]},
  { kategorie: "ÖNORMEN & Standards", items: [
    { text: "ÖNORM B 1802 – Liegenschaftsbewertung", url: "https://www.austrian-standards.at/" },
    { text: "ÖNORM A 4000 – Wohnnutzfläche", url: "https://www.austrian-standards.at/" },
    { text: "Energieausweis-Vorlage-Gesetz (EAVG)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007025" },
  ]},
];

export default function Gesetzbuch() {
  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in" style={{ paddingBottom: 200 }}>
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Scale size={22} className="text-primary" /> Gesetzbuch
      </h1>
      <p className="text-sm text-muted-foreground">Gesetzestexte & Normen für österreichische Immobilienmakler</p>

      {links.map(({ kategorie, items }) => (
        <section key={kategorie} className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <h2 className="font-bold text-foreground mb-3">{kategorie}</h2>
          <div className="space-y-2">
            {items.map(item => (
              <a
                key={item.text}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-accent hover:bg-secondary transition-all group"
              >
                <Scale size={16} className="text-primary flex-shrink-0" />
                <span className="text-sm text-foreground flex-1">{item.text}</span>
                <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
