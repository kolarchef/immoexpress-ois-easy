import { useState } from "react";
import { X, RefreshCw, Plus, Upload, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const objektarten = ["Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Doppelhaushälfte", "Reihenhaus", "Grundstück", "Büro/Gewerbefläche", "Zinshaus", "Dachgeschosswohnung", "Penthouse"];

const KURZINFO_LIMIT = 200;

interface ObjektModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ObjektModal({ open, onClose, onSaved }: ObjektModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [describingImages, setDescribingImages] = useState(false);
  const [form, setForm] = useState({
    objektnummer: "", objektart: "", verkaufsart: "Kauf",
    plz: "", ort: "", strasse: "", hnr: "", top: "", stock: "",
    kurzinfo: "", flaeche: "", zimmer: "", kaufpreis: "",
    kaeufer_provision: "", verkaeufer_provision: "",
    interne_notizen: "", beschreibung: "",
  });

  if (!open) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 20 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (files.length > remaining) {
      toast({ title: `Max. 20 Bilder`, variant: "destructive" });
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDescribeImages = async () => {
    if (previews.length === 0) return;
    setDescribingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "describe-images", imageDataUrls: previews.slice(0, 10) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data.result || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{ label: string; description: string }>;
        const descText = parsed.map(d => `${d.label}: ${d.description}`).join(". ");
        // Set kurzinfo with limit
        const truncated = descText.slice(0, KURZINFO_LIMIT);
        setForm(prev => ({ ...prev, kurzinfo: prev.kurzinfo || truncated }));
        // Append full descriptions to beschreibung
        const fullText = parsed.map(d => `• ${d.label}: ${d.description}`).join("\n");
        setForm(prev => ({ ...prev, beschreibung: prev.beschreibung ? `${prev.beschreibung}\n\n${fullText}` : fullText }));
        toast({ title: `✓ ${parsed.length} Bilder analysiert` });
      }
    } catch (err: unknown) {
      toast({ title: "Bilderkennung fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setDescribingImages(false);
    }
  };

  const handleSave = async () => {
    if (!user || !form.objektart) {
      toast({ title: "Objektart ist Pflicht", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: obj, error } = await supabase.from("objekte").insert({
        user_id: user.id,
        objektnummer: form.objektnummer || `OBJ-${Date.now().toString().slice(-6)}`,
        objektart: form.objektart,
        verkaufsart: form.verkaufsart,
        plz: form.plz || null,
        ort: form.ort || null,
        strasse: form.strasse || null,
        hnr: form.hnr || null,
        top: form.top || null,
        stock: form.stock || null,
        kurzinfo: form.kurzinfo || null,
        flaeche_m2: form.flaeche ? parseFloat(form.flaeche) : null,
        zimmer: form.zimmer ? parseFloat(form.zimmer) : null,
        kaufpreis: form.kaufpreis ? parseFloat(form.kaufpreis) : null,
        kaeufer_provision: form.kaeufer_provision ? parseFloat(form.kaeufer_provision) : null,
        verkaeufer_provision: form.verkaeufer_provision ? parseFloat(form.verkaeufer_provision) : null,
        interne_notizen: form.interne_notizen || null,
        beschreibung: form.beschreibung || null,
        status: "aktiv",
      }).select().single();
      if (error) throw error;

      if (photos.length > 0 && obj) {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          const ext = file.name.split(".").pop();
          const path = `${obj.id}/${i}_${Date.now()}.${ext}`;
          await supabase.storage.from("objekt-fotos").upload(path, file);
        }
      }

      toast({ title: "✓ Objekt angelegt & synchronisiert" });
      setForm({ objektnummer: "", objektart: "", verkaufsart: "Kauf", plz: "", ort: "", strasse: "", hnr: "", top: "", stock: "", kurzinfo: "", flaeche: "", zimmer: "", kaufpreis: "", kaeufer_provision: "", verkaeufer_provision: "", interne_notizen: "", beschreibung: "" });
      setPhotos([]); setPreviews([]);
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
      <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Plus size={18} className="text-primary" /> Neues Objekt</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Objektnummer & Art */}
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

          {/* Kurzinfo with limit */}
          <div>
            <label className={labelCls}>Kurzinfo <span className="text-muted-foreground font-normal">({form.kurzinfo.length}/{KURZINFO_LIMIT})</span></label>
            <input className={inputCls} placeholder="z.B. Traumwohnung mit Balkon" maxLength={KURZINFO_LIMIT} value={form.kurzinfo} onChange={e => setForm({ ...form, kurzinfo: e.target.value })} />
          </div>

          {/* Vermarktung */}
          <div>
            <label className={labelCls}>Vermarktung</label>
            <select className={inputCls} value={form.verkaufsart} onChange={e => setForm({ ...form, verkaufsart: e.target.value })}>
              <option>Kauf</option><option>Miete</option>
            </select>
          </div>

          {/* Adresse */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className={labelCls}>PLZ</label>
              <input className={inputCls} placeholder="1070" value={form.plz} onChange={e => setForm({ ...form, plz: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Ort</label>
              <input className={inputCls} placeholder="Wien" value={form.ort} onChange={e => setForm({ ...form, ort: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Straße</label>
              <input className={inputCls} placeholder="Neubaugasse" value={form.strasse} onChange={e => setForm({ ...form, strasse: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>HNR</label>
              <input className={inputCls} placeholder="7" value={form.hnr} onChange={e => setForm({ ...form, hnr: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Top</label>
              <input className={inputCls} placeholder="z.B. Top 3" value={form.top} onChange={e => setForm({ ...form, top: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Stock</label>
              <input className={inputCls} placeholder="z.B. 2. OG" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>

          {/* Kennzahlen */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Nutzfläche m²</label>
              <input type="number" className={inputCls} placeholder="85" value={form.flaeche} onChange={e => setForm({ ...form, flaeche: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Zimmer</label>
              <input type="number" className={inputCls} placeholder="3" value={form.zimmer} onChange={e => setForm({ ...form, zimmer: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Kaufpreis €</label>
              <input type="number" className={inputCls} placeholder="350000" value={form.kaufpreis} onChange={e => setForm({ ...form, kaufpreis: e.target.value })} />
            </div>
          </div>

          {/* Provisionen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Käufer-Provision (%)</label>
              <input type="number" step="0.1" className={inputCls} placeholder="3.0" value={form.kaeufer_provision} onChange={e => setForm({ ...form, kaeufer_provision: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Verkäufer-Provision (%)</label>
              <input type="number" step="0.1" className={inputCls} placeholder="3.0" value={form.verkaeufer_provision} onChange={e => setForm({ ...form, verkaeufer_provision: e.target.value })} />
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className={labelCls}>Beschreibung</label>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Besonderheiten…" value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} />
          </div>

          {/* Interne Notizen */}
          <div>
            <label className={labelCls}>🔒 Interne Notizen (nur für Makler)</label>
            <textarea className={`${inputCls} resize-none bg-amber-50/50 dark:bg-amber-900/10`} rows={2} placeholder="Interne Anmerkungen…" value={form.interne_notizen} onChange={e => setForm({ ...form, interne_notizen: e.target.value })} />
          </div>

          {/* Foto-Upload */}
          <div>
            <label className={labelCls}>Fotos ({previews.length}/20)</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-contain" />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-foreground/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {previews.length < 20 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                  <Upload size={18} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Hochladen</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>

            {/* KI-Bilderkennung Button */}
            {previews.length > 0 && (
              <button onClick={handleDescribeImages} disabled={describingImages}
                className="w-full mt-3 bg-accent text-foreground border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-secondary transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {describingImages ? (
                  <><RefreshCw size={14} className="animate-spin" /> KI analysiert…</>
                ) : (
                  <><Sparkles size={14} className="text-primary" /> KI-Bilderkennung ({Math.min(previews.length, 10)} Fotos)</>
                )}
              </button>
            )}
          </div>

          <button onClick={handleSave} disabled={saving || !form.objektart} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><RefreshCw size={16} className="animate-spin" /> Speichert…</> : <><Plus size={16} /> Objekt anlegen & synchronisieren</>}
          </button>
        </div>
      </div>
    </div>
  );
}
