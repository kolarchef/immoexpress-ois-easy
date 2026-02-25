import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Package, CheckCircle2, Clock, ShoppingCart, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

type OrderRow = {
  id: string;
  user_id: string;
  produkt: string;
  menge: number;
  status: string;
  created_at: string;
  bestellt_am: string | null;
  abgeschlossen_am: string | null;
};

type Profile = { user_id: string; display_name: string | null; email: string | null };

const statusConfig: Record<string, { label: string; color: string }> = {
  offen: { label: "Offen", color: "bg-amber-100 text-amber-800" },
  bestellt: { label: "Bestellt", color: "bg-blue-100 text-blue-800" },
  abgeschlossen: { label: "Abgeschlossen", color: "bg-green-100 text-green-800" },
};

export default function BestellAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [ordRes, profRes] = await Promise.all([
      supabase.from("bestellungen").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, email"),
    ]);
    setOrders((ordRes.data as OrderRow[]) || []);
    const profMap: Record<string, Profile> = {};
    ((profRes.data as Profile[]) || []).forEach(p => { profMap[p.user_id] = p; });
    setProfiles(profMap);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const sendNotification = async (userId: string, titel: string, inhalt: string) => {
    if (!user) return;
    await supabase.from("nachrichten").insert({
      user_id: user.id,
      empfaenger_id: userId,
      titel,
      inhalt,
      typ: "bestellung",
    } as any);
  };

  const handleBestellen = async (order: OrderRow) => {
    const { error } = await supabase.from("bestellungen").update({
      status: "bestellt",
      bestellt_am: new Date().toISOString(),
    } as any).eq("id", order.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    await sendNotification(order.user_id, "Bestellung aufgegeben!", `Deine Bestellung "${order.produkt}" wurde soeben bei der Druckerei aufgegeben!`);
    toast({ title: "Bestellt & Mitarbeiter benachrichtigt" });
    fetchAll();
  };

  const handleWareAngekommen = async (order: OrderRow) => {
    const { error } = await supabase.from("bestellungen").update({
      status: "abgeschlossen",
      abgeschlossen_am: new Date().toISOString(),
    } as any).eq("id", order.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    await sendNotification(order.user_id, "Werbemittel angekommen!", "Deine Werbemittel sind im Büro angekommen und liegen für dich bereit!");
    toast({ title: "Abgeschlossen & Mitarbeiter informiert" });
    fetchAll();
  };

  const getName = (userId: string) => profiles[userId]?.display_name || profiles[userId]?.email || userId.slice(0, 8);

  const byStatus = (s: string) => orders.filter(o => o.status === s);

  const OrderCard = ({ o }: { o: OrderRow }) => {
    const cfg = statusConfig[o.status] || statusConfig.offen;
    return (
      <div className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{o.menge}x {o.produkt}</p>
          <p className="text-xs text-muted-foreground">
            {getName(o.user_id)} · {new Date(o.created_at).toLocaleDateString("de-AT")}
          </p>
        </div>
        <Badge className={cfg.color}>{cfg.label}</Badge>
        {o.status === "offen" && (
          <Button size="sm" onClick={() => handleBestellen(o)} className="text-xs">
            <ShoppingCart size={14} className="mr-1" /> Bestellen
          </Button>
        )}
        {o.status === "bestellt" && (
          <Button size="sm" variant="outline" onClick={() => handleWareAngekommen(o)} className="text-xs border-green-300 text-green-700 hover:bg-green-50">
            <Bell size={14} className="mr-1" /> Ware ist da
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-32 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/launchpad")} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-foreground">Bestellverwaltung (Admin)</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <Clock size={20} className="mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold">{byStatus("offen").length}</p>
          <p className="text-xs text-muted-foreground">Offen</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <Package size={20} className="mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{byStatus("bestellt").length}</p>
          <p className="text-xs text-muted-foreground">Bestellt</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <CheckCircle2 size={20} className="mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold">{byStatus("abgeschlossen").length}</p>
          <p className="text-xs text-muted-foreground">Abgeschlossen</p>
        </div>
      </div>

      <Tabs defaultValue="offen">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="offen">Offen ({byStatus("offen").length})</TabsTrigger>
          <TabsTrigger value="bestellt">Bestellt ({byStatus("bestellt").length})</TabsTrigger>
          <TabsTrigger value="abgeschlossen">Erledigt ({byStatus("abgeschlossen").length})</TabsTrigger>
        </TabsList>
        {["offen", "bestellt", "abgeschlossen"].map(s => (
          <TabsContent key={s} value={s} className="space-y-2 mt-3">
            {byStatus(s).length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Keine Bestellungen</p>}
            {byStatus(s).map(o => <OrderCard key={o.id} o={o} />)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
