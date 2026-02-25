import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Clock,
  Users, Building2, ShieldAlert, GraduationCap,
  FileText, Mail, ArrowLeftRight,
  Video, Clipboard, FolderPlus,
  Search as SearchIcon, ShoppingCart, CheckSquare,
  FileSearch, Calculator, Handshake, Vault,
  Megaphone, BookOpen, Scale, Wrench, FileQuestion,
  Package, X, Trash2, Bell, CheckCircle2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type Module = { label: string; icon: any; path: string; adminOnly?: boolean };

const modules: Module[] = [
  { label: "CRM KUNDEN", icon: Users, path: "/crm" },
  { label: "OBJEKTE", icon: Building2, path: "/objekte" },
  { label: "EXPOSÉ", icon: FileText, path: "/expose" },
  { label: "STANDORT", icon: MapPin, path: "/kiezcheck" },
  { label: "SOS RECHT", icon: ShieldAlert, path: "/sos-recht" },
  { label: "MEETINGS", icon: Video, path: "/kalender" },
  { label: "MAIL", icon: Mail, path: "/newsletter" },
  { label: "LEARNING", icon: GraduationCap, path: "/academy" },
  { label: "NEWSLETTER", icon: Clipboard, path: "/newsletter-modul" },
  { label: "SUCHE", icon: SearchIcon, path: "/suche" },
  { label: "IMMOZ", icon: ArrowLeftRight, path: "/immoz" },
  { label: "BESTELLUNGEN", icon: ShoppingCart, path: "/bestellung" },
  { label: "UNTERLAGEN+", icon: FolderPlus, path: "/unterlagen" },
  { label: "GRUNDBUCH", icon: FileSearch, path: "/grundbuch" },
  { label: "BEWERTUNG", icon: Calculator, path: "/bewertung" },
  { label: "NETZWERK", icon: Handshake, path: "/netzwerk" },
  { label: "FINANZ-TRESOR", icon: Vault, path: "/finanz-tresor", adminOnly: true },
  { label: "TEAM", icon: Users, path: "/team", adminOnly: true },
  { label: "WERBUNG", icon: Megaphone, path: "/werbung", adminOnly: true },
];

const todos = [
  { id: 1, text: "Alleinvermittlungsvertrag Mayer unterzeichnen lassen", done: false, prio: "hoch" },
  { id: 2, text: "Exposé für Penthouse 1010 Wien finalisieren", done: false, prio: "mittel" },
  { id: 3, text: "Nebenkostenübersicht für Müller vorbereiten", done: true, prio: "niedrig" },
  { id: 4, text: "Finanzamt-Gebühren Kaufvertrag Schober berechnen", done: false, prio: "hoch" },
  { id: 5, text: "Rückruf KlientIn Schmidt (0664 123 4567)", done: false, prio: "mittel" },
];

const appointments = [
  { time: "10:30", duration: "60 MIN", title: "Villa Seeufer Besichtigung", location: "Am See 14, Berlin" },
  { time: "14:00", duration: "30 MIN", title: "Notartermin: Müller & Partner", location: "Beurkundung CRM" },
];

const prioColor: Record<string, string> = {
  hoch: "text-destructive",
  mittel: "text-primary",
  niedrig: "text-muted-foreground",
};

const expertenTools = [
  { label: "ImmoExpress Concierge", desc: "Alle Daten & Checklisten", icon: Wrench, path: "/immo-concierge" },
  { label: "Provisions-Rechner", desc: "Brutto / Netto Kalkulation", icon: Calculator, path: "/provisions-rechner" },
  { label: "Gesetzbuch", desc: "Mietrecht & Richtwerte", icon: Scale, path: "/gesetzbuch" },
  { label: "Handbuch", desc: "Interne Wissensdatenbank", icon: FileQuestion, path: "/academy" },
];

type OrderRow = {
  id: string;
  user_id: string;
  produkt: string;
  menge: number;
  status: string;
  created_at: string;
};

type Profile = { user_id: string; display_name: string | null; email: string | null };

