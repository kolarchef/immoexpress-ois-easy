import { Handshake } from "lucide-react";

export default function Netzwerk() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Handshake size={22} className="text-primary" /> Netzwerk & Partner
        </h1>
        <p className="text-muted-foreground text-sm">
          Ihr Partnernetzwerk: Notare, Sachverständige, Handwerker, Banken und mehr –
          zentral verwaltet und schnell erreichbar.
        </p>
        <div className="mt-6 p-8 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
          <span className="text-muted-foreground text-sm font-medium">Kommt bald – Partner-Verzeichnis</span>
        </div>
      </div>
    </div>
  );
}
