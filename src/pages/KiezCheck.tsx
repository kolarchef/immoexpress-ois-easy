import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, BarChart3, Compass, GraduationCap, Bus, RefreshCw } from "lucide-react";
import { sendAction } from "@/lib/sendAction";
import { useToast } from "@/hooks/use-toast";

const BEZIRKE = [
  { value: "1010", label: "1. Innere Stadt" },
  { value: "1020", label: "2. Leopoldstadt" },
  { value: "1030", label: "3. Landstraße" },
  { value: "1040", label: "4. Wieden" },
  { value: "1050", label: "5. Margareten" },
  { value: "1060", label: "6. Mariahilf" },
  { value: "1070", label: "7. Neubau" },
  { value: "1080", label: "8. Josefstadt" },
  { value: "1090", label: "9. Alsergrund" },
  { value: "1100", label: "10. Favoriten" },
  { value: "1110", label: "11. Simmering" },
  { value: "1120", label: "12. Meidling" },
  { value: "1130", label: "13. Hietzing" },
  { value: "1140", label: "14. Penzing" },
  { value: "1150", label: "15. Rudolfsheim-Fünfhaus" },
  { value: "1160", label: "16. Ottakring" },
  { value: "1170", label: "17. Hernals" },
  { value: "1180", label: "18. Währing" },
  { value: "1190", label: "19. Döbling" },
  { value: "1200", label: "20. Brigittenau" },
  { value: "1210", label: "21. Floridsdorf" },
  { value: "1220", label: "22. Donaustadt" },
  { value: "1230", label: "23. Liesing" },
];


interface WebhookData {
  [key: string]: unknown;
}

function useWebhookData(actionId: string, params: Record<string, string> = {}) {
  const [data, setData] = useState<WebhookData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sendAction(actionId, params);
      if (result.ok) {
        toast({ title: "Daten geladen", description: `${actionId} erfolgreich.` });
      } else {
        toast({ title: "Webhook-Fehler", description: `Status: ${result.status}`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Fehler", description: "Verbindung zum Webhook fehlgeschlagen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [actionId, JSON.stringify(params)]);

  return { data, loading, refetch: fetch_ };
}

/* ─── Tab 1: Karte ─── */
function KarteTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: "65vh" }}>
        <iframe
          title="Wien Karte"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          src="https://www.openstreetmap.org/export/embed.html?bbox=16.2%2C48.12%2C16.55%2C48.30&layer=mapnik&marker=48.2082%2C16.3738"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">Kartenansicht: Wien Zentrum (OpenStreetMap)</p>
    </div>
  );
}

