import { useState } from "react";
import { KeyRound, CheckCircle2, Circle, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const checkliste = [
  { kategorie: "Meldewesen", items: [
    { text: "Meldezettel – An-/Abmeldung beim Magistrat", link: "https://www.wien.gv.at/amtshelfer/dokumente/verwaltung/meldeservice/anmeldung.html" },
    { text: "Parkpickerl beantragen (falls Wien)", link: "https://www.wien.gv.at/amtshelfer/verkehr/parken/kurzparkzone/parkpickerl.html" },
  ]},
  { kategorie: "Versorgung & Versicherung", items: [
    { text: "Strom anmelden / Zählerstand ablesen", link: null },
    { text: "Gas anmelden / Zählerstand ablesen", link: null },
    { text: "Internet & Telefon anmelden", link: null },
    { text: "Haushaltsversicherung abschließen", link: null },
    { text: "Gebäudeversicherung prüfen (bei Kauf)", link: null },
  ]},
  { kategorie: "Behörden & Verträge", items: [
    { text: "Grundbucheintragung überprüfen", link: null },
    { text: "Finanzamt – Grunderwerbsteuer", link: null },
    { text: "Schlüsselübergabeprotokoll erstellen", link: null },
  ]},
  { kategorie: "After-Sales", items: [
    { text: "Google-Bewertung vom Kunden erbitten", link: "https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID" },
    { text: "Dankeskarte / Geschenk senden", link: null },
    { text: "Follow-up Anruf nach 2 Wochen", link: null },
  ]},
];

export default function ImmoConcierge() {
  const [done, setDone] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setDone(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in" style={{ paddingBottom: 200 }}>
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <KeyRound size={22} className="text-primary" /> Immo-Concierge
      </h1>
      <p className="text-sm text-muted-foreground">After-Sales Checkliste für deine Kunden</p>

      {checkliste.map(({ kategorie, items }) => (
        <section key={kategorie} className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <h2 className="font-bold text-foreground mb-3">{kategorie}</h2>
          <div className="space-y-2">
            {items.map(item => {
              const key = `${kategorie}-${item.text}`;
              const isDone = done.has(key);
              return (
                <div key={key} onClick={() => toggle(key)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isDone ? "bg-muted opacity-60" : "bg-accent hover:bg-secondary"}`}>
                  {isDone ? <CheckCircle2 size={18} className="text-primary flex-shrink-0" /> : <Circle size={18} className="text-muted-foreground flex-shrink-0" />}
                  <span className={`text-sm flex-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</span>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* WhatsApp senden */}
      <Button
        className="w-full"
        onClick={() => {
          const offene = checkliste.flatMap(k => k.items.map(i => `${k.kategorie}: ${i.text}`)).filter((_, i) => {
            const allKeys = checkliste.flatMap(k => k.items.map(item => `${k.kategorie}-${item.text}`));
            return !done.has(allKeys[i]);
          });
          const text = encodeURIComponent(`📋 Immo-Concierge Checkliste\n\nOffene Punkte:\n${offene.map(o => `• ${o}`).join("\n")}`);
          window.open(`https://wa.me/?text=${text}`, "_blank");
        }}
      >
        <MessageCircle size={18} className="mr-2" /> Via WhatsApp senden
      </Button>
    </div>
  );
}
