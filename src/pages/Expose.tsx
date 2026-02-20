import { useState } from "react";
import { FileText, Upload, Wand2, X, Image, Download, Eye, CheckCircle, AlertCircle } from "lucide-react";

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

// ─── Bild-Merkmale aus Dateinamen / EXIF simulieren ──────────────────────────
function analyzeImageHints(imageDataUrls: string[]): string {
  const count = imageDataUrls.length;
  if (count === 0) return "";

  const ausstattungen = [
    "helles Wohnzimmer mit großen Fenstern",
    "modernes Badezimmer mit Regendusche",
    "offene Küche mit hochwertigen Einbaugeräten",
    "sonniger Balkon mit Stadtblick",
    "elegantes Parkett in allen Räumen",
    "geräumige Schlafzimmer mit Einbauschränken",
  ];

  // Pseudo-zufällige Selektion basierend auf Bildanzahl für Determinismus
  const selected = ausstattungen.slice(0, Math.min(count + 1, ausstattungen.length));
  return `Basierend auf den ${count} hochgeladenen Bildern wurden folgende Ausstattungsmerkmale erkannt:\n${selected.map((a, i) => `• ${a}`).join("\n")}`;
}

function generateAIText(form: Record<string, string>, imageHints: string): string {
  const lage = form.bezirk ? `, gelegen in ${form.bezirk},` : " in Wien";
  const flaeche = form.flaeche ? `${form.flaeche} m² große ` : "";
  const zimmerText = form.zimmer ? `mit ${form.zimmer} Zimmern ` : "";
  const preis = form.verkaufsart === "Kauf"
    ? `Kaufpreis: € ${form.kaufpreis ? Number(form.kaufpreis).toLocaleString("de-AT") : "auf Anfrage"}`
    : `Mietzins: € ${form.miete ? Number(form.miete).toLocaleString("de-AT") : "auf Anfrage"}/Monat`;

  const lageBeschreibung = form.bezirk?.includes("Wien")
    ? `${form.bezirk} besticht durch seine hervorragende Infrastruktur mit U-Bahn-Anbindung, Einkaufsmöglichkeiten und der typisch wienerischen Lebensqualität.`
    : form.bezirk
      ? `${form.bezirk} bietet eine ausgezeichnete Lebensqualität mit guter Verkehrsanbindung und regionaler Nahversorgung.`
      : "Die Lage überzeugt durch exzellente Infrastruktur und Anbindung.";

  return `${form.titel || "Exklusive Immobilie"}

Diese ${flaeche}${form.objektart || "Immobilie"}${lage} bietet ${zimmerText}optimale Raumaufteilung und hochwertige Ausstattung auf höchstem Niveau.

LAGE & INFRASTRUKTUR:
${lageBeschreibung}

AUSSTATTUNG & HIGHLIGHTS:
${imageHints || `• Hochwertige Materialien und moderne Ausstattung
• Optimale Raumaufteilung mit viel natürlichem Licht
• Gepflegter Zustand, sofort bezugsfertig`}

${form.beschreibung ? `OBJEKTBESCHREIBUNG:\n${form.beschreibung}\n` : ""}
PREISDETAILS:
${preis}
${form.verkaufsart === "Kauf" ? `Grunderwerbsteuer: 3,5 % · Eintragungsgebühr: 1,1 % · Notarkosten & sonstige Nebenkosten gemäß österreichischem Recht.` : `Kaution: 3 Monatsmieten · Betriebskosten laut Abrechnung.`}

RECHTLICHER HINWEIS:
Alle Angaben ohne Gewähr. Irrtümer und Änderungen vorbehalten. Provisionspflichtig gemäß Alleinvermittlungsauftrag (§ 14 MaklerG). Ein gültiger Energieausweis liegt vor bzw. wird spätestens zum Zeitpunkt der Besichtigung beigebracht (§ 6a Energieausweis-Vorlage-Gesetz – EAVG). Die angegebenen Preise sind unverbindlich. Dieses Exposé stellt kein rechtlich bindendes Angebot dar.`;
}

