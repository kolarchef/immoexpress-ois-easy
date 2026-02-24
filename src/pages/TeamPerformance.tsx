import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { TrendingUp, Users, DollarSign, FileCheck } from "lucide-react";

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

export default function TeamPerformance() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [zeitraum, setZeitraum] = useState<"monat" | "jahr">("monat");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    const load = async () => {
      const [{ data: k }, { data: p }] = await Promise.all([
        supabase.from("crm_kunden").select("id,name,user_id,finance_status,created_at,updated_at,objekt_id").not("user_id", "is", null),
        supabase.from("profiles").select("user_id,display_name,email"),
      ]);
      if (k) setKunden(k as Kunde[]);
      if (p) setProfiles(p as Profile[]);
    };
    load();
  }, []);

  // Objekt-Kaufpreise für Volumen
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

  const maklerName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.display_name || p?.email?.split("@")[0] || "Unbekannt";
  };

  const maklerIds = useMemo(() => {
    const set = new Set<string>();
    filteredKunden.forEach((k) => { if (k.user_id) set.add(k.user_id); });
    return Array.from(set);
  }, [filteredKunden]);

  const chartData = useMemo(() => {
    return maklerIds.map((uid) => {
      const mine = filteredKunden.filter((k) => k.user_id === uid);
      const abgeschlossen = mine.filter((k) => k.finance_status === "Abgeschlossen").length;
      const storniert = mine.filter((k) => ["Storniert", "Abgelehnt"].includes(k.finance_status || "")).length;
      const gesamt = mine.length;
      return { name: maklerName(uid), Abgeschlossen: abgeschlossen, Storniert: storniert, Gesamt: gesamt };
    });
  }, [maklerIds, filteredKunden, profiles]);

  // KPIs
  const totalFaelle = filteredKunden.length;
  const totalAbgeschlossen = filteredKunden.filter((k) => k.finance_status === "Abgeschlossen").length;
  const totalStorniert = filteredKunden.filter((k) => ["Storniert", "Abgelehnt"].includes(k.finance_status || "")).length;
  const totalVolumen = filteredKunden
    .filter((k) => k.finance_status === "Abgeschlossen" && k.objekt_id)
    .reduce((sum, k) => sum + (objektPreise[k.objekt_id!] || 0), 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("de-AT", { month: "long", year: "numeric" }) };
  });

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">📊 Team-Performance</h1>
        <div className="flex items-center gap-3">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase">
            <DollarSign size={14} /> Finanzierungsvolumen
          </div>
          <span className="text-2xl font-bold text-foreground">€ {totalVolumen.toLocaleString("de-AT")}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase">
            <FileCheck size={14} /> Eingereichte Fälle
          </div>
          <span className="text-2xl font-bold text-foreground">{totalFaelle}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase">
            <TrendingUp size={14} /> Abgeschlossen
          </div>
          <span className="text-2xl font-bold text-green-600">{totalAbgeschlossen}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase">
            <Users size={14} /> Storniert
          </div>
          <span className="text-2xl font-bold text-red-500">{totalStorniert}</span>
        </Card>
      </div>

      {/* Makler-Charts */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Makler-Auswertung</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Daten für den gewählten Zeitraum.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Abgeschlossen" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Storniert" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Gesamt" fill="hsl(220, 14%, 70%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}