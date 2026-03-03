import { useState } from "react";
import { FileText, Upload, Wand2, X, Image, Download, RefreshCw, CheckCircle, AlertCircle, Copy, ArrowRight, Plus, Eye, Sparkles, Save, Mic, BookOpen, LayoutTemplate, Send } from "lucide-react";
import MagicToolOverlay from "@/components/MagicToolOverlay";
import ObjektModal from "@/components/ObjektModal";
import ExposePreviewModal from "@/components/ExposePreviewModal";
import AudioRecorder from "@/components/AudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sendPdfQuick, sendPdfClassic, sendPdfInvestment, sendVideoKi, sendNotizSpeichern, ACTION_IDS, type PdfWebhookParams } from "@/lib/webhookService";

const bundeslaender = [
  "Wien – 1. Bezirk (Innere Stadt)", "Wien – 2. Bezirk (Leopoldstadt)", "Wien – 3. Bezirk (Landstraße)",
  "Wien – 4. Bezirk (Wieden)", "Wien – 5. Bezirk (Margareten)", "Wien – 6. Bezirk (Mariahilf)",
  "Wien – 7. Bezirk (Neubau)", "Wien – 8. Bezirk (Josefstadt)", "Wien – 9. Bezirk (Alsergrund)",
  "Wien – 10. Bezirk (Favoriten)", "Wien – 11. Bezirk (Simmering)", "Wien – 12. Bezirk (Meidling)",
  "Wien – 13. Bezirk (Hietzing)", "Wien – 14. Bezirk (Penzing)", "Wien – 15. Bezirk (Rudolfsheim)",
  "Wien – 16. Bezirk (Ottakring)", "Wien – 17. Bezirk (Hernals)", "Wien – 18. Bezirk (Währing)",
  "Wien – 19. Bezirk (Döbling)", "Wien – 20. Bezirk (Brigittenau)", "Wien – 21. Bezirk (Floridsdorf)",
  "Wien – 22. Bezirk (Donaustadt)", "Wien – 23. Bezirk (Liesing)",
  "Niederösterreich – Baden", "Niederösterreich – Mödling", "Niederösterreich – St. Pölten", "Niederösterreich – Klosterneuburg",
  "Oberösterreich – Linz", "Oberösterreich – Wels", "Steiermark – Graz", "Tirol – Innsbruck",
  "Vorarlberg – Bregenz", "Salzburg – Stadt", "Kärnten – Klagenfurt", "Burgenland – Eisenstadt",
];

const objektarten = ["Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Doppelhaushälfte", "Reihenhaus", "Grundstück", "Büro/Gewerbefläche", "Zinshaus", "Dachgeschosswohnung", "Penthouse"];

const KURZBESCHREIBUNG_LIMIT = 2000;

export type PdfTemplate = "quick-check" | "expose-style" | "investment";

const pdfTemplates: { id: PdfTemplate; label: string; icon: string; desc: string }[] = [
  { id: "quick-check", label: "Quick-Check", icon: "⚡", desc: "Kompakt · Infografiken · Harte Fakten" },
  { id: "expose-style", label: "Exposé-Style", icon: "🏠", desc: "Emotional · Große Bilder · Sprachnotizen" },
  { id: "investment", label: "Investment-Analyse", icon: "📊", desc: "Seriös · Tabellen · Marktdaten" },
];

interface ImageDesc {
  index: number;
  label: string;
  description: string;
}

