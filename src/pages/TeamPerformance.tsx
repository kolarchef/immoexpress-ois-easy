import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { TrendingUp, Users, DollarSign, FileCheck, Home, Download, Upload, Trophy, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { sendAction } from "@/lib/sendAction";

type Kunde = {
  id: string;
  name: string;
  user_id: string | null;
  finance_status: string | null;
  kaufpreis: number | null;
  created_at: string;
  updated_at: string;
  objekt_id: string | null;
};

type Profile = { user_id: string; display_name: string | null; email: string | null };
type UserRole = { user_id: string; role: string };

export default function TeamPerformance() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [zeitraum, setZeitraum] = useState<"monat" | "jahr">("monat");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState("gesamt");
  const [archivFiles, setArchivFiles] = useState<{ name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [immozSyncing, setImmozSyncing] = useState(false);
  const [lastImmozSync, setLastImmozSync] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      const [{ data: k }, { data: p }, { data: r }] = await Promise.all([
        supabase.from("crm_kunden").select("id,name,user_id,finance_status,created_at,updated_at,objekt_id").not("user_id", "is", null),
        supabase.from("profiles").select("user_id,display_name,email"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (k) setKunden(k as Kunde[]);
      if (p) setProfiles(p as Profile[]);
      if (r) setRoles(r as UserRole[]);
    };
    load();
  }, []);

  // Last ImmoZ sync
  useEffect(() => {
    supabase.from("immoz_exporte").select("erstellt_am").order("erstellt_am", { ascending: false }).limit(1).then(({ data }) => {
      if (data?.[0]) setLastImmozSync(data[0].erstellt_am);
    });
  }, []);

  const handleImmozSync = async () => {
    setImmozSyncing(true);
    try {
      const res = await sendAction("immoz_sync", { typ: "manuell" });
      if (res.ok) {
        const now = new Date().toISOString();
        setLastImmozSync(now);
        toast({ title: "✓ ImmoZ-Abgleich gestartet", description: "Die Daten werden im Hintergrund synchronisiert." });
      } else {
        toast({ title: "Sync-Fehler", description: "Verbindung zu ImmoZ konnte nicht hergestellt werden.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Sync-Fehler", description: "Bitte prüfe deine Webhook-Konfiguration.", variant: "destructive" });
    } finally {
      setImmozSyncing(false);
    }
  };

  // Objekt-Kaufpreise
  const [objektPreise, setObjektPreise] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from("objekte").select("id,kaufpreis").then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((o: any) => { if (o.kaufpreis) map[o.id] = Number(o.kaufpreis); });
        setObjektPreise(map);
      }
    });
  }, []);

  // Verkaufte Objekte
  const [verkaufteObjekte, setVerkaufteObjekte] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("objekte").select("id,kaufpreis,user_id,updated_at,status").eq("status", "verkauft").then(({ data }) => {
      if (data) setVerkaufteObjekte(data);
    });
  }, []);

  const getUserRole = (userId: string): "admin" | "makler" => {
    const r = roles.find((ro) => ro.user_id === userId);
    return r?.role === "admin" ? "admin" : "makler";
  };

  // Trainee = makler role, Makler display includes admin
  const isTrainee = (userId: string) => getUserRole(userId) === "makler";

  const filteredKunden = useMemo(() => {
    return kunden.filter((k) => {
      const d = new Date(k.created_at);
      if (zeitraum === "monat") {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === selectedMonth;
      }
      return String(d.getFullYear()) === selectedYear;
    });
  }, [kunden, zeitraum, selectedMonth, selectedYear]);

  const filteredVerkaufte = useMemo(() => {
    return verkaufteObjekte.filter((o) => {
      const d = new Date(o.updated_at);
      if (zeitraum === "monat") {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === selectedMonth;
      }
      return String(d.getFullYear()) === selectedYear;
    });
  }, [verkaufteObjekte, zeitraum, selectedMonth, selectedYear]);

  const maklerName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.display_name || p?.email?.split("@")[0] || "Unbekannt";
  };

  const maklerIds = useMemo(() => {
    const set = new Set<string>();
    filteredKunden.forEach((k) => { if (k.user_id) set.add(k.user_id); });
    return Array.from(set);
  }, [filteredKunden]);

  const buildChartData = (filterFn?: (uid: string) => boolean) => {
    const ids = filterFn ? maklerIds.filter(filterFn) : maklerIds;
    return ids.map((uid) => {
      const mine = filteredKunden.filter((k) => k.user_id === uid);
      const abgeschlossen = mine.filter((k) => k.finance_status === "Abgeschlossen").length;
      const storniert = mine.filter((k) => ["Storniert", "Abgelehnt"].includes(k.finance_status || "")).length;
      const gesamt = mine.length;
      return { name: maklerName(uid), Abgeschlossen: abgeschlossen, Storniert: storniert, Gesamt: gesamt, uid, isTrainee: isTrainee(uid) };
    }).sort((a, b) => b.Abgeschlossen - a.Abgeschlossen);
  };

  const gesamtChartData = useMemo(() => buildChartData(), [maklerIds, filteredKunden, profiles, roles]);
  const maklerChartData = useMemo(() => buildChartData((uid) => !isTrainee(uid)), [maklerIds, filteredKunden, profiles, roles]);
  const traineeChartData = useMemo(() => buildChartData((uid) => isTrainee(uid)), [maklerIds, filteredKunden, profiles, roles]);

  // KPIs
  const totalFaelle = filteredKunden.length;
  const totalAbgeschlossen = filteredKunden.filter((k) => k.finance_status === "Abgeschlossen").length;
  const totalStorniert = filteredKunden.filter((k) => ["Storniert", "Abgelehnt"].includes(k.finance_status || "")).length;
  const totalVolumen = filteredKunden
    .filter((k) => k.finance_status === "Abgeschlossen" && k.objekt_id)
    .reduce((sum, k) => sum + (objektPreise[k.objekt_id!] || 0), 0);
  const totalVerkaufte = filteredVerkaufte.length;
  const totalUmsatz = filteredVerkaufte.reduce((sum, o) => sum + (Number(o.kaufpreis) || 0), 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("de-AT", { month: "long", year: "numeric" }) };
  });
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Business-Cockpit – Management Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Zeitraum: ${zeitraum === "monat" ? selectedMonth : selectedYear}`, 14, 30);
    doc.setFontSize(12);
    let y = 42;
    doc.text(`Finanzierungsvolumen: € ${totalVolumen.toLocaleString("de-AT")}`, 14, y); y += 8;
    doc.text(`Gesamtumsatz (Verkauf): € ${totalUmsatz.toLocaleString("de-AT")}`, 14, y); y += 8;
    doc.text(`Eingereichte Fälle: ${totalFaelle}`, 14, y); y += 8;
    doc.text(`Abgeschlossen: ${totalAbgeschlossen}`, 14, y); y += 8;
    doc.text(`Storniert: ${totalStorniert}`, 14, y); y += 8;
    doc.text(`Verkaufte Objekte: ${totalVerkaufte}`, 14, y); y += 14;
    doc.setFontSize(14);
    doc.text("Makler-Ranking", 14, y); y += 8;
    doc.setFontSize(10);
    gesamtChartData.forEach((d, i) => {
      const tag = d.isTrainee ? " (Trainee)" : "";
      doc.text(`${i + 1}. ${d.name}${tag} — Abgeschl.: ${d.Abgeschlossen}, Storn.: ${d.Storniert}, Gesamt: ${d.Gesamt}`, 14, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`Business-Cockpit_${zeitraum === "monat" ? selectedMonth : selectedYear}.pdf`);
    toast({ title: "📄 PDF erstellt", description: "Management-Report wurde heruntergeladen." });
  };

  const handleArchivUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `archiv/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("finanz-tresor").upload(path, file);
    if (error) { toast({ title: "Upload fehlgeschlagen", variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("finanz-tresor").getPublicUrl(path);
    setArchivFiles((prev) => [...prev, { name: file.name, url: urlData.publicUrl }]);
    toast({ title: "✅ Archiv-PDF hochgeladen" });
  };

  const renderChart = (data: typeof gesamtChartData) => (
    data.length === 0 ? (
      <p className="text-sm text-muted-foreground">Keine Daten für den gewählten Zeitraum.</p>
    ) : (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 110, right: 20 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Abgeschlossen" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.isTrainee ? "hsl(30, 90%, 55%)" : "hsl(210, 70%, 50%)"} />
              ))}
            </Bar>
            <Bar dataKey="Storniert" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Gesamt" fill="hsl(220, 14%, 70%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(210, 70%, 50%)" }} /> Makler</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(30, 90%, 55%)" }} /> Trainee</span>
        </div>
      </div>
    )
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy size={24} className="text-primary" /> Business-Cockpit
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={zeitraum} onValueChange={(v) => setZeitraum(v as "monat" | "jahr")}>
            <TabsList>
              <TabsTrigger value="monat">Monatsansicht</TabsTrigger>
              <TabsTrigger value="jahr">Jahresansicht</TabsTrigger>
            </TabsList>
          </Tabs>
          {zeitraum === "monat" ? (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase"><DollarSign size={14} /> Finanz-Volumen</div>
          <span className="text-xl font-bold text-foreground">€ {totalVolumen.toLocaleString("de-AT")}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase"><Home size={14} /> Gesamtumsatz</div>
          <span className="text-xl font-bold text-foreground">€ {totalUmsatz.toLocaleString("de-AT")}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase"><Home size={14} /> Verkaufte Obj.</div>
          <span className="text-xl font-bold text-foreground">{totalVerkaufte}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase"><FileCheck size={14} /> Eingereicht</div>
          <span className="text-xl font-bold text-foreground">{totalFaelle}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase"><TrendingUp size={14} /> Abgeschlossen</div>
          <span className="text-xl font-bold text-green-600">{totalAbgeschlossen}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase"><Users size={14} /> Storniert</div>
          <span className="text-xl font-bold text-red-500">{totalStorniert}</span>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="gesamt">Gesamt-Business</TabsTrigger>
          <TabsTrigger value="makler">Makler</TabsTrigger>
          <TabsTrigger value="trainees">Trainees</TabsTrigger>
        </TabsList>

        <TabsContent value="gesamt">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Trophy size={18} className="text-primary" /> Leaderboard – Alle</h2>
            </div>
            {renderChart(gesamtChartData)}
          </Card>
        </TabsContent>

        <TabsContent value="makler">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Makler-Auswertung</h2>
            {renderChart(maklerChartData)}
          </Card>
        </TabsContent>

        <TabsContent value="trainees">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Trainee-Auswertung</h2>
            {renderChart(traineeChartData)}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ImmoZ Hybrid-Sync */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">ImmoZ Hybrid-Sync</h2>
              <p className="text-xs text-muted-foreground">
                Letzter Abgleich: {lastImmozSync
                  ? new Date(lastImmozSync).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "– noch kein Abgleich –"}
              </p>
            </div>
          </div>
          <Button onClick={handleImmozSync} disabled={immozSyncing} className="gap-2">
            <RefreshCw size={16} className={immozSyncing ? "animate-spin" : ""} />
            {immozSyncing ? "Wird abgeglichen…" : "Daten von ImmoZ jetzt abgleichen"}
          </Button>
        </div>
      </Card>

      {/* PDF Export & Archiv */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Management-Report</h2>
          <Button onClick={handleExportPdf} className="w-full gap-2">
            <Download size={16} /> Management-Report (PDF) generieren
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Jahres-Archiv</h2>
          <p className="text-sm text-muted-foreground">PDF-Berichte vergangener Jahre hochladen und verwalten.</p>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleArchivUpload} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload size={16} /> PDF hochladen
          </Button>
          {archivFiles.length > 0 && (
            <ul className="space-y-2 mt-2">
              {archivFiles.map((f, i) => (
                <li key={i}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                    <FileCheck size={14} /> {f.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
