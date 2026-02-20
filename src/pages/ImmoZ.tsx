import { ArrowLeftRight, Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";

const syncItems = [
  { label: "Objekte synchronisiert", count: 128, status: "ok" },
  { label: "Bilder übertragen", count: 842, status: "ok" },
  { label: "Ausstehend", count: 3, status: "warn" },
];

export default function ImmoZ() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ImmoZ-Schnittstelle</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Datenimport & -export zur ImmoZ-Plattform</p>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Sync-Status</h2>
          <span className="ml-auto text-xs bg-accent text-primary px-2.5 py-1 rounded-full font-semibold border border-primary/30">● Verbunden</span>
        </div>
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
        <div className="text-xs text-muted-foreground mt-3">Letzter Sync: heute, 08:42 Uhr</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col items-center gap-3 hover:bg-accent transition-all">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
            <Upload size={22} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">Objekte exportieren</span>
        </button>
        <button className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col items-center gap-3 hover:bg-accent transition-all">
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
            <Download size={22} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">Daten importieren</span>
        </button>
      </div>

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
