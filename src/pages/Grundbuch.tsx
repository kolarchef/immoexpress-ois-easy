import { FileSearch } from "lucide-react";

export default function Grundbuch() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
          <FileSearch size={22} className="text-primary" /> Grundbuch-Direkt
        </h1>
        <p className="text-muted-foreground text-sm">
          Grundbuchauszüge direkt abfragen und verwalten. Dieses Modul wird demnächst mit einer
          Live-Anbindung an das österreichische Grundbuch erweitert.
        </p>
        <div className="mt-6 p-8 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
          <span className="text-muted-foreground text-sm font-medium">Kommt bald – Grundbuch-Abfrage</span>
        </div>
      </div>
    </div>
  );
}
