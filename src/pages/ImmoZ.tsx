import { ArrowLeftRight, Upload, Download, CheckCircle2, AlertCircle, Clock, FileDown } from "lucide-react";

const syncItems = [
  { label: "Objekte synchronisiert", count: 128, status: "ok" },
  { label: "Bilder übertragen", count: 842, status: "ok" },
  { label: "Ausstehend", count: 3, status: "warn" },
];

const letzteExporte = [
  { datum: "20.02.2026, 08:42", objekte: 12, status: "Erfolgreich", datei: "immoZ_export_20022026.xml" },
  { datum: "18.02.2026, 14:15", objekte: 8, status: "Erfolgreich", datei: "immoZ_export_18022026.xml" },
  { datum: "15.02.2026, 09:30", objekte: 15, status: "Erfolgreich", datei: "immoZ_export_15022026.xml" },
  { datum: "12.02.2026, 11:00", objekte: 5, status: "Teilfehler", datei: "immoZ_export_12022026.xml" },
  { datum: "10.02.2026, 16:45", objekte: 20, status: "Erfolgreich", datei: "immoZ_export_10022026.xml" },
];

export default function ImmoZ() {
  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ImmoZ-Schnittstelle</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Datenimport & -export zur ImmoZ-Plattform</p>
      </div>

      {/* Verbindungsstatus */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
            <ArrowLeftRight size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground">Schnittstelle bereit</h2>
              <span className="text-xs bg-accent text-primary px-2.5 py-1 rounded-full font-semibold border border-primary/30">● Verbunden</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">ImmoZ API v3.2 · AT-1234567 · Letzter Sync: heute, 08:42 Uhr</p>
          </div>
        </div>
      </div>

      {/* Sync-Status */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h2 className="font-bold text-foreground mb-4">Sync-Status</h2>
        <div className="space-y-3">
          {syncItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-accent rounded-xl">
              <div className="flex items-center gap-2">
                {item.status === "ok"
                  ? <CheckCircle2 size={16} className="text-[hsl(142,71%,45%)]" />
                  : <AlertCircle size={16} className="text-primary" />}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <span className={`text-sm font-bold ${item.status === "warn" ? "text-primary" : "text-foreground"}`}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Aktionen */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col items-center gap-3 hover:bg-accent transition-all">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
            <Upload size={22} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground text-center">Objekte exportieren</span>
        </button>
        <button className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col items-center gap-3 hover:bg-accent transition-all">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
            <Download size={22} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground text-center">Daten importieren</span>
        </button>
      </div>

      {/* Letzte Exporte */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Letzte Exporte</h2>
        </div>
        <div className="space-y-3">
          {letzteExporte.map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-accent rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{e.datum}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    e.status === "Erfolgreich"
                      ? "bg-card text-[hsl(142,71%,45%)] border border-[hsl(142,71%,45%)]/20"
                      : "bg-card text-primary border border-primary/20"
                  }`}>
                    {e.status === "Erfolgreich" ? "✓" : "⚠"} {e.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.objekte} Objekte · {e.datei}</p>
              </div>
              <button className="flex-shrink-0 p-2 rounded-xl hover:bg-card transition-all">
                <FileDown size={16} className="text-primary" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* API-Konfiguration */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h2 className="font-bold text-foreground mb-3">API-Konfiguration</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ImmoZ API-Key</label>
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Makler-ID</label>
            <input
              type="text"
              defaultValue="AT-1234567"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all">
            Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
}