/* ─── Tab 2: Statistik ─── */
function StatistikTab() {
  const [bezirk, setBezirk] = useState("1020");
  const { loading, refetch } = useWebhookData("get_district_stats", { bezirk });

  useEffect(() => { refetch(); }, [bezirk]);

  const mockStats = [
    { label: "Einwohner", value: "105.326" },
    { label: "Durchschnittsmiete", value: "€ 13,80/m²" },
    { label: "Kaufpreis Ø", value: "€ 4.250/m²" },
    { label: "Grünfläche", value: "18,4%" },
    { label: "Leerstand", value: "3,2%" },
    { label: "Neubauprojekte", value: "12" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={bezirk} onValueChange={setBezirk}>
          <SelectTrigger className="w-64 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BEZIRKE.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="card-radius">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
          : mockStats.map((s) => (
              <Card key={s.label} className="card-radius shadow-card">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}

/* ─── Tab 3: Entdecken ─── */
function EntdeckenTab() {
  const categories = [
    { icon: "🏛️", name: "Kultur", count: 34 },
    { icon: "🍽️", name: "Gastronomie", count: 128 },
    { icon: "🛍️", name: "Einkaufen", count: 87 },
    { icon: "🌳", name: "Parks", count: 22 },
    { icon: "🏥", name: "Gesundheit", count: 15 },
    { icon: "🏋️", name: "Sport", count: 19 },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">Entdecke die Infrastruktur rund um dein Objekt.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((c) => (
          <Card key={c.name} className="card-radius shadow-card hover:shadow-orange transition-shadow cursor-pointer group">
            <CardContent className="p-6 text-center">
              <span className="text-4xl block mb-3">{c.icon}</span>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</p>
              <Badge variant="secondary" className="mt-2">{c.count} Orte</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Tab 4: Bildung ─── */
function BildungTab() {
  const [bezirk, setBezirk] = useState("1020");
  const { loading, refetch } = useWebhookData("get_school_data", { bezirk });

  useEffect(() => { refetch(); }, [bezirk]);

  const mockSchools = [
    { name: "VS Vereinsgasse", type: "Volksschule", distance: "350m" },
    { name: "NMS Pazmanitengasse", type: "Mittelschule", distance: "600m" },
    { name: "GRG2 Zirkusgasse", type: "Gymnasium", distance: "800m" },
    { name: "HTBLVA Spengergasse", type: "Berufsschule", distance: "1.2km" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={bezirk} onValueChange={setBezirk}>
          <SelectTrigger className="w-64 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BEZIRKE.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="card-radius">
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          : mockSchools.map((s) => (
              <Card key={s.name} className="card-radius shadow-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.type}</p>
                  </div>
                  <Badge variant="outline">{s.distance}</Badge>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}

/* ─── Tab 5: Mobilität ─── */
function MobilitaetTab() {
  const [bezirk, setBezirk] = useState("1020");
  const { loading, refetch } = useWebhookData("get_transit_live", { bezirk });

  useEffect(() => { refetch(); }, [bezirk]);

  const mockTransit = [
    { line: "U2", destination: "Seestadt", wait: "3 min", type: "U-Bahn" },
    { line: "1", destination: "Prater Hauptallee", wait: "5 min", type: "Straßenbahn" },
    { line: "5A", destination: "Praterstern", wait: "8 min", type: "Bus" },
    { line: "U1", destination: "Leopoldau", wait: "2 min", type: "U-Bahn" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={bezirk} onValueChange={setBezirk}>
          <SelectTrigger className="w-64 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BEZIRKE.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="card-radius">
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          : mockTransit.map((t, i) => (
              <Card key={i} className="card-radius shadow-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xs">{t.line}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t.destination}</p>
                    <p className="text-xs text-muted-foreground">{t.type}</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">{t.wait}</Badge>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function KiezCheck() {
  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-[#0A0A0A] text-white px-6 py-10 rounded-b-3xl mb-6">
        <h1 className="text-3xl font-bold mb-1">KiezCheck Wien</h1>
        <p className="text-white/60 text-sm">Bezirksdaten · Infrastruktur · Echtzeit-ÖPNV</p>
      </div>

      <div className="px-4 pb-10">
        <Tabs defaultValue="karte" className="w-full">
          <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 rounded-2xl mb-6 overflow-x-auto">
            <TabsTrigger value="karte" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="h-4 w-4" /> Karte
            </TabsTrigger>
            <TabsTrigger value="statistik" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" /> Statistik
            </TabsTrigger>
            <TabsTrigger value="entdecken" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Compass className="h-4 w-4" /> Entdecken
            </TabsTrigger>
            <TabsTrigger value="bildung" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GraduationCap className="h-4 w-4" /> Bildung
            </TabsTrigger>
            <TabsTrigger value="mobilitaet" className="rounded-xl gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bus className="h-4 w-4" /> Mobilität
            </TabsTrigger>
          </TabsList>

          <TabsContent value="karte"><KarteTab /></TabsContent>
          <TabsContent value="statistik"><StatistikTab /></TabsContent>
          <TabsContent value="entdecken"><EntdeckenTab /></TabsContent>
          <TabsContent value="bildung"><BildungTab /></TabsContent>
          <TabsContent value="mobilitaet"><MobilitaetTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
