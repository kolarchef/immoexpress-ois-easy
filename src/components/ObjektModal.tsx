import { useState } from "react";
import { X, RefreshCw, Plus, Upload, Trash2, Sparkles, Save, Copy, FileText } from "lucide-react";
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
  const [titleIndex, setTitleIndex] = useState(0);
  const [describingImages, setDescribingImages] = useState(false);
  const [analyzingPlan, setAnalyzingPlan] = useState(false);
  const [planPreviews, setPlanPreviews] = useState<string[]>([]);
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
    if (titleIndex >= previews.length - 1) setTitleIndex(0);
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
        const truncated = descText.slice(0, KURZINFO_LIMIT);
        setForm(prev => ({ ...prev, kurzinfo: prev.kurzinfo || truncated }));
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

  const handlePlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.slice(0, 3).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPlanPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyzePlan = async () => {
    if (planPreviews.length === 0) return;
    setAnalyzingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "analyze-floorplan", imageDataUrls: planPreviews },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data.result || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Fill in recognized data
        if (parsed.gesamtflaeche_ca && !form.flaeche) {
          setForm(prev => ({ ...prev, flaeche: String(parsed.gesamtflaeche_ca) }));
        }
        if (parsed.zimmeranzahl && !form.zimmer) {
          setForm(prev => ({ ...prev, zimmer: String(parsed.zimmeranzahl) }));
        }
        if (parsed.zusammenfassung) {
          const summary = parsed.zusammenfassung.slice(0, KURZINFO_LIMIT);
          setForm(prev => ({ ...prev, kurzinfo: prev.kurzinfo || summary }));
        }
        // Build room description
        const roomLines = (parsed.raeume || []).map((r: { name: string; flaeche_ca?: number; merkmale?: string }) =>
          `• ${r.name}${r.flaeche_ca ? ` (~${r.flaeche_ca} m²)` : ""}${r.merkmale ? ` – ${r.merkmale}` : ""}`
        ).join("\n");
        const planDesc = `Raumaufteilung:\n${roomLines}${parsed.raumtrennung_text ? `\n\nGrundriss: ${parsed.raumtrennung_text}` : ""}`;
        setForm(prev => ({ ...prev, beschreibung: prev.beschreibung ? `${prev.beschreibung}\n\n${planDesc}` : planDesc }));
        toast({ title: `✓ Plan analysiert: ${parsed.raeume?.length || 0} Räume erkannt` });
      }
    } catch (err: unknown) {
      toast({ title: "Plan-Analyse fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setAnalyzingPlan(false);
    }
  };

  const handleSave = async (exportToImmoZ: boolean) => {
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
        status: exportToImmoZ ? "aktiv" : "entwurf",
        immoz_exportiert: exportToImmoZ,
        immoz_export_datum: exportToImmoZ ? new Date().toISOString() : null,
      }).select().single();
      if (error) throw error;

      if (photos.length > 0 && obj) {
        const orderedPhotos = [...photos];
        if (titleIndex > 0) {
          const [title] = orderedPhotos.splice(titleIndex, 1);
          orderedPhotos.unshift(title);
        }
        for (let i = 0; i < orderedPhotos.length; i++) {
          const file = orderedPhotos[i];
          const ext = file.name.split(".").pop();
          const path = `${obj.id}/${String(i).padStart(3, "0")}_${Date.now()}.${ext}`;
          await supabase.storage.from("objekt-fotos").upload(path, file);
        }
      }

      if (exportToImmoZ && obj) {
        await supabase.from("immoz_exporte").insert({
          objekte_ids: [obj.id], anzahl: 1, status: "Erfolgreich",
          dateiname: `immoZ_export_${new Date().toLocaleDateString("de-AT").replace(/\./g, "")}.xml`,
        });
        toast({ title: "✅ Erfolgreich gespeichert & an ImmoZ übertragen", description: "Das Objekt ist jetzt online und in der Verwaltung sichtbar." });
      } else {
        toast({ title: "✅ Erfolgreich als Entwurf gespeichert", description: "Nur intern sichtbar – kann jederzeit veröffentlicht werden." });
      }

      setForm({ objektnummer: "", objektart: "", verkaufsart: "Kauf", plz: "", ort: "", strasse: "", hnr: "", top: "", stock: "", kurzinfo: "", flaeche: "", zimmer: "", kaufpreis: "", kaeufer_provision: "", verkaeufer_provision: "", interne_notizen: "", beschreibung: "" });
      setPhotos([]); setPreviews([]); setTitleIndex(0); setPlanPreviews([]);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      toast({ title: "❌ Fehler beim Speichern", description: err instanceof Error ? err.message : "Unbekannter Fehler", variant: "destructive" });
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

          {/* Foto-Upload */}
          <div>
            <label className={labelCls}>Fotos ({previews.length}/20)</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border cursor-pointer"
                  onClick={() => setTitleIndex(i)}>
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  {i === titleIndex && <span className="absolute bottom-1 left-1 text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full font-semibold">Titelbild</span>}
                  <button onClick={(e) => { e.stopPropagation(); removePhoto(i); }} className="absolute top-1 right-1 bg-foreground/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {/* KI-Bilderkennung */}
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

          {/* Plan-Analyse */}
          <div className="border border-dashed border-primary/30 rounded-xl p-4 bg-primary/5">
            <label className={`${labelCls} flex items-center gap-2 mb-2`}>
              <FileText size={14} className="text-primary" /> Grundriss / Bauplan analysieren
            </label>
            <div className="flex gap-2 items-center">
              <label className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-pointer hover:bg-accent transition-colors text-center">
                {planPreviews.length > 0 ? `${planPreviews.length} Plan(e) geladen` : "Plan hochladen…"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePlanUpload} />
              </label>
              <button onClick={handleAnalyzePlan} disabled={analyzingPlan || planPreviews.length === 0}
                className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                {analyzingPlan ? <><RefreshCw size={14} className="animate-spin" /> Analysiert…</> : <><Sparkles size={14} /> Plan lesen</>}
              </button>
            </div>
            {planPreviews.length > 0 && (
              <div className="flex gap-2 mt-2">
                {planPreviews.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt={`Plan ${i+1}`} className="w-full h-full object-cover" />
                    <button onClick={() => setPlanPreviews(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 bg-foreground/60 text-white rounded-full p-0.5">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Beschreibung – groß */}
          <div>
            <label className={labelCls}>Beschreibung</label>
            <textarea className={`${inputCls} resize-none`} rows={6} placeholder="Besonderheiten…" value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} />
          </div>

          {/* Interne Notizen */}
          <div>
            <label className={labelCls}>🔒 Interne Notizen (nur für Makler)</label>
            <textarea className={`${inputCls} resize-none bg-amber-50/50 dark:bg-amber-900/10`} rows={2} placeholder="Interne Anmerkungen…" value={form.interne_notizen} onChange={e => setForm({ ...form, interne_notizen: e.target.value })} />
          </div>

          {/* Speicher-Buttons */}
          <button onClick={() => handleSave(true)} disabled={saving || !form.objektart} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><RefreshCw size={16} className="animate-spin" /> Speichert…</> : <><Copy size={16} /> Anlegen & an ImmoZ übertragen</>}
          </button>

          <button onClick={() => handleSave(false)} disabled={saving || !form.objektart} className="w-full border-2 border-dashed border-border bg-card text-foreground rounded-xl py-2.5 font-semibold text-sm hover:bg-accent transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={14} className="text-muted-foreground" /> Nur intern speichern (Entwurf)
          </button>
        </div>
      </div>
    </div>
  );
}
