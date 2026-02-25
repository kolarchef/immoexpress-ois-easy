import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, Plus, Truck, Minus, Package, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const produkte = [
  { name: "Exposé Premium Druck A4", preis: 4.9, einheit: "je Seite", kategorie: "Druck", icon: "📄" },
  { name: "Schlüsselbund-Etiketten", preis: 12.0, einheit: "100 Stk.", kategorie: "Büro", icon: "🔑" },
  { name: "Besichtigungs-Mappen A4", preis: 28.5, einheit: "50 Stk.", kategorie: "Druck", icon: "📁" },
  { name: "ImmoExpress Visitenkarten", preis: 35.0, einheit: "250 Stk.", kategorie: "Marketing", icon: "💼" },
  { name: "Grundriss-Stempel Set", preis: 18.0, einheit: "Set", kategorie: "Büro", icon: "📐" },
  { name: "Immobilien-Schilder Wien", preis: 45.0, einheit: "je Stück", kategorie: "Marketing", icon: "🏠" },
];

const kategorien = ["Alle", "Druck", "Marketing", "Büro"];

type Order = {
  id: string;
  produkt: string;
  menge: number;
  status: string;
  created_at: string;
  bestellt_am: string | null;
  abgeschlossen_am: string | null;
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  offen: { label: "Offen", color: "bg-amber-100 text-amber-800", icon: Clock },
  bestellt: { label: "Bestellt", color: "bg-blue-100 text-blue-800", icon: Package },
  abgeschlossen: { label: "Abgeschlossen", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

export default function Bestellung() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("Alle");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bestellungen")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const filtered = filter === "Alle" ? produkte : produkte.filter(p => p.kategorie === filter);
  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);

  const addToCart = (name: string) => setCart(c => ({ ...c, [name]: (c[name] || 0) + 1 }));
  const removeFromCart = (name: string) => setCart(c => {
    const n = (c[name] || 0) - 1;
    if (n <= 0) { const { [name]: _, ...rest } = c; return rest; }
    return { ...c, [name]: n };
  });

  const submitOrder = async () => {
    if (!user || cartCount === 0) return;
    setSubmitting(true);
    const rows = Object.entries(cart).map(([produkt, menge]) => ({
      user_id: user.id,
      produkt,
      menge,
      status: "offen",
    }));
    const { error } = await supabase.from("bestellungen").insert(rows as any);
    setSubmitting(false);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${rows.length} Bestellung(en) aufgegeben` });
    setCart({});
    fetchOrders();
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bestellung</h1>
          <p className="text-muted-foreground text-sm">Materialien & Druckerzeugnisse</p>
        </div>
        <button onClick={submitOrder} disabled={cartCount === 0 || submitting} className="relative p-2.5 rounded-xl bg-card border border-border shadow-card hover:bg-accent transition-colors disabled:opacity-50">
          <ShoppingCart size={20} className="text-primary" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
          )}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {kategorien.map(k => (
          <button key={k} onClick={() => setFilter(k)} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${k === filter ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}>
            {k}
          </button>
        ))}
      </div>

      {/* Express Banner */}
      <div className="bg-accent rounded-2xl p-4 border border-primary/20 mb-5 flex items-center gap-3">
        <Truck size={20} className="text-primary flex-shrink-0" />
        <div>
          <p className="font-bold text-foreground text-sm">Expresslieferung Wien &amp; Bundesländer</p>
          <p className="text-xs text-muted-foreground">Bestellung bis 12:00 Uhr → Lieferung nächster Werktag</p>
        </div>
      </div>

      {/* Produkte */}
      <div className="space-y-3 mb-8">
        {filtered.map((p) => (
          <div key={p.name} className="bg-card rounded-2xl p-4 shadow-card border border-border flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">{p.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
              <span className="text-xs text-muted-foreground">{p.einheit}</span>
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{p.kategorie}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-primary text-base">€ {p.preis.toFixed(2)}</div>
              {cart[p.name] ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button onClick={() => removeFromCart(p.name)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-accent"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-5 text-center">{cart[p.name]}</span>
                  <button onClick={() => addToCart(p.name)} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"><Plus size={14} /></button>
                </div>
              ) : (
                <button onClick={() => addToCart(p.name)} className="mt-1.5 flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95">
                  <Plus size={12} /> In Korb
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      {cartCount > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-card border border-primary/30 mb-8">
          <h3 className="font-bold text-foreground text-sm mb-2">Warenkorb ({cartCount} Artikel)</h3>
          <div className="space-y-1">
            {Object.entries(cart).map(([name, qty]) => {
              const p = produkte.find(x => x.name === name);
              return (
                <div key={name} className="flex justify-between text-sm">
                  <span>{qty}x {name}</span>
                  <span className="font-semibold">€ {((p?.preis || 0) * qty).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <Button onClick={submitOrder} disabled={submitting} className="w-full mt-3">
            {submitting ? "Wird aufgegeben..." : "Bestellung aufgeben"}
          </Button>
        </div>
      )}

      {/* Meine Bestellungen */}
      {orders.length > 0 && (
        <section>
          <h2 className="font-bold text-foreground text-lg mb-3">Meine Bestellungen</h2>
          <div className="space-y-2">
            {orders.map(o => {
              const cfg = statusConfig[o.status] || statusConfig.offen;
              const Icon = cfg.icon;
              return (
                <div key={o.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                  <Icon size={18} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{o.menge}x {o.produkt}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("de-AT")}</p>
                  </div>
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
