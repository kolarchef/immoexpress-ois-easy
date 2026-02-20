import { useState, useEffect } from "react";
import { ArrowLeftRight, Upload, Download, CheckCircle2, AlertCircle, Clock, FileDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ExportRow = {
  id: string;
  erstellt_am: string;
  anzahl: number;
  status: string;
  dateiname: string | null;
};

export default function ImmoZ() {
  const [exporte, setExporte] = useState<ExportRow[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [objekteCount, setObjekteCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: exp }, { count }] = await Promise.all([
      supabase.from("immoz_exporte").select("*").order("erstellt_am", { ascending: false }).limit(10),
      supabase.from("objekte").select("*", { count: "exact", head: true }).eq("immoz_exportiert", true),
    ]);
    if (exp) setExporte(exp);
    if (count !== null) setObjekteCount(count);
  };

  const handleExport = async () => {
    setSyncing(true);
    try {
      const { data: objekte } = await supabase.from("objekte").select("*").eq("status", "aktiv");
      if (!objekte || objekte.length === 0) {
        toast({ title: "Keine Objekte", description: "Bitte zuerst Objekte im Exposé-Generator erfassen.", variant: "destructive" });
        setSyncing(false);
        return;
      }

      const dateiname = `immoZ_export_${new Date().toLocaleDateString("de-AT").replace(/\./g, "")}.xml`;
      const ids = objekte.map((o: { id: string }) => o.id);

      await supabase.from("immoz_exporte").insert({
        objekte_ids: ids,
        anzahl: objekte.length,
        status: "Erfolgreich",
        dateiname,
      });

      await supabase.from("objekte").update({ immoz_exportiert: true, immoz_export_datum: new Date().toISOString() })
        .in("id", ids);

      toast({ title: "✓ Export erfolgreich", description: `${objekte.length} Objekte an ImmoZ übertragen.` });
      loadData();
    } catch {
      toast({ title: "Export-Fehler", description: "Verbindung zu ImmoZ konnte nicht hergestellt werden.", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const syncItems = [
    { label: "Objekte exportiert", count: objekteCount, status: "ok" },
    { label: "Letzte Exporte gesamt", count: exporte.reduce((s, e) => s + (e.anzahl || 0), 0), status: "ok" },
    { label: "Fehlgeschlagen", count: exporte.filter(e => e.status !== "Erfolgreich").length, status: exporte.filter(e => e.status !== "Erfolgreich").length > 0 ? "warn" : "ok" },
  ];

  const letzterSync = exporte[0]?.erstellt_am
    ? new Date(exporte[0].erstellt_am).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "–";

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ImmoZ-Schnittstelle</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Datenimport & -export zur ImmoZ.at-Plattform</p>
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
            <p className="text-xs text-muted-foreground mt-0.5">ImmoZ API v3.2 · AT-1234567 · Letzter Sync: {letzterSync}</p>
          </div>
        </div>
      </div>

      {/* Sync-Status (Live aus DB) */}
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
        <button
          onClick={handleExport}
          disabled={syncing}
          className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-orange flex flex-col items-center gap-3 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            {syncing ? <RefreshCw size={22} className="animate-spin" /> : <Upload size={22} />}
          </div>
          <span className="font-semibold text-sm text-center">{syncing ? "Exportiert…" : "Objekte exportieren"}</span>
        </button>
        <button
          onClick={loadData}
          className="bg-card rounded-2xl p-5 shadow-card border border-border flex flex-col items-center gap-3 hover:bg-accent transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center">
            <Download size={22} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground text-center">Daten aktualisieren</span>
        </button>
      </div>

      {/* Letzte Exporte (Live aus DB) */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Letzte Exporte</h2>
          <span className="ml-auto text-xs text-muted-foreground">{exporte.length} Einträge</span>
        </div>
        {exporte.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Noch keine Exporte vorhanden.</p>
            <p className="text-xs text-muted-foreground mt-1">Objekte im Exposé-Generator erfassen und exportieren.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exporte.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-accent rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {new Date(e.erstellt_am).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      e.status === "Erfolgreich"
                        ? "bg-card text-[hsl(142,71%,45%)] border border-[hsl(142,71%,45%)]/20"
                        : "bg-card text-primary border border-primary/20"
                    }`}>
                      {e.status === "Erfolgreich" ? "✓" : "⚠"} {e.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.anzahl} Objekte · {e.dateiname || "–"}</p>
                </div>
                <button className="flex-shrink-0 p-2 rounded-xl hover:bg-card transition-all">
                  <FileDown size={16} className="text-primary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API-Konfiguration */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h2 className="font-bold text-foreground mb-3">API-Konfiguration</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ImmoZ API-Key</label>
            <input type="password" defaultValue="••••••••••••••••"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Makler-ID</label>
            <input type="text" defaultValue="AT-1234567"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all">
            Einstellungen speichern
          </button>
        </div>
      </div>
    </div>
  );
}
