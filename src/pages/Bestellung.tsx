import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, Plus, Truck, Minus, Package, CheckCircle2, Clock, AlertTriangle, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type GpFile = { name: string; path: string; url: string };

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
  const [gpFiles, setGpFiles] = useState<GpFile[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [gpId, setGpId] = useState<string | null>(null);

  // Error reporting state
  const [errorReports, setErrorReports] = useState<Record<string, string>>({});
  const [reportingFile, setReportingFile] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchGpFiles = async () => {
    if (!user) return;
    // Find the GP record for this user
    const { data: gp } = await supabase.from("geschaeftspartner").select("id").eq("user_id", user.id).single();
    if (!gp) { setGpFiles([]); return; }
    setGpId(gp.id);

    const { data: files } = await supabase.storage.from("gp-werbemittel").list(`${gp.id}/`);
    if (!files?.length) { setGpFiles([]); return; }

    const mapped = files.map(f => {
      const path = `${gp.id}/${f.name}`;
      const { data: urlData } = supabase.storage.from("gp-werbemittel").getPublicUrl(path);
      return { name: f.name, path, url: urlData.publicUrl };
    });
    setGpFiles(mapped);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bestellungen")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
  };

  useEffect(() => { fetchGpFiles(); fetchOrders(); }, [user]);

  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);
  const addToCart = (name: string) => {
    if (errorReports[name]) {
      toast({ title: "Bestellung gesperrt", description: "Du hast einen Fehler in diesem Design gemeldet. Warte auf die Korrektur.", variant: "destructive" });
      return;
    }
    setCart(c => ({ ...c, [name]: (c[name] || 0) + 1 }));
  };
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
      produkt: `Werbemittel: ${produkt}`,
      menge,
      status: "offen",
    }));
    const { error } = await supabase.from("bestellungen").insert(rows as any);
    setSubmitting(false);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${rows.length} Bestellung(en) zahlungspflichtig aufgegeben` });
    setCart({});
    setShowCart(false);
    fetchOrders();
  };

  const handleReportError = (fileName: string) => {
    if (!reportText.trim()) { toast({ title: "Bitte beschreibe den Fehler" }); return; }
    setErrorReports(prev => ({ ...prev, [fileName]: reportText }));
    // Remove from cart if present
    setCart(c => { const { [fileName]: _, ...rest } = c; return rest; });
    toast({ title: "Fehler gemeldet", description: "Der Bestell-Button für dieses Produkt ist gesperrt." });
    setReportingFile(null);
    setReportText("");

    // Send notification to admin
    if (user) {
      supabase.from("nachrichten").insert({
        user_id: user.id,
        titel: "Design-Fehler gemeldet",
        inhalt: `Fehler in "${fileName}": ${reportText}`,
        typ: "fehler",
      } as any);
    }
  };

  // Clean filename for display
  const displayName = (name: string) => {
    // Remove timestamp prefix like "1234567890_"
    const clean = name.replace(/^\d+_/, "");
    return clean.replace(/\.[^.]+$/, "");
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  const isPdf = (name: string) => /\.pdf$/i.test(name);

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bestellung</h1>
          <p className="text-muted-foreground text-sm">Deine personalisierten Werbemittel</p>
        </div>
        <button
          onClick={() => cartCount > 0 && setShowCart(true)}
          disabled={cartCount === 0}
          className="relative p-2.5 rounded-xl bg-card border border-border shadow-card hover:bg-accent transition-colors disabled:opacity-50"
        >
          <ShoppingCart size={20} className="text-primary" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
          )}
        </button>
      </div>

      {/* Express Banner */}
      <div className="bg-accent rounded-2xl p-4 border border-primary/20 mb-5 flex items-center gap-3">
        <Truck size={20} className="text-primary flex-shrink-0" />
        <div>
          <p className="font-bold text-foreground text-sm">Expresslieferung Wien &amp; Bundesländer</p>
          <p className="text-xs text-muted-foreground">Bestellung bis 12:00 Uhr → Lieferung nächster Werktag</p>
        </div>
      </div>

      {/* GP Werbemittel Files as Products */}
      {gpFiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">Keine Werbemittel hinterlegt</p>
          <p className="text-xs mt-1">Dein Admin muss zuerst Designs in deinem Profil hochladen.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {gpFiles.map(f => {
            const hasError = !!errorReports[f.name];
            return (
              <div key={f.path} className={`bg-card rounded-2xl p-4 shadow-card border ${hasError ? "border-destructive/40" : "border-border"}`}>
                <div className="flex items-start gap-4">
                  {/* Preview thumbnail */}
                  <div
                    className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewUrl(f.url)}
                  >
                    {isImage(f.name) ? (
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover rounded-xl" />
                    ) : isPdf(f.name) ? (
                      <div className="text-center">
                        <Eye size={20} className="mx-auto text-primary mb-1" />
                        <span className="text-[10px] text-muted-foreground">PDF</span>
                      </div>
                    ) : (
                      <Package size={24} className="text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{displayName(f.name)}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Personalisiertes Werbemittel</p>

                    {hasError && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                        <AlertTriangle size={12} />
                        <span>Fehler gemeldet – Bestellung gesperrt</span>
                      </div>
                    )}

                    {/* Error report button */}
                    {!hasError && (
                      <button
                        onClick={() => { setReportingFile(f.name); setReportText(""); }}
                        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <AlertTriangle size={12} /> Fehler im Design gefunden
                      </button>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {cart[f.name] ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => removeFromCart(f.name)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-accent"><Minus size={14} /></button>
                        <span className="text-sm font-bold w-5 text-center">{cart[f.name]}</span>
                        <button onClick={() => addToCart(f.name)} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(f.name)}
                        disabled={hasError}
                        className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} /> In den Korb
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline error reporting */}
                {reportingFile === f.name && (
                  <div className="mt-3 border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-semibold text-destructive">Was ist fehlerhaft?</p>
                    <Textarea
                      value={reportText}
                      onChange={e => setReportText(e.target.value)}
                      placeholder="Beschreibe den Fehler im Design (z.B. falsche Telefonnummer, Tippfehler…)"
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => handleReportError(f.name)} className="flex-1">
                        <Send size={12} className="mr-1" /> Fehler melden
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReportingFile(null)} className="flex-1">
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Dialog – 2-step confirmation */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary" /> Warenkorb
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {Object.entries(cart).map(([name, qty]) => (
              <div key={name} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm flex-1 truncate">{displayName(name)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(name)} className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-accent"><Minus size={12} /></button>
                  <span className="text-sm font-bold w-4 text-center">{qty}</span>
                  <button onClick={() => addToCart(name)} className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center"><Plus size={12} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 mt-3">
            <p className="text-xs text-muted-foreground mb-3">
              Mit Klick auf den Button wird deine Bestellung verbindlich aufgegeben.
            </p>
            <Button onClick={submitOrder} disabled={submitting || cartCount === 0} className="w-full" variant="destructive">
              <ShoppingCart size={16} className="mr-2" />
              {submitting ? "Wird aufgegeben…" : "Jetzt zahlungspflichtig bestellen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vorschau</DialogTitle></DialogHeader>
          {previewUrl && (
            isImage(previewUrl) ? (
              <img src={previewUrl} alt="Vorschau" className="w-full rounded-lg" />
            ) : isPdf(previewUrl) ? (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-border" title="PDF Vorschau" />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Vorschau nicht verfügbar. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Datei öffnen</a></p>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

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
