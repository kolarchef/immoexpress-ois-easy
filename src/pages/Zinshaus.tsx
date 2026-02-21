import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, TrendingUp, Trash2 } from "lucide-react";

interface Zinshaus {
  id: string;
  adresse: string;
  bezirk: string | null;
  m2_preis: number | null;
  rendite_prozent: number | null;
  kaufpreis: number | null;
  baujahr: number | null;
  notiz: string | null;
}

export default function Zinshaus() {
  const { user } = useAuth();
  const [items, setItems] = useState<Zinshaus[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ adresse: "", bezirk: "", m2_preis: "", rendite_prozent: "", kaufpreis: "", baujahr: "", notiz: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("zinshaeuser").select("*").order("created_at", { ascending: false });
    if (data) setItems(data as Zinshaus[]);
  };

  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !form.adresse.trim()) { toast.error("Adresse ist Pflicht"); return; }
    const { error } = await supabase.from("zinshaeuser").insert({
      user_id: user.id,
      adresse: form.adresse,
      bezirk: form.bezirk || null,
      m2_preis: form.m2_preis ? Number(form.m2_preis) : null,
      rendite_prozent: form.rendite_prozent ? Number(form.rendite_prozent) : null,
      kaufpreis: form.kaufpreis ? Number(form.kaufpreis) : null,
      baujahr: form.baujahr ? Number(form.baujahr) : null,
      notiz: form.notiz || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Zinshaus gespeichert");
    setForm({ adresse: "", bezirk: "", m2_preis: "", rendite_prozent: "", kaufpreis: "", baujahr: "", notiz: "" });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("zinshaeuser").delete().eq("id", id);
    toast.success("Gelöscht");
    load();
  };

  const fmt = (n: number | null) => n != null ? n.toLocaleString("de-AT") : "–";

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in" style={{ paddingBottom: 200 }}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp size={22} className="text-primary" /> Zinshaus-Tracker
        </h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-1" /> Neu
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Adresse *</Label><Input value={form.adresse} onChange={e => setForm(p => ({...p, adresse: e.target.value}))} placeholder="Gumpendorfer Str. 12" /></div>
            <div><Label>Bezirk</Label><Input value={form.bezirk} onChange={e => setForm(p => ({...p, bezirk: e.target.value}))} placeholder="1060" /></div>
            <div><Label>Kaufpreis (€)</Label><Input type="number" value={form.kaufpreis} onChange={e => setForm(p => ({...p, kaufpreis: e.target.value}))} /></div>
            <div><Label>m²-Preis (€)</Label><Input type="number" value={form.m2_preis} onChange={e => setForm(p => ({...p, m2_preis: e.target.value}))} /></div>
            <div><Label>Rendite (%)</Label><Input type="number" step="0.1" value={form.rendite_prozent} onChange={e => setForm(p => ({...p, rendite_prozent: e.target.value}))} /></div>
            <div><Label>Baujahr</Label><Input type="number" value={form.baujahr} onChange={e => setForm(p => ({...p, baujahr: e.target.value}))} /></div>
          </div>
          <div><Label>Notiz</Label><Textarea value={form.notiz} onChange={e => setForm(p => ({...p, notiz: e.target.value}))} /></div>
          <div className="flex gap-2">
            <Button onClick={save}>Speichern</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border">
          <TrendingUp size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Noch keine Zinshäuser erfasst</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(z => (
            <div key={z.id} className="bg-card rounded-2xl p-4 shadow-card border border-border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-foreground">{z.adresse}</h3>
                  {z.bezirk && <span className="text-xs text-muted-foreground">Bezirk {z.bezirk}</span>}
                </div>
                <button onClick={() => remove(z.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <div><span className="text-muted-foreground text-xs block">Kaufpreis</span><span className="font-semibold">{fmt(z.kaufpreis)} €</span></div>
                <div><span className="text-muted-foreground text-xs block">m²-Preis</span><span className="font-semibold">{fmt(z.m2_preis)} €</span></div>
                <div><span className="text-muted-foreground text-xs block">Rendite</span><span className="font-semibold text-primary">{z.rendite_prozent != null ? `${z.rendite_prozent}%` : "–"}</span></div>
              </div>
              {z.notiz && <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{z.notiz}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
