import { useState, useEffect } from "react";
import { Shield, Download, Filter, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

type AuditEntry = {
  id: string;
  created_at: string;
  type: "mitarbeiter" | "kunde";
  user_name: string | null;
  gp_nummer: string | null;
  action: string;
  ip_address: string | null;
  modul: string | null;
  token: string | null;
};

export default function AuditLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpFilter, setGpFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (isAdmin !== true) return;
    loadEntries();
  }, [isAdmin]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      // Load staff consent logs
      const { data: staffData } = await supabase
        .from("audit_legal_consent")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      // Load customer consent logs
      const { data: customerData } = await supabase
        .from("customer_consent_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      // Get GP profiles for name resolution
      const { data: gpProfiles } = await supabase
        .from("geschaeftspartner")
        .select("id, name, gp_number");

      const gpMap = new Map<string, { name: string; gp_number: string | null }>();
      gpProfiles?.forEach(gp => gpMap.set(gp.id, { name: gp.name, gp_number: gp.gp_number }));

      const combined: AuditEntry[] = [];

      (staffData || []).forEach((s: any) => {
        const gp = s.gp_id ? gpMap.get(s.gp_id) : null;
        combined.push({
          id: s.id,
          created_at: s.created_at,
          type: "mitarbeiter",
          user_name: gp?.name || "Unbekannt",
          gp_nummer: s.gp_nummer || gp?.gp_number || null,
          action: `Mitarbeiter hat Haftungsausschluss akzeptiert (${s.modul || "SOS Recht"})`,
          ip_address: s.ip_address,
          modul: s.modul,
          token: null,
        });
      });

      (customerData || []).forEach((c: any) => {
        combined.push({
          id: c.id,
          created_at: c.created_at,
          type: "kunde",
          user_name: "Externer Kunde",
          gp_nummer: null,
          action: "Kunde hat PDF-Freigabe/Disclaimer bestätigt",
          ip_address: c.ip_address,
          modul: null,
          token: c.token,
        });
      });

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEntries(combined);
    } catch (e: any) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (gpFilter && !(e.gp_nummer || "").toLowerCase().includes(gpFilter.toLowerCase()) &&
        !(e.user_name || "").toLowerCase().includes(gpFilter.toLowerCase())) return false;
    if (dateFrom && new Date(e.created_at) < dateFrom) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(e.created_at) > end) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const header = "Zeitstempel;Nutzer;GP-Nummer;Aktion;IP-Adresse;Referenz\n";
    const rows = filteredEntries.map(e =>
      `"${format(new Date(e.created_at), "dd.MM.yyyy HH:mm:ss")}";"${e.user_name || ""}";"${e.gp_nummer || ""}";"${e.action}";"${e.ip_address || ""}";"${e.token || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportiert" });
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Audit-Log – SOS Recht (ImmoExpress brainy)", margin, 18);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm")} | Einträge: ${filteredEntries.length}`, margin, 24);

    const cols = ["Zeitstempel", "Nutzer", "GP-Nr.", "Aktion", "IP-Adresse"];
    const colX = [margin, margin + 40, margin + 80, margin + 105, margin + 200];
    let y = 34;

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(200, 80, 20);
    doc.rect(margin - 2, y - 5, pageWidth - 2 * margin + 4, 8, "F");
    cols.forEach((c, i) => doc.text(c, colX[i], y));
    y += 10;

    doc.setTextColor(50, 50, 50);
    let page = 1;

    filteredEntries.forEach(e => {
      if (y > pageHeight - 20) {
        doc.setFillColor(200, 30, 30);
        doc.rect(0, pageHeight - 12, pageWidth, 12, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text("Haftungsausschluss: Erstellt durch ImmoExpress brainy KI-System. Keine Rechtsberatung.", margin, pageHeight - 5);
        doc.text(`Seite ${page}`, pageWidth - margin, pageHeight - 5, { align: "right" });
        doc.addPage();
        page++;
        y = 20;
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
      }
      doc.text(format(new Date(e.created_at), "dd.MM.yy HH:mm"), colX[0], y);
      doc.text((e.user_name || "").substring(0, 20), colX[1], y);
      doc.text(e.gp_nummer || "–", colX[2], y);
      doc.text(e.action.substring(0, 50), colX[3], y);
      doc.text(e.ip_address || "–", colX[4], y);
      y += 6;
    });

    // Final footer
    doc.setFillColor(200, 30, 30);
    doc.rect(0, pageHeight - 12, pageWidth, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text("Haftungsausschluss: Erstellt durch ImmoExpress brainy KI-System. Keine Rechtsberatung.", margin, pageHeight - 5);
    doc.text(`Seite ${page}`, pageWidth - margin, pageHeight - 5, { align: "right" });

    doc.save(`audit_log_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF exportiert" });
  };

  if (isAdmin === null) return <div className="p-8 text-muted-foreground">Laden...</div>;
  if (isAdmin === false) return <Navigate to="/launchpad" replace />;

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit-Log</h1>
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">Rechtssicherheit · Haftungsprotokoll</p>
        </div>
        <Shield size={28} className="text-primary" />
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">GP-Nummer / Name</label>
          <input
            value={gpFilter}
            onChange={e => setGpFilter(e.target.value)}
            placeholder="z.B. GP-001 oder Mustermann"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Von</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-sm", !dateFrom && "text-muted-foreground")}>
                <Calendar size={14} className="mr-1" />
                {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "Startdatum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bis</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-sm", !dateTo && "text-muted-foreground")}>
                <Calendar size={14} className="mr-1" />
                {dateTo ? format(dateTo, "dd.MM.yyyy") : "Enddatum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-secondary transition-colors border border-border">
            <Download size={14} /> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs text-muted-foreground mb-3">{filteredEntries.length} Einträge gefunden</p>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Audit-Log...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Keine Einträge gefunden.</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="text-left p-3 font-semibold text-foreground text-xs">Zeitstempel</th>
                  <th className="text-left p-3 font-semibold text-foreground text-xs">Nutzer</th>
                  <th className="text-left p-3 font-semibold text-foreground text-xs">GP-Nr.</th>
                  <th className="text-left p-3 font-semibold text-foreground text-xs">Aktion</th>
                  <th className="text-left p-3 font-semibold text-foreground text-xs">IP-Adresse</th>
                  <th className="text-left p-3 font-semibold text-foreground text-xs">Referenz</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(e.created_at), "dd.MM.yyyy HH:mm:ss")}
                    </td>
                    <td className="p-3 text-xs text-foreground font-medium">{e.user_name || "–"}</td>
                    <td className="p-3">
                      {e.gp_nummer ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{e.gp_nummer}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-foreground max-w-xs truncate">{e.action}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{e.ip_address || "–"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {e.token ? (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">Token: {e.token.substring(0, 8)}...</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">{e.type === "mitarbeiter" ? "Intern" : "Extern"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
