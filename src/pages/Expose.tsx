import { FileText, Plus, Image, Wand2 } from "lucide-react";

export default function Expose() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exposé-Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Professionelle Immobilien-Exposés erstellen</p>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-card border border-border flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center">
          <FileText size={28} className="text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-lg">Neues Exposé erstellen</h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">Füge Fotos, Beschreibung und Objektdaten hinzu – das Modul generiert ein druckfertiges PDF.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-3 font-semibold text-sm shadow-orange transition-all hover:opacity-90">
            <Plus size={16} /> Neues Exposé
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-accent text-foreground rounded-xl px-4 py-3 font-semibold text-sm border border-border transition-all hover:bg-secondary">
            <Image size={16} /> Fotos hochladen
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">KI-Textvorschlag</h2>
          <span className="text-xs bg-primary-light text-primary font-semibold px-2 py-0.5 rounded-full ml-auto">Beta</span>
        </div>
        <textarea
          className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={4}
          placeholder="Objektbeschreibung eingeben – KI generiert professionellen Exposé-Text auf Österreichisch..."
        />
        <button className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all">
          Text generieren
        </button>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h2 className="font-bold text-foreground mb-3">Letzte Exposés</h2>
        <p className="text-muted-foreground text-sm text-center py-6">Noch keine Exposés erstellt.</p>
      </div>
    </div>
  );
}
