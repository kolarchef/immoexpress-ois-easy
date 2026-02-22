import { AlertTriangle, Key } from "lucide-react";
import { Link } from "react-router-dom";

interface ApiKeyGateProps {
  service: "replicate" | "elevenlabs";
  hasKey: boolean;
  children: React.ReactNode;
}

export function ApiKeyGate({ service, hasKey, children }: ApiKeyGateProps) {
  if (hasKey) return <>{children}</>;

  const label = service === "replicate" ? "Replicate" : "ElevenLabs";

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
      <AlertTriangle size={32} className="text-amber-500 mx-auto" />
      <p className="font-bold text-sm text-foreground">
        Bitte hinterlege deinen {label} API-Key im Profil
      </p>
      <p className="text-xs text-muted-foreground">
        Diese Funktion benötigt deinen eigenen {label} API-Key. Deine Credits werden direkt beim Anbieter abgerechnet.
      </p>
      <Link
        to="/profil"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
      >
        <Key size={14} /> Zum Profil
      </Link>
    </div>
  );
}
