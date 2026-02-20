import { useState } from "react";
import { Shield, X, Mail, FileText } from "lucide-react";

interface Props {
  modul: string;
  onAccept: () => void;
}

const haftungsText = `HAFTUNGSAUSSCHLUSS – ImmoExpress brainy

Diese Anwendung stellt ausschließlich allgemeine Informationen bereit. Die bereitgestellten Inhalte (insbesondere zu Standortdaten, Rechtsauskünften und KI-Analysen) ersetzen KEINE professionelle Rechts-, Steuer- oder Immobilienberatung.

ÖSTERREICHISCHES RECHT:
Alle rechtlichen Informationen basieren auf dem österreichischen Maklergesetz (MaklerG BGBl I 1996/262), der Immobilienmaklerverordnung (IMV BGBl II 1996/297), dem Konsumentenschutzgesetz (KSchG) und dem ABGB. Landesrechtliche Regelungen der 9 Bundesländer (Wien, NÖ, OÖ, Steiermark, Kärnten, Salzburg, Tirol, Vorarlberg, Burgenland) können erheblich abweichen.

HAFTUNGSBESCHRÄNKUNG:
ImmoExpress brainy und seine Betreiber übernehmen keinerlei Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Informationen. Die Nutzung erfolgt auf eigene Verantwortung.

DATENSCHUTZ:
Die Verarbeitung personenbezogener Daten erfolgt gemäß DSGVO und dem österreichischen Datenschutzgesetz (DSG).

Mit der Bestätigung erkennen Sie diesen Haftungsausschluss an.`;

export default function HaftungsModal({ modul, onAccept }: Props) {
  const [bestaetigt, setBestaetigt] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
            <Shield size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">Haftungsausschluss</h2>
            <p className="text-xs text-primary font-semibold uppercase tracking-wide">Modul: {modul}</p>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 overflow-y-auto rounded-xl bg-surface border border-border p-4 mb-4 min-h-0">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{haftungsText}</p>
        </div>

        {/* Bestätigung */}
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={bestaetigt}
            onChange={e => setBestaetigt(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary"
          />
          <span className="text-sm text-foreground font-medium">
            Ich habe den Haftungsausschluss gelesen und erkenne ihn an. Ich bin mir bewusst, dass dies keine Rechtsberatung ersetzt.
          </span>
        </label>

        {/* Aktionen */}
        <div className="flex gap-3">
          <button
            disabled={!bestaetigt}
            onClick={onAccept}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              bestaetigt
                ? "bg-primary text-primary-foreground shadow-orange hover:bg-primary-dark"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Bestätigen &amp; Fortfahren
          </button>
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-accent text-accent-foreground text-sm font-semibold hover:bg-secondary transition-colors">
            <Mail size={15} /> Per E-Mail senden
          </button>
        </div>
      </div>
    </div>
  );
}