export default function Expose() {
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [titleImageIndex, setTitleImageIndex] = useState(0);
  const [aiText, setAiText] = useState("");
  const [kurzbeschreibung, setKurzbeschreibung] = useState("");
  const [korrekturText, setKorrekturText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageAnalyzed, setImageAnalyzed] = useState(false);
  const [aiModel, setAiModel] = useState("");
  const [exposeLaenge, setExposeLaenge] = useState<"kurz" | "lang">("lang");
  const [imageDescriptions, setImageDescriptions] = useState<ImageDesc[]>([]);
  const [describingImages, setDescribingImages] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PdfTemplate>("expose-style");
  const [notebookLmText, setNotebookLmText] = useState("");
  const [sprachnotizen, setSprachnotizen] = useState("");
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [magicEditOpen, setMagicEditOpen] = useState(false);
  const [magicEditPhoto, setMagicEditPhoto] = useState<string | null>(null);
  const [videoFormat, setVideoFormat] = useState<"16:9" | "9:16">("16:9");
  const [videoStyle, setVideoStyle] = useState<"factual" | "dynamic">("factual");
  const [form, setForm] = useState({
    titel: "", objektnummer: "", bezirk: "", plz: "", ort: "", strasse: "", hnr: "",
    objektart: "", kaufpreis: "", miete: "",
    flaeche: "", zimmer: "", beschreibung: "", verkaufsart: "Kauf",
    provisionsstellung: "Käufer",
    kaeufer_provision: "", verkaeufer_provision: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 20 - images.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImages((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (files.length > remaining) {
      toast({ title: `Max. 20 Bilder`, variant: "destructive" });
    }
    setImageAnalyzed(false);
    setImageDescriptions([]);
  };

  const handleDescribeImages = async () => {
    if (images.length === 0) return;
    setDescribingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "describe-images", imageDataUrls: images.slice(0, 10) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data.result || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ImageDesc[];
        setImageDescriptions(parsed);
        const descText = parsed.map(d => `• ${d.label}: ${d.description}`).join("\n");
        setForm(prev => ({ ...prev, beschreibung: prev.beschreibung ? `${prev.beschreibung}\n\nKI-Bilderkennung:\n${descText}` : `KI-Bilderkennung:\n${descText}` }));
        setImageAnalyzed(true);
        toast({ title: `✓ ${parsed.length} Bilder analysiert` });
      }
    } catch (err: unknown) {
      toast({ title: "Bilderkennung fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setDescribingImages(false);
    }
  };

  const handleGenerate = async (withKorrektur = false) => {
    setGenerating(true);
    try {
      const formData = {
        ...form,
        beschreibung: [
          form.beschreibung,
          sprachnotizen ? `\n\nSprachnotizen vom Objekt:\n${sprachnotizen}` : "",
          notebookLmText ? `\n\nNotebookLM-Analyse:\n${notebookLmText}` : "",
          withKorrektur && korrekturText ? `\n\nKorrektur-Hinweis: ${korrekturText}` : "",
        ].filter(Boolean).join(""),
      };
      const { data, error } = await supabase.functions.invoke("expose-ki", {
        body: { form: formData, imageDataUrls: images.slice(0, 5), laenge: exposeLaenge },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiText(data.text || "");
      setAiModel(data.model || "");
      if (images.length > 0) setImageAnalyzed(true);
      setKorrekturText("");
    } catch (err: unknown) {
      toast({ title: "KI-Fehler", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleKurzbeschreibungUebernehmen = () => {
    const truncated = aiText.slice(0, KURZBESCHREIBUNG_LIMIT);
    setKurzbeschreibung(truncated);
    toast({ title: "✓ Übernommen", description: `Kurzbeschreibung mit ${truncated.length} Zeichen gesetzt.` });
  };

  const handleSave = async (exportToImmoZ: boolean) => {
    if (!form.titel || !form.objektart) {
      toast({ title: "Fehlende Pflichtfelder", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Nicht eingeloggt");

      const objektData = {
        user_id: currentUser.id,
        objektnummer: form.objektnummer || `EXP-${Date.now().toString().slice(-6)}`,
        kurzinfo: kurzbeschreibung || form.beschreibung,
        objektart: form.objektart,
        flaeche_m2: form.flaeche ? parseFloat(form.flaeche) : null,
        kaufpreis: form.verkaufsart === "Kauf" && form.kaufpreis ? parseFloat(form.kaufpreis) : null,
        zimmer: form.zimmer ? parseFloat(form.zimmer) : null,
        plz: form.plz,
        ort: form.ort || form.bezirk,
        strasse: form.strasse,
        hnr: form.hnr,
        provisionsstellung: form.provisionsstellung,
        kaeufer_provision: form.kaeufer_provision ? parseFloat(form.kaeufer_provision) : null,
        verkaeufer_provision: form.verkaeufer_provision ? parseFloat(form.verkaeufer_provision) : null,
        beschreibung: aiText || form.beschreibung,
        ki_text: aiText,
        verkaufsart: form.verkaufsart,
        status: exportToImmoZ ? "aktiv" : "entwurf",
        immoz_exportiert: exportToImmoZ,
        immoz_export_datum: exportToImmoZ ? new Date().toISOString() : null,
      };
      const { data: obj, error: objErr } = await supabase.from("objekte").insert(objektData).select().single();
      if (objErr) throw objErr;

      if (exportToImmoZ) {
        await supabase.from("immoz_exporte").insert({
          objekte_ids: [obj.id], anzahl: 1, status: "Erfolgreich",
          dateiname: `immoZ_export_${new Date().toLocaleDateString("de-AT").replace(/\./g, "")}.xml`,
        });
        toast({ title: "✓ Gespeichert & an ImmoZ übertragen!" });
      } else {
        toast({ title: "✓ Als Entwurf gespeichert", description: "Objekt ist nur intern sichtbar." });
      }
    } catch (err: unknown) {
      toast({ title: "Fehler", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePdfExport = () => {
    setShowPreview(true);
  };

  const handleVideoWebhook = async () => {
    if (!user) { toast({ title: "Bitte einloggen", variant: "destructive" }); return; }
    setSendingWebhook(true);
    try {
      const { ok, status } = await sendVideoKi({
        template: selectedTemplate,
        video_format: videoFormat,
        video_style: videoStyle,
        objekt: {
          titel: form.titel, objektnummer: form.objektnummer, bezirk: form.bezirk,
          plz: form.plz, ort: form.ort, strasse: form.strasse, hnr: form.hnr,
          objektart: form.objektart, verkaufsart: form.verkaufsart, kaufpreis: form.kaufpreis,
          miete: form.miete, flaeche: form.flaeche, zimmer: form.zimmer,
          provisionsstellung: form.provisionsstellung,
        },
        texte: {
          ki_expose: aiText, kurzbeschreibung, beschreibung: form.beschreibung,
          sprachnotizen, notebook_lm: notebookLmText,
        },
        image_urls: images.filter(Boolean),
        bilder_anzahl: images.length,
      });
      if (ok) {
        toast({ title: "✅ An Make.com gesendet", description: `Template: ${pdfTemplates.find(t => t.id === selectedTemplate)?.label}` });
      } else {
        throw new Error(`Webhook Fehler: ${status}`);
      }
    } catch (err: unknown) {
      toast({ title: "Webhook-Fehler", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setSendingWebhook(false);
    }
  };

  const handleSprachnotiz = (text: string) => {
    setSprachnotizen(prev => prev ? `${prev} ${text}` : text);
    toast({ title: "🎙️ Notiz hinzugefügt" });
  };

  const formValid = form.titel && form.objektart;
  const kurzbeschreibungLen = kurzbeschreibung.length;

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exposé-Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">KI-gestützt · Wiener Makler-Stil · 3 PDF-Vorlagen</p>
      </div>

      {/* Objektdaten */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Objektdaten</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objekttitel *</label>
            <input className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="z.B. Traumwohnung im 7. Bezirk" value={form.titel}
              onChange={(e) => setForm({ ...form, titel: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objektnummer</label>
            <input className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="z.B. AT-2026-001" value={form.objektnummer}
              onChange={(e) => setForm({ ...form, objektnummer: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objektart *</label>
            <select className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.objektart} onChange={(e) => setForm({ ...form, objektart: e.target.value })}>
              <option value="">Auswählen…</option>
              {objektarten.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vermarktung</label>
            <select className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.verkaufsart} onChange={(e) => setForm({ ...form, verkaufsart: e.target.value })}>
              <option>Kauf</option><option>Miete</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bezirk / Bundesland *</label>
          <select className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.bezirk} onChange={(e) => setForm({ ...form, bezirk: e.target.value })}>
            <option value="">Bitte auswählen…</option>
            {bundeslaender.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PLZ</label>
            <input className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="1070" value={form.plz} onChange={(e) => setForm({ ...form, plz: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Straße + HNr</label>
            <div className="flex gap-2 mt-1">
              <input className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Neubaugasse" value={form.strasse} onChange={(e) => setForm({ ...form, strasse: e.target.value })} />
              <input className="w-16 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="7" value={form.hnr} onChange={(e) => setForm({ ...form, hnr: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">m²</label>
            <input type="number" className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="85" value={form.flaeche} onChange={(e) => setForm({ ...form, flaeche: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zimmer</label>
            <input type="number" className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="3" value={form.zimmer} onChange={(e) => setForm({ ...form, zimmer: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {form.verkaufsart === "Kauf" ? "Kaufpreis (€)" : "Miete (€/Mo)"}
            </label>
            <input type="number" className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={form.verkaufsart === "Kauf" ? "350000" : "1200"}
              value={form.verkaufsart === "Kauf" ? form.kaufpreis : form.miete}
              onChange={(e) => setForm(form.verkaufsart === "Kauf" ? { ...form, kaufpreis: e.target.value } : { ...form, miete: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Käufer-Provision (%)</label>
            <input type="number" step="0.1" className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="3.0" value={form.kaeufer_provision} onChange={(e) => setForm({ ...form, kaeufer_provision: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verkäufer-Provision (%)</label>
            <input type="number" step="0.1" className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="3.0" value={form.verkaeufer_provision} onChange={(e) => setForm({ ...form, verkaeufer_provision: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Foto-Upload */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Image size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Fotos</h2>
          <span className="ml-auto text-xs font-semibold text-primary">{images.length}/20</span>
        </div>

        {images.length < 20 && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl py-5 cursor-pointer hover:bg-accent transition-all bg-surface mb-3">
            <Upload size={20} className="text-primary mb-1" />
            <span className="text-sm font-semibold text-foreground">Fotos auswählen</span>
            <span className="text-xs text-muted-foreground">JPG, PNG – Max. 20</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        )}

        {images.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square group cursor-pointer"
                  onClick={() => setTitleImageIndex(i)}>
                  <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)); setImageAnalyzed(false); setImageDescriptions([]); if (titleImageIndex >= images.length - 1) setTitleImageIndex(0); }}
                    className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMagicEditPhoto(img); setMagicEditOpen(true); }}
                    className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Wand2 size={10} />
                  </button>
                  {i === titleImageIndex && <span className="absolute bottom-1 left-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">Titelbild</span>}
                  {imageDescriptions[i] && (
                    <div className="absolute bottom-0 left-0 right-0 bg-foreground/70 text-background text-[9px] px-1.5 py-1 leading-tight">
                      {imageDescriptions[i].label}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDescribeImages}
                disabled={describingImages}
                className="flex-1 bg-accent text-foreground border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-secondary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {describingImages ? (
                  <><RefreshCw size={14} className="animate-spin" /> Analysiert…</>
                ) : (
                  <><Sparkles size={14} className="text-primary" /> KI-Bilderkennung ({Math.min(images.length, 10)})</>
                )}
              </button>
              {imageAnalyzed && (
                <button onClick={handleDescribeImages} disabled={describingImages}
                  className="bg-accent text-foreground border border-border rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-all disabled:opacity-50 flex items-center gap-1.5">
                  <RefreshCw size={14} /> Neu
                </button>
              )}
            </div>

            {imageDescriptions.length > 0 && (
              <div className="mt-3 space-y-1">
                {imageDescriptions.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-accent rounded-lg text-xs">
                    <span className="font-bold text-primary shrink-0">📷 {d.label}</span>
                    <span className="text-muted-foreground">{d.description}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🎙️ Sprachnotizen */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Mic size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Sprachnotizen</h2>
          <AudioRecorder onTranscript={handleSprachnotiz} className="ml-auto" />
        </div>
        <p className="text-xs text-muted-foreground">Sprich vor Ort ins Mikrofon – Text wird automatisch transkribiert und dem Exposé zugeordnet.</p>
        <textarea
          className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={3} placeholder="Diktierte Notizen erscheinen hier…"
          value={sprachnotizen} onChange={(e) => setSprachnotizen(e.target.value)}
        />
        {sprachnotizen && (
          <p className="text-xs text-primary font-semibold">✓ {sprachnotizen.split(" ").length} Wörter · Wird im Exposé-Style PDF verwendet</p>
        )}
      </div>

      {/* 📓 NotebookLM Import */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">NotebookLM-Daten</h2>
        </div>
        <p className="text-xs text-muted-foreground">Füge strukturierte Analyse-Outputs aus NotebookLM ein – für Video-Skripte und detaillierte Berichte.</p>
        <textarea
          className="w-full bg-card border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ minHeight: "300px" }}
          placeholder="NotebookLM-Output hier einfügen (Marktdaten, Infrastruktur-Analyse, Mietpreisentwicklung…)"
          value={notebookLmText} onChange={(e) => setNotebookLmText(e.target.value)}
        />
        {notebookLmText && (
          <p className="text-xs text-primary font-semibold">✓ {notebookLmText.length} Zeichen · Wird in KI-Textgenerierung & Investment-PDF verwendet</p>
        )}
        <button
          onClick={async () => {
            const { ok } = await sendNotizSpeichern(notebookLmText, "notebook_lm");
            if (ok) toast({ title: "✅ Notiz gespeichert" });
            else toast({ title: "Fehler beim Speichern", variant: "destructive" });
          }}
          disabled={!notebookLmText.trim()}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={14} /> Notiz & Analyse speichern
        </button>
      </div>

      {/* Beschreibung */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Beschreibung / Notizen</label>
        <textarea className="mt-2 w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={6} placeholder="Besonderheiten, Dachterrasse, Tiefgaragenplatz…" value={form.beschreibung}
          onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
      </div>

      {/* KI-Textgenerator */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">KI-Exposé-Text</h2>
          {aiModel && <span className="ml-auto text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{aiModel.split("/")[1]}</span>}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setExposeLaenge("kurz")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${exposeLaenge === "kurz" ? "bg-primary text-primary-foreground border-primary shadow-orange" : "bg-accent text-foreground border-border hover:bg-secondary"}`}>
            Kurz
          </button>
          <button onClick={() => setExposeLaenge("lang")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${exposeLaenge === "lang" ? "bg-primary text-primary-foreground border-primary shadow-orange" : "bg-accent text-foreground border-border hover:bg-secondary"}`}>
            Lang
          </button>
        </div>

        <button onClick={() => handleGenerate(false)} disabled={!formValid || generating}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
          {generating ? <><RefreshCw size={16} className="animate-spin" /> KI analysiert…</> : <><Wand2 size={16} /> Exposé-Text generieren{images.length > 0 ? ` (${images.length} Fotos)` : ""}</>}
        </button>

        {aiText && (
          <>
            <div className="bg-accent rounded-xl p-4 border border-border">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">{aiText}</pre>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Korrektur-Hinweis (optional)</label>
              <div className="flex gap-2 mt-1">
                <input className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  placeholder="z.B. Mehr Betonung auf Terrassenblick…" value={korrekturText} onChange={(e) => setKorrekturText(e.target.value)} />
                <button onClick={() => handleGenerate(true)} disabled={generating || !korrekturText.trim()}
                  className="px-4 py-2.5 bg-accent text-foreground border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0">
                  <RefreshCw size={14} /> Neu
                </button>
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kurzbeschreibung</label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${kurzbeschreibungLen > KURZBESCHREIBUNG_LIMIT ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>
                  {kurzbeschreibungLen}/{KURZBESCHREIBUNG_LIMIT}
                </span>
              </div>
              <textarea className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={4} maxLength={KURZBESCHREIBUNG_LIMIT} placeholder="Kurzbeschreibung (max. 2.000 Zeichen)…"
                value={kurzbeschreibung} onChange={(e) => setKurzbeschreibung(e.target.value)} />
              <button onClick={handleKurzbeschreibungUebernehmen}
                className="w-full flex items-center justify-center gap-2 bg-accent text-foreground border border-border rounded-xl py-2 text-sm font-semibold hover:bg-secondary transition-all active:scale-95">
                <ArrowRight size={14} /> In Kurzbeschreibung übernehmen
              </button>
            </div>
          </>
        )}
      </div>

      {/* 📄 PDF-Vorlage wählen – Drei-Säulen-Design */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">PDF-Vorlage wählen</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: "quick-check" as PdfTemplate, actionId: "expose_pdf_quick", icon: "⚡", label: "Quick-Check", sub: "Kompakt", desc: "Infografiken · Sterne-Ratings · Harte Fakten" },
            { id: "expose-style" as PdfTemplate, actionId: "expose_pdf_classic", icon: "🏠", label: "Klassisch", sub: "Ausführlich", desc: "Emotionale Bilder · Sprachnotizen · NotebookLM" },
            { id: "investment" as PdfTemplate, actionId: "expose_pdf_investment", icon: "📊", label: "Investment", sub: "Zahlenfokus", desc: "Tabellen · Marktdaten · Mietpreisentwicklung" },
          ].map(t => (
            <button
              key={t.id}
              onClick={async () => {
                setSelectedTemplate(t.id);
                const pdfParams: PdfWebhookParams = {
                  objekt: {
                    titel: form.titel,
                    objektnummer: form.objektnummer,
                    bezirk: form.bezirk,
                    plz: form.plz,
                    ort: form.ort,
                    strasse: form.strasse,
                    hnr: form.hnr,
                    objektart: form.objektart,
                    verkaufsart: form.verkaufsart,
                    kaufpreis: form.kaufpreis,
                    miete: form.miete,
                    flaeche: form.flaeche,
                    zimmer: form.zimmer,
                    provisionsstellung: form.provisionsstellung,
                    kaeufer_provision: form.kaeufer_provision,
                    verkaeufer_provision: form.verkaeufer_provision,
                  },
                  texte: {
                    ki_expose: aiText,
                    kurzbeschreibung,
                    beschreibung: form.beschreibung,
                    sprachnotizen,
                    notebook_lm: notebookLmText,
                  },
                  image_urls: images.filter(Boolean),
                  bilder_anzahl: images.length,
                };
                const sendFn = t.actionId === ACTION_IDS.PDF_QUICK ? sendPdfQuick
                  : t.actionId === ACTION_IDS.PDF_INVESTMENT ? sendPdfInvestment
                  : sendPdfClassic;
                await sendFn(pdfParams);
              }}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center min-h-[180px] justify-center ${
                selectedTemplate === t.id
                  ? "border-primary bg-primary/5 shadow-orange"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              <span className="text-3xl">{t.icon}</span>
              <div>
                <span className="text-sm font-bold text-foreground block">{t.label}</span>
                <span className="text-[10px] font-semibold text-primary">{t.sub}</span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">{t.desc}</span>
              {selectedTemplate === t.id && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">✓ Ausgewählt</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Aktions-Buttons */}
      <div className="space-y-3">
        <button onClick={() => handleSave(true)} disabled={!formValid || saving}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
          {saving ? <><RefreshCw size={18} className="animate-spin" /> Wird gespeichert…</> : <><Copy size={18} /> An ImmoZ übertragen & online stellen</>}
        </button>

        <button onClick={() => handleSave(false)} disabled={!formValid || saving}
          className="w-full border-2 border-dashed border-border bg-card text-foreground rounded-2xl py-3.5 text-sm font-bold hover:bg-accent transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={16} className="text-muted-foreground" /> Nur intern speichern (Entwurf)
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handlePdfExport} disabled={!formValid}
            className="bg-card border border-border text-foreground rounded-2xl py-3.5 text-sm font-bold hover:bg-accent transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            <Eye size={16} className="text-primary" /> PDF-Vorschau
          </button>

          <button onClick={handleVideoWebhook} disabled={!formValid || sendingWebhook}
            className="bg-primary text-primary-foreground rounded-2xl py-3.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {sendingWebhook ? <><RefreshCw size={16} className="animate-spin" /> Senden…</> : <><Send size={16} /> KI Video Rundgang</>}
          </button>
        </div>
      </div>

      <div className="bg-accent rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          ⚖️ <strong className="text-foreground">Rechtskonformität:</strong> Alle Exposés entsprechen dem MaklerG und EAVG. Provisionspflicht gemäß § 14 MaklerG. Energieausweis gem. § 6a EAVG.
        </p>
      </div>

      <ExposePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        data={{ ...form, aiText, kurzbeschreibung, images, sprachnotizen, notebookLmText }}
        template={selectedTemplate}
      />
      <MagicToolOverlay
        open={magicEditOpen}
        photoUrl={magicEditPhoto}
        onClose={() => { setMagicEditOpen(false); setMagicEditPhoto(null); }}
      />
    </div>
  );
}
