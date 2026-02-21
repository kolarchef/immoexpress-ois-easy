import { useState } from "react";
import { X, RefreshCw, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const objektarten = ["Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Doppelhaushälfte", "Reihenhaus", "Grundstück", "Büro/Gewerbefläche", "Zinshaus", "Dachgeschosswohnung", "Penthouse"];
const provisionOptionen = ["Käufer", "Verkäufer", "Geteilt (50/50)", "Provisionsfrei"];

interface ObjektModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ObjektModal({ open, onClose, onSaved }: ObjektModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    objektnummer: "", objektart: "", verkaufsart: "Kauf",
    plz: "", ort: "", strasse: "", hnr: "",
    flaeche: "", zimmer: "", kaufpreis: "", miete: "",
    provisionsstellung: "Käufer", beschreibung: "",
  });

  if (!open) return null;

  const handleSave = async () => {
    if (!user || !form.objektart) {
      toast({ title: "Objektart ist Pflicht", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("objekte").insert({
        user_id: user.id,
        objektnummer: form.objektnummer || `OBJ-${Date.now().toString().slice(-6)}`,
        objektart: form.objektart,
        verkaufsart: form.verkaufsart,
        plz: form.plz || null,
        ort: form.ort || null,
        strasse: form.strasse || null,
        hnr: form.hnr || null,
        flaeche_m2: form.flaeche ? parseFloat(form.flaeche) : null,
        zimmer: form.zimmer ? parseFloat(form.zimmer) : null,
        kaufpreis: form.verkaufsart === "Kauf" && form.kaufpreis ? parseFloat(form.kaufpreis) : null,
        provisionsstellung: form.provisionsstellung,
        beschreibung: form.beschreibung || null,
        status: "aktiv",
      });
      if (error) throw error;
      toast({ title: "✓ Objekt angelegt" });
      setForm({ objektnummer: "", objektart: "", verkaufsart: "Kauf", plz: "", ort: "", strasse: "", hnr: "", flaeche: "", zimmer: "", kaufpreis: "", miete: "", provisionsstellung: "Käufer", beschreibung: "" });
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Unbekannt", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Plus size={18} className="text-primary" /> Neues Objekt</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Objektnummer</label>
              <input className={inputCls} placeholder="AT-2026-001" value={form.objektnummer} onChange={e => setForm({ ...form, objektnummer: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Objektart *</label>
              <select className={inputCls} value={form.objektart} onChange={e => setForm({ ...form, objektart: e.target.value })}>
                <option value="">Auswählen…</option>
                {objektarten.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Vermarktung</label>
              <select className={inputCls} value={form.verkaufsart} onChange={e => setForm({ ...form, verkaufsart: e.target.value })}>
                <option>Kauf</option><option>Miete</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Provision</label>
              <select className={inputCls} value={form.provisionsstellung} onChange={e => setForm({ ...form, provisionsstellung: e.target.value })}>
                {provisionOptionen.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>PLZ</label>
              <input className={inputCls} placeholder="1070" value={form.plz} onChange={e => setForm({ ...form, plz: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ort</label>
              <input className={inputCls} placeholder="Wien" value={form.ort} onChange={e => setForm({ ...form, ort: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Straße + Nr</label>
              <div className="flex gap-1 mt-1">
                <input className="flex-1 bg-surface border border-border rounded-xl px-2 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Str." value={form.strasse} onChange={e => setForm({ ...form, strasse: e.target.value })} />
                <input className="w-12 bg-surface border border-border rounded-xl px-2 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nr" value={form.hnr} onChange={e => setForm({ ...form, hnr: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>m²</label>
              <input type="number" className={inputCls} placeholder="85" value={form.flaeche} onChange={e => setForm({ ...form, flaeche: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Zimmer</label>
              <input type="number" className={inputCls} placeholder="3" value={form.zimmer} onChange={e => setForm({ ...form, zimmer: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{form.verkaufsart === "Kauf" ? "Kaufpreis €" : "Miete €/Mo"}</label>
              <input type="number" className={inputCls} placeholder={form.verkaufsart === "Kauf" ? "350000" : "1200"} value={form.verkaufsart === "Kauf" ? form.kaufpreis : form.miete} onChange={e => setForm(form.verkaufsart === "Kauf" ? { ...form, kaufpreis: e.target.value } : { ...form, miete: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Beschreibung</label>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Besonderheiten…" value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} />
          </div>

          <button onClick={handleSave} disabled={saving || !form.objektart} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><RefreshCw size={16} className="animate-spin" /> Speichert…</> : <><Plus size={16} /> Objekt anlegen</>}
          </button>
        </div>
      </div>
    </div>
  );
}
