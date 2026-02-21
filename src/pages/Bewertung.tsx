import { Calculator } from "lucide-react";

export default function Bewertung() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Calculator size={22} className="text-primary" /> Immobilien-Bewertung
        </h1>
        <p className="text-muted-foreground text-sm">
          Schnelle Wertermittlung für Ihre Objekte. Vergleichswerte, Ertragswert und
          Sachwertverfahren – alles an einem Ort.
        </p>
        <div className="mt-6 p-8 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
          <span className="text-muted-foreground text-sm font-medium">Kommt bald – Bewertungs-Tool</span>
        </div>
      </div>
    </div>
  );
}
