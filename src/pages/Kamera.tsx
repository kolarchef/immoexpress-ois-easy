import { Camera, ScanLine, FileText, Image, Upload, Sparkles } from "lucide-react";

export default function Kamera() {
  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Kamera & Scanner</h1>
        <p className="text-muted-foreground text-sm">Visitenkarte, Dokumente & Fotos scannen</p>
      </div>

      {/* Kamera Viewfinder Placeholder */}
      <div className="relative w-full rounded-2xl bg-foreground overflow-hidden mb-5 shadow-md-custom" style={{ paddingTop: "70%" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl border-2 border-primary flex items-center justify-center mx-auto mb-3 relative">
              <Camera size={36} className="text-primary" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br"></div>
            </div>
            <p className="text-white font-semibold text-sm">Kamera aktivieren</p>
            <p className="text-white/50 text-xs mt-1">Objekt in den Rahmen richten</p>
          </div>
        </div>
        {/* Scan line animation */}
        <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-primary/60 shadow-orange opacity-75"></div>
      </div>

      {/* Schnell-Aktionen */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-orange flex flex-col items-center gap-2 hover:bg-primary-dark transition-all active:scale-95">
          <ScanLine size={28} />
          <span className="font-bold text-sm">Visitenkarte Scannen</span>
          <span className="text-xs text-primary-foreground/70">Daten automatisch übernehmen</span>
        </button>
        <button className="bg-card border border-border p-4 rounded-2xl shadow-card flex flex-col items-center gap-2 hover:bg-accent transition-all active:scale-95">
          <FileText size={28} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Dokument Scannen</span>
          <span className="text-xs text-muted-foreground">PDF erstellen</span>
        </button>
        <button className="bg-card border border-border p-4 rounded-2xl shadow-card flex flex-col items-center gap-2 hover:bg-accent transition-all active:scale-95">
          <Image size={28} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Objekt Foto</span>
          <span className="text-xs text-muted-foreground">Für Exposé verwenden</span>
        </button>
        <button className="bg-card border border-border p-4 rounded-2xl shadow-card flex flex-col items-center gap-2 hover:bg-accent transition-all active:scale-95">
          <Upload size={28} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Foto hochladen</span>
          <span className="text-xs text-muted-foreground">Galerie auswählen</span>
        </button>
      </div>

      {/* KI-Feature Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4 shadow-orange text-primary-foreground flex items-center gap-3">
        <Sparkles size={24} />
        <div>
          <p className="font-bold text-sm">KI Visitenkarten-Erkennung</p>
          <p className="text-xs text-primary-foreground/80">Daten werden automatisch ins CRM übernommen und dem richtigen Vertriebsteam zugewiesen.</p>
        </div>
      </div>
    </div>
  );
}
