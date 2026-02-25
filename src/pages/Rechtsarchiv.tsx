import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, FileText, Clock, ChevronRight, Scale, UserCheck, Lock, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type ArchivEntry = {
  id: string;
  typ: "haftung" | "widerruf" | "datenschutz" | "alleinvermittler";
  titel: string;
  zeitstempel: string;
  modul?: string;
  gp_nummer?: string;
  ip?: string;
  detail?: string;
};

const typConfig: Record<ArchivEntry["typ"], { label: string; icon: typeof Shield; color: string }> = {
  haftung: { label: "Haftungsausschluss", icon: Scale, color: "text-red-500 bg-red-500/10" },
  widerruf: { label: "Widerrufsbelehrung", icon: FileSignature, color: "text-amber-500 bg-amber-500/10" },
  datenschutz: { label: "Datenschutzbestätigung", icon: Lock, color: "text-blue-500 bg-blue-500/10" },
  alleinvermittler: { label: "Alleinvermittlerauftrag", icon: UserCheck, color: "text-emerald-500 bg-emerald-500/10" },
};

export default function Rechtsarchiv() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ArchivEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArchivEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    loadEntries();
  }, [user]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      // Load from audit_legal_consent
      const { data: consents } = await supabase
        .from("audit_legal_consent")
        .select("*")
        .order("created_at", { ascending: false });

      const mapped: ArchivEntry[] = (consents || []).map((c) => ({
        id: c.id,
        typ: c.modul === "datenschutz" ? "datenschutz" : c.modul === "widerruf" ? "widerruf" : c.modul === "alleinvermittler" ? "alleinvermittler" : "haftung",
        titel: c.modul === "datenschutz" ? "DSGVO-Einwilligung bestätigt" : c.modul === "widerruf" ? "Widerrufsbelehrung akzeptiert" : c.modul === "alleinvermittler" ? "Alleinvermittlerauftrag unterzeichnet" : `Haftungsausschluss – ${c.modul || "SOS Recht"}`,
        zeitstempel: c.created_at,
        modul: c.modul || "SOS Recht",
        gp_nummer: c.gp_nummer || undefined,
        ip: c.ip_address || undefined,
        detail: `Status: ${c.confirmation_status}`,
      }));

      setEntries(mapped);
    } catch (err) {
      console.error("Fehler beim Laden des Rechtsarchivs:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-destructive flex items-center justify-center shadow-lg">
          <FileText size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">§ Rechtsarchiv</h1>
          <p className="text-xs text-muted-foreground">Alle rechtlichen Bestätigungen & Dokumente</p>
        </div>
      </div>

      {/* Category badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(typConfig).map(([key, cfg]) => {
          const count = entries.filter((e) => e.typ === key).length;
          return (
            <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.color}`}>
              <cfg.icon size={12} /> {cfg.label} ({count})
            </span>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Clock size={20} className="animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Lade Archiv…</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Noch keine Einträge vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const cfg = typConfig[entry.typ];
            const IconComp = cfg.icon;
            return (
              <button
                key={entry.id}
                onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                className="w-full text-left bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <IconComp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{entry.titel}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.zeitstempel), "dd.MM.yyyy, HH:mm 'Uhr'", { locale: de })}
                      {entry.gp_nummer && <span className="ml-2">· GP {entry.gp_nummer}</span>}
                    </p>
                  </div>
                  <ChevronRight size={16} className={`text-muted-foreground transition-transform ${selected?.id === entry.id ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded detail */}
                {selected?.id === entry.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5 animate-fade-in">
                    <DetailRow label="Modul" value={entry.modul || "–"} />
                    <DetailRow label="GP-Nummer" value={entry.gp_nummer || "–"} />
                    <DetailRow label="IP-Adresse" value={entry.ip || "–"} />
                    <DetailRow label="Status" value={entry.detail || "–"} />
                    <DetailRow label="Zeitstempel" value={format(new Date(entry.zeitstempel), "dd.MM.yyyy HH:mm:ss", { locale: de })} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