export default function Launchpad() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todoList, setTodoList] = useState(todos);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [openOrders, setOpenOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      const admin = !!data?.length;
      setIsAdmin(admin);
      if (admin) fetchOpenOrders();
    });
  }, [user]);

  const fetchOpenOrders = async () => {
    const [ordRes, profRes] = await Promise.all([
      supabase.from("bestellungen").select("*").eq("status", "offen").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, email"),
    ]);
    setOpenOrders((ordRes.data as OrderRow[]) || []);
    const profMap: Record<string, Profile> = {};
    ((profRes.data as Profile[]) || []).forEach(p => { profMap[p.user_id] = p; });
    setProfiles(profMap);
    // Auto-show popup if there are open orders
    if ((ordRes.data as OrderRow[])?.length > 0) setShowOrders(true);
  };

  const getName = (userId: string) => profiles[userId]?.display_name || profiles[userId]?.email || userId.slice(0, 8);

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
    await sendNotification(order.user_id, "Bestellung aufgegeben!", `Deine Bestellung "${order.produkt}" wurde soeben bei Flyeralarm aufgegeben!`);
    toast({ title: "Bei Flyeralarm bestellt & Mitarbeiter benachrichtigt" });
    fetchOpenOrders();
  };

  const handleAllesBestellen = async () => {
    for (const o of openOrders) {
      await supabase.from("bestellungen").update({ status: "bestellt", bestellt_am: new Date().toISOString() } as any).eq("id", o.id);
      await sendNotification(o.user_id, "Bestellung aufgegeben!", `Deine Bestellung "${o.produkt}" wurde soeben bei Flyeralarm aufgegeben!`);
    }
    toast({ title: `${openOrders.length} Bestellungen bei Flyeralarm aufgegeben` });
    fetchOpenOrders();
  };

  const handleAblehnen = async (order: OrderRow) => {
    const { error } = await supabase.from("bestellungen").delete().eq("id", order.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    await sendNotification(order.user_id, "Bestellung abgelehnt", `Deine Bestellung "${order.produkt}" wurde leider abgelehnt.`);
    toast({ title: "Bestellung abgelehnt & gelöscht" });
    fetchOpenOrders();
  };

  const visibleModules = modules.filter(m => !m.adminOnly || isAdmin);

  const toggleTodo = (id: number) =>
    setTodoList((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto" style={{ paddingBottom: 150 }}>
      {/* Admin: Offene Bestellungen Popup */}
      {isAdmin && (
        <Dialog open={showOrders} onOpenChange={setShowOrders}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package size={18} className="text-primary" />
                Offene Bestellungen ({openOrders.length})
              </DialogTitle>
            </DialogHeader>

            {openOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Keine offenen Bestellungen 🎉</p>
            ) : (
              <>
                <div className="space-y-2 mt-2">
                  {openOrders.map(o => (
                    <div key={o.id} className="bg-muted/30 rounded-xl p-3 border border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{o.menge}x {o.produkt}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {getName(o.user_id)} · {new Date(o.created_at).toLocaleDateString("de-AT")}
                          </p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 shrink-0">Offen</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleBestellen(o)} className="flex-1 text-xs">
                          <ShoppingCart size={12} className="mr-1" /> Bestellen (Flyeralarm)
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAblehnen(o)} className="text-xs">
                          <Trash2 size={12} className="mr-1" /> Ablehnen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 mt-2 flex gap-2">
                  <Button onClick={handleAllesBestellen} className="flex-1 text-xs">
                    <ShoppingCart size={14} className="mr-1" /> Alle bestellen
                  </Button>
                  <Button variant="outline" onClick={() => setShowOrders(false)} className="text-xs">
                    Später
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Admin: Open orders badge button */}
      {isAdmin && openOrders.length > 0 && !showOrders && (
        <button
          onClick={() => setShowOrders(true)}
          className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Package size={20} className="text-amber-700" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">{openOrders.length} offene Bestellung{openOrders.length !== 1 ? "en" : ""}</p>
            <p className="text-xs text-muted-foreground">Klicke um zu bearbeiten</p>
          </div>
          <Badge className="bg-amber-100 text-amber-800">{openOrders.length}</Badge>
        </button>
      )}

      {/* To-Do Liste */}
      <section className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckSquare size={18} className="text-primary" /> Aufgaben
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {todoList.filter((t) => !t.done).length} offen
          </span>
        </div>
        <div className="space-y-2">
          {todoList.map((todo) => (
            <div
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                todo.done ? "bg-muted opacity-60" : "bg-accent hover:bg-secondary"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  todo.done ? "bg-primary border-primary" : "border-muted-foreground"
                }`}
              >
                {todo.done && <span className="text-primary-foreground text-xs">✓</span>}
              </div>
              <span className={`text-sm flex-1 ${todo.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {todo.text}
              </span>
              <span className={`text-[10px] font-bold uppercase ${prioColor[todo.prio]}`}>{todo.prio}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Heutige Termine */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Heutige Termine</h2>
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="text-primary" /> CLOUD SYNC
          </span>
        </div>
        <div className="space-y-3">
          {appointments.map((apt, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-4 items-center">
              <div className="flex-shrink-0 text-left">
                <div className="font-bold text-primary text-base">{apt.time}</div>
                <div className="text-xs text-muted-foreground">{apt.duration}</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{apt.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {apt.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Module Grid */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Module</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {visibleModules.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card shadow-card border border-border hover:shadow-card-hover transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center transition-all group-hover:scale-105 text-primary">
                <Icon size={22} />
              </div>
              <span className="text-xs font-bold text-foreground uppercase tracking-wide text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Experten-Tools */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Experten-Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expertenTools.map(({ label, desc, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card border border-border hover:shadow-card-hover transition-all group text-left w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-105 text-primary">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-foreground block leading-tight">{label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