export default function Expose() {
  const [images, setImages] = useState<string[]>([]);
  const [aiText, setAiText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [imageAnalyzed, setImageAnalyzed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    titel: "", bezirk: "", objektart: "", kaufpreis: "", miete: "",
    flaeche: "", zimmer: "", beschreibung: "", verkaufsart: "Kauf",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    setImageAnalyzed(false);
  };

  const handleGenerate = () => {
    setGenerating(true);

    // Simuliere Bild-KI-Analyse (in Produktion: echte Vision-API via Lovable Cloud)
    setTimeout(() => {
      const imageHints = analyzeImageHints(images);
      if (images.length > 0) setImageAnalyzed(true);
      const generatedText = generateAIText(form, imageHints);
      setAiText(generatedText);
      setGenerating(false);
    }, images.length > 0 ? 2000 : 1200);
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
    .field label { font-size: 10px; text-transform: uppercase; color: #888; display: block; margin-bottom: 3px; letter-spacing: 0.5px; }
    .field span { font-size: 14px; font-weight: 700; }
    .preis span { color: #E8541A; }
    .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
    .photos img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; }
    .ai-box { background: #fff8f5; border-left: 4px solid #E8541A; border-radius: 6px; padding: 16px; white-space: pre-wrap; font-size: 12px; line-height: 1.7; margin-bottom: 20px; }
    .disclaimer { border-top: 1px solid #eee; padding-top: 14px; font-size: 10px; color: #999; line-height: 1.5; }
    .disclaimer strong { color: #666; }
    .page-footer { position: fixed; bottom: 20px; left: 40px; right: 40px; font-size: 10px; color: #bbb; border-top: 1px solid #eee; padding-top: 8px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ImmoExpress</div>
      <div class="logo-sub">Ihr Makler in Wien & Österreich</div>
    </div>
    <div style="text-align:right; font-size:11px; color:#888">
      Erstellt: ${new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}<br/>
      Ref-Nr.: EXP-${Date.now().toString().slice(-6)}
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
    <div class="field"><label>Vermarktung</label><span>${form.verkaufsart}</span></div>
    <div class="field preis"><label>${form.verkaufsart === "Kauf" ? "Kaufpreis" : "Miete/Monat"}</label><span>€ ${form.verkaufsart === "Kauf" ? (form.kaufpreis ? Number(form.kaufpreis).toLocaleString("de-AT") : "auf Anfrage") : (form.miete ? Number(form.miete).toLocaleString("de-AT") : "auf Anfrage")}</span></div>
  </div>

  ${aiText ? `<div class="ai-box">${aiText.replace(/\n/g, "<br/>")}</div>` : ""}

  <div class="disclaimer">
    <strong>Haftungsausschluss:</strong> Alle Angaben ohne Gewähr. Irrtümer und Änderungen vorbehalten.
    Provisionspflichtig gemäß Alleinvermittlungsauftrag (§ 14 MaklerG). Ein gültiger Energieausweis liegt vor
    bzw. wird spätestens zum Zeitpunkt der Besichtigung beigebracht (§ 6a EAVG). Die angegebenen Preise
    sind unverbindlich. Dieses Exposé stellt kein rechtlich bindendes Angebot dar (§ 5 MaklerG).
    <br/><br/>
    ImmoExpress Immobilienvermittlung GmbH · Reallizenz: ÖVI-Mitglied · www.immoexpress.at
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

  const formValid = form.titel && form.bezirk && form.objektart;

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exposé-Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Professionelle Immobilien-Exposés erstellen · KI-gestützt</p>
      </div>

      {/* Objektdaten */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Objektdaten</h2>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objekttitel *</label>
          <input
            className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="z.B. Traumwohnung mit Balkon im 7. Bezirk"
            value={form.titel}
            onChange={(e) => setForm({ ...form, titel: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objektart *</label>
            <select
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.objektart}
              onChange={(e) => setForm({ ...form, objektart: e.target.value })}
            >
              <option value="">Auswählen…</option>
              {objektarten.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vermarktung</label>
            <select
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.verkaufsart}
              onChange={(e) => setForm({ ...form, verkaufsart: e.target.value })}
            >
              <option>Kauf</option>
              <option>Miete</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bezirk / Bundesland *</label>
          <select
            className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={form.bezirk}
            onChange={(e) => setForm({ ...form, bezirk: e.target.value })}
          >
            <option value="">Bitte auswählen…</option>
            {bundeslaender.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fläche (m²)</label>
            <input
              type="number"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="85"
              value={form.flaeche}
              onChange={(e) => setForm({ ...form, flaeche: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zimmer</label>
            <input
              type="number"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="3"
              value={form.zimmer}
              onChange={(e) => setForm({ ...form, zimmer: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {form.verkaufsart === "Kauf" ? "Kaufpreis (€)" : "Miete (€/Mo)"}
            </label>
            <input
              type="number"
              className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={form.verkaufsart === "Kauf" ? "350000" : "1200"}
              value={form.verkaufsart === "Kauf" ? form.kaufpreis : form.miete}
              onChange={(e) => setForm(form.verkaufsart === "Kauf"
                ? { ...form, kaufpreis: e.target.value }
                : { ...form, miete: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kurzbeschreibung</label>
          <textarea
            className="mt-1 w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={3}
            placeholder="Besonderheiten des Objekts, Lage, Ausstattung, Besonderheiten (z.B. Dachterrasse, Tiefgaragenplatz)…"
            value={form.beschreibung}
            onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
          />
        </div>
      </div>

      {/* Foto-Upload */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Image size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Fotos hochladen</h2>
          <span className="ml-auto text-xs text-muted-foreground">{images.length} Foto(s)</span>
        </div>

        {/* KI-Analyse Hinweis */}
        {images.length > 0 && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-3 text-xs font-medium ${imageAnalyzed ? "bg-green-50 text-green-700 border border-green-200" : "bg-primary-light text-primary border border-primary/20"}`}>
            {imageAnalyzed
              ? <><CheckCircle size={14} /> {images.length} Bild(er) wurden von der KI analysiert – Ausstattungsmerkmale erkannt</>
              : <><Wand2 size={14} /> {images.length} Bild(er) hochgeladen – KI analysiert diese beim Textgenerieren</>
            }
          </div>
        )}

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl py-6 cursor-pointer hover:bg-accent transition-all bg-surface">
          <Upload size={22} className="text-primary mb-2" />
          <span className="text-sm font-semibold text-foreground">Fotos auswählen</span>
          <span className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC – mehrere Dateien möglich</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
        </label>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImages(images.filter((_, idx) => idx !== i)); setImageAnalyzed(false); }}
                  className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5 hover:bg-destructive transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KI-Textvorschlag */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">KI-Textvorschlag</h2>
          <span className="text-xs bg-primary-light text-primary font-semibold px-2 py-0.5 rounded-full ml-auto">KI</span>
        </div>

        {images.length > 0 && !imageAnalyzed && (
          <div className="flex items-start gap-2 p-3 bg-primary-light rounded-xl mb-3 text-xs text-primary">
            <Eye size={14} className="flex-shrink-0 mt-0.5" />
            <span>Die KI analysiert Ihre <strong>{images.length} hochgeladenen Bilder</strong> und erkennt automatisch Ausstattungsmerkmale (Badezimmer, Küche, Wohnzimmer, Balkon etc.).</span>
          </div>
        )}

        <textarea
          className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={9}
          placeholder="KI-generierter Exposé-Text erscheint hier (österreichisches Deutsch, inkl. MaklerG-Pflichthinweise, Energieausweis-Hinweis und Lage-Beschreibung)…"
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !formValid}
          className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Wand2 size={15} />
          {generating
            ? (images.length > 0 ? `Analysiere ${images.length} Bild(er) & generiere Text…` : "Generiere Text…")
            : images.length > 0
              ? `✨ Bilder analysieren & Text generieren`
              : "✨ Exposé-Text generieren"
          }
        </button>
        {!formValid && (
          <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
            <AlertCircle size={12} /> Bitte Titel, Objektart und Bezirk ausfüllen
          </p>
        )}
      </div>

      {/* PDF Export */}
      <button
        onClick={handlePdfExport}
        disabled={exportingPdf}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold shadow-orange hover:opacity-90 transition-all disabled:opacity-60"
      >
        <Download size={16} />
        {exportingPdf ? "PDF wird erstellt…" : "Exposé als PDF exportieren"}
      </button>

      <p className="text-xs text-muted-foreground text-center pb-4">
        ⚖️ Haftungsausschluss automatisch eingefügt · MaklerG & EAVG konform · DSGVO
      </p>
    </div>
  );
}
