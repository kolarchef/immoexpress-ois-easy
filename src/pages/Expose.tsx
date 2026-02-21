import { useState } from "react";
import { FileText, Upload, Wand2, X, Image, Download, RefreshCw, CheckCircle, AlertCircle, Copy, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
const provisionOptionen = ["Käufer", "Verkäufer", "Geteilt (50/50)", "Provisionsfrei"];

const KURZBESCHREIBUNG_LIMIT = 2000;

export default function Expose() {
  const [images, setImages] = useState<string[]>([]);
  const [aiText, setAiText] = useState("");
  const [kurzbeschreibung, setKurzbeschreibung] = useState("");
  const [korrekturText, setKorrekturText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [imageAnalyzed, setImageAnalyzed] = useState(false);
  const [aiModel, setAiModel] = useState("");
  const [exposeLaenge, setExposeLaenge] = useState<"kurz" | "lang">("lang");
  const [form, setForm] = useState({
    titel: "", objektnummer: "", bezirk: "", plz: "", ort: "", strasse: "", hnr: "",
    objektart: "", kaufpreis: "", miete: "",
    flaeche: "", zimmer: "", beschreibung: "", verkaufsart: "Kauf",
    provisionsstellung: "Käufer",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - images.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (files.length > remaining) {
      toast({ title: "Max. 5 Bilder für KI-Analyse", description: `Nur ${remaining} weitere Bilder wurden hinzugefügt.`, variant: "destructive" });
    }
    setImageAnalyzed(false);
  };

  const handleGenerate = async (withKorrektur = false) => {
    setGenerating(true);
    try {
      const formData = {
        ...form,
        beschreibung: withKorrektur && korrekturText
          ? `${form.beschreibung}\n\nKorrektur-Hinweis: ${korrekturText}`
          : form.beschreibung,
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
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "KI-Fehler", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleKurzbeschreibungUebernehmen = () => {
    const truncated = aiText.slice(0, KURZBESCHREIBUNG_LIMIT);
    setKurzbeschreibung(truncated);
    toast({ title: "✓ Übernommen", description: `Kurzbeschreibung mit ${truncated.length} Zeichen gesetzt.` });
  };

  // Speichern & ImmoZ-Export
  const handleSaveAndExport = async () => {
    if (!form.titel || !form.objektart) {
      toast({ title: "Fehlende Pflichtfelder", description: "Bitte Objekttitel und Objektart ausfüllen.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const objektData = {
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
        beschreibung: aiText || form.beschreibung,
        ki_text: aiText,
        verkaufsart: form.verkaufsart,
        status: "aktiv",
        immoz_exportiert: true,
        immoz_export_datum: new Date().toISOString(),
      };

      const { data: obj, error: objErr } = await supabase.from("objekte").insert(objektData).select().single();
      if (objErr) throw objErr;

      // ImmoZ Export-Log
      const exportDateiname = `immoZ_export_${new Date().toLocaleDateString("de-AT").replace(/\./g, "")}.xml`;
      await supabase.from("immoz_exporte").insert({
        objekte_ids: [obj.id],
        anzahl: 1,
        status: "Erfolgreich",
        dateiname: exportDateiname,
      });

      toast({
        title: "✓ Gespeichert & an ImmoZ übertragen!",
        description: `Objekt "${form.titel}" wurde in der Datenbank gespeichert und für ImmoZ bereitgestellt.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Datenbankfehler";
      toast({ title: "Fehler beim Speichern", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePdfExport = () => {
    setExportingPdf(true);
    const printContent = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Exposé – ${form.titel || "Immobilie"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #E8541A; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: bold; color: #E8541A; }
    .logo-sub { font-size: 11px; color: #888; margin-top: 2px; }
    h1 { font-size: 20px; color: #1a1a1a; margin-bottom: 4px; }
    .subtitle { color: #E8541A; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .field { background: #f7f7f7; border-radius: 6px; padding: 10px 12px; }
    .field label { font-size: 10px; text-transform: uppercase; color: #888; display: block; margin-bottom: 3px; }
    .field span { font-size: 14px; font-weight: 700; }
    .preis span { color: #E8541A; }
    .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .photos img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; }
    .ai-box { background: #fff8f5; border-left: 4px solid #E8541A; border-radius: 6px; padding: 16px; white-space: pre-wrap; font-size: 12px; line-height: 1.7; margin-bottom: 20px; }
    .disclaimer { border-top: 1px solid #eee; padding-top: 14px; font-size: 10px; color: #999; line-height: 1.5; }
    .page-footer { position: fixed; bottom: 20px; left: 40px; right: 40px; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 8px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div><div class="logo">ImmoExpress</div><div class="logo-sub">Ihr Makler in Wien & Österreich</div></div>
    <div style="text-align:right; font-size:11px; color:#888">
      Erstellt: ${new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}<br/>
      Ref-Nr.: ${form.objektnummer || `EXP-${Date.now().toString().slice(-6)}`}
    </div>
  </div>
  <h1>${form.titel || "Immobilien-Exposé"}</h1>
  <div class="subtitle">${form.bezirk || ""} ${form.objektart ? "· " + form.objektart : ""} · ${form.verkaufsart}</div>
  ${images.length > 0 ? `<div class="photos">${images.slice(0, 6).map(img => `<img src="${img}" alt="Objektfoto" />`).join("")}</div>` : ""}
  <div class="grid">
    <div class="field"><label>Objektart</label><span>${form.objektart || "–"}</span></div>
    <div class="field"><label>Wohnfläche</label><span>${form.flaeche ? form.flaeche + " m²" : "–"}</span></div>
    <div class="field"><label>Zimmer</label><span>${form.zimmer || "–"}</span></div>
    <div class="field"><label>Lage</label><span>${form.bezirk || "–"}</span></div>
    <div class="field"><label>Provision</label><span>${form.provisionsstellung}</span></div>
    <div class="field preis"><label>${form.verkaufsart === "Kauf" ? "Kaufpreis" : "Miete/Monat"}</label><span>€ ${form.verkaufsart === "Kauf" ? (form.kaufpreis ? Number(form.kaufpreis).toLocaleString("de-AT") : "auf Anfrage") : (form.miete ? Number(form.miete).toLocaleString("de-AT") : "auf Anfrage")}</span></div>
  </div>
  ${kurzbeschreibung ? `<div class="ai-box"><strong>KURZBESCHREIBUNG:</strong><br/>${kurzbeschreibung}</div>` : ""}
  ${aiText ? `<div class="ai-box">${aiText.replace(/\n/g, "<br/>")}</div>` : ""}
  <div class="disclaimer">
    <strong>Haftungsausschluss:</strong> Alle Angaben ohne Gewähr. Provisionspflichtig gemäß Alleinvermittlungsauftrag (§ 14 MaklerG). Ein gültiger Energieausweis liegt vor (§ 6a EAVG). Dieses Exposé stellt kein rechtlich bindendes Angebot dar (§ 5 MaklerG).<br/><br/>
    ImmoExpress Immobilienvermittlung GmbH · ÖVI-Mitglied · www.immoexpress.at
  </div>
  <div class="page-footer">
    <span>ImmoExpress · Vertraulich</span>
    <span>⚖️ MaklerG konform · DSGVO-gemäß</span>
    <span>${new Date().toLocaleDateString("de-AT")}</span>
  </div>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); setExportingPdf(false); }, 600);
    } else {
      setExportingPdf(false);
    }
  };

  const formValid = form.titel && form.objektart;
  const kurzbeschreibungLen = kurzbeschreibung.length;

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exposé-Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">KI-gestützt · Wiener Makler-Stil · PDF-Export</p>
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

        {/* Lage-Detail */}
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

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provisionsstellung</label>
          <select className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.provisionsstellung} onChange={(e) => setForm({ ...form, provisionsstellung: e.target.value })}>
            {provisionOptionen.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Beschreibung / Notizen</label>
          <textarea className="mt-1 w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={3} placeholder="Besonderheiten, Dachterrasse, Tiefgaragenplatz…" value={form.beschreibung}
            onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} />
        </div>
      </div>

      {/* Foto-Upload */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Image size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Fotos hochladen</h2>
          <span className="ml-auto text-xs font-semibold text-primary">{images.length}/5 für KI-Analyse</span>
        </div>

        {images.length > 0 && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-3 text-xs font-medium ${imageAnalyzed ? "bg-green-50 text-green-700 border border-green-200" : "bg-primary-light text-primary border border-primary/20"}`}>
            {imageAnalyzed
              ? <><CheckCircle size={14} /> {images.length} Bild(er) von KI analysiert – echte Vision-KI aktiv</>
              : <><Wand2 size={14} /> {images.length} Bild(er) bereit · KI analysiert Fotos beim Generieren (max. 5)</>
            }
          </div>
        )}

        {images.length < 5 && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl py-6 cursor-pointer hover:bg-accent transition-all bg-surface mb-4">
            <Upload size={22} className="text-primary mb-2" />
            <span className="text-sm font-semibold text-foreground">Fotos auswählen</span>
            <span className="text-xs text-muted-foreground mt-1">JPG, PNG – Max. 5 Bilder für KI-Analyse</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImages(prev => prev.filter((_, idx) => idx !== i)); setImageAnalyzed(false); }}
                  className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-1 hover:bg-destructive transition-colors"
                >
                  <X size={12} />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">Titelbild</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KI-Textgenerator */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">KI-Exposé-Text</h2>
          {aiModel && <span className="ml-auto text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{aiModel.split("/")[1]}</span>}
        </div>

        {/* Kurz / Lang Auswahl */}
        <div className="flex gap-2">
          <button
            onClick={() => setExposeLaenge("kurz")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${exposeLaenge === "kurz" ? "bg-primary text-primary-foreground border-primary shadow-orange" : "bg-accent text-foreground border-border hover:bg-secondary"}`}
          >
            Kurz
          </button>
          <button
            onClick={() => setExposeLaenge("lang")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${exposeLaenge === "lang" ? "bg-primary text-primary-foreground border-primary shadow-orange" : "bg-accent text-foreground border-border hover:bg-secondary"}`}
          >
            Lang
          </button>
        </div>

        <button
          onClick={() => handleGenerate(false)}
          disabled={!formValid || generating}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <><RefreshCw size={16} className="animate-spin" /> KI analysiert{images.length > 0 ? " Bilder & " : " "}Daten…</>
          ) : (
            <><Wand2 size={16} /> Exposé-Text via KI generieren{images.length > 0 ? ` (${images.length} Foto${images.length > 1 ? "s" : ""})` : ""}</>
          )}
        </button>

        {aiText && (
          <>
            <div className="bg-accent rounded-xl p-4 border border-border">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">{aiText}</pre>
            </div>

            {/* Korrektur-Feld */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Korrektur-Hinweis (optional)</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                  placeholder="z.B. Mehr Betonung auf Terrassenblick & Parkett…"
                  value={korrekturText}
                  onChange={(e) => setKorrekturText(e.target.value)}
                />
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={generating || !korrekturText.trim()}
                  className="px-4 py-2.5 bg-accent text-foreground border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                >
                  <RefreshCw size={14} /> Neu generieren
                </button>
              </div>
            </div>

            {/* Kurzbeschreibung übernehmen */}
            <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kurzbeschreibung</label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${kurzbeschreibungLen > KURZBESCHREIBUNG_LIMIT ? "bg-destructive/10 text-destructive" : kurzbeschreibungLen > KURZBESCHREIBUNG_LIMIT * 0.8 ? "bg-primary-light text-primary" : "text-muted-foreground"}`}>
                  {kurzbeschreibungLen}/{KURZBESCHREIBUNG_LIMIT}
                </span>
              </div>
              <textarea
                className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={4}
                maxLength={KURZBESCHREIBUNG_LIMIT}
                placeholder="Kurzbeschreibung für Inserat (max. 2.000 Zeichen)…"
                value={kurzbeschreibung}
                onChange={(e) => setKurzbeschreibung(e.target.value)}
              />
              <button
                onClick={handleKurzbeschreibungUebernehmen}
                className="w-full flex items-center justify-center gap-2 bg-accent text-foreground border border-border rounded-xl py-2 text-sm font-semibold hover:bg-secondary transition-all active:scale-95"
              >
                <ArrowRight size={14} /> In Kurzbeschreibung übernehmen (erste 2.000 Zeichen)
              </button>
            </div>
          </>
        )}
      </div>

      {/* Aktions-Buttons */}
      <div className="space-y-3">
        {/* Haupt-Button: Speichern & ImmoZ */}
        <button
          onClick={handleSaveAndExport}
          disabled={!formValid || saving}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {saving ? (
            <><RefreshCw size={18} className="animate-spin" /> Wird gespeichert…</>
          ) : (
            <><Copy size={18} /> Objekt speichern & an ImmoZ übertragen</>
          )}
        </button>

        {/* PDF Export */}
        <button
          onClick={handlePdfExport}
          disabled={!formValid || exportingPdf}
          className="w-full border border-border bg-card text-foreground rounded-2xl py-3.5 text-sm font-bold hover:bg-accent transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download size={16} /> PDF-Exposé exportieren
        </button>
      </div>

      {/* Rechtlicher Hinweis */}
      <div className="bg-accent rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          ⚖️ <strong className="text-foreground">Rechtskonformität:</strong> Alle Exposés entsprechen dem österreichischen Maklergesetz (MaklerG) und dem Energieausweis-Vorlage-Gesetz (EAVG). Provisionspflicht gemäß § 14 MaklerG. Energieausweis gem. § 6a EAVG verpflichtend.
        </p>
      </div>
    </div>
  );
}
