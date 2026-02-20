import { useState } from "react";
import { FileText, Upload, Wand2, X, Image } from "lucide-react";

const bundeslaender = [
  "Wien – 1. Bezirk (Innere Stadt)", "Wien – 2. Bezirk (Leopoldstadt)", "Wien – 3. Bezirk (Landstraße)",
  "Wien – 4. Bezirk (Wieden)", "Wien – 5. Bezirk (Margareten)", "Wien – 6. Bezirk (Mariahilf)",
  "Wien – 7. Bezirk (Neubau)", "Wien – 8. Bezirk (Josefstadt)", "Wien – 9. Bezirk (Alsergrund)",
  "Wien – 10. Bezirk (Favoriten)", "Wien – 11. Bezirk (Simmering)", "Wien – 12. Bezirk (Meidling)",
  "Wien – 13. Bezirk (Hietzing)", "Wien – 14. Bezirk (Penzing)", "Wien – 15. Bezirk (Rudolfsheim)",
  "Wien – 16. Bezirk (Ottakring)", "Wien – 17. Bezirk (Hernals)", "Wien – 18. Bezirk (Währing)",
  "Wien – 19. Bezirk (Döbling)", "Wien – 20. Bezirk (Brigittenau)", "Wien – 21. Bezirk (Floridsdorf)",
  "Wien – 22. Bezirk (Donaustadt)", "Wien – 23. Bezirk (Liesing)",
  "Niederösterreich", "Oberösterreich", "Steiermark", "Tirol", "Vorarlberg",
  "Salzburg", "Kärnten", "Burgenland",
];

const objektarten = ["Eigentumswohnung", "Mietwohnung", "Einfamilienhaus", "Doppelhaushälfte", "Reihenhaus", "Grundstück", "Büro/Gewerbefläche", "Zinshaus"];

export default function Expose() {
  const [images, setImages] = useState<string[]>([]);
  const [aiText, setAiText] = useState("");
  const [generating, setGenerating] = useState(false);
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
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setAiText(
        `${form.titel || "Exklusive Immobilie"} in ${form.bezirk || "Wien"} – ${form.objektart || "Wohnung"}\n\n` +
        `Diese ${form.flaeche ? form.flaeche + " m² große " : ""}${form.objektart || "Immobilie"} befindet sich in bevorzugter Lage in ${form.bezirk || "Wien"} ` +
        `und überzeugt durch hochwertige Ausstattung sowie eine optimale Raumaufteilung mit ${form.zimmer || "mehreren"} Zimmern.\n\n` +
        `${form.verkaufsart === "Kauf" ? `Kaufpreis: € ${form.kaufpreis || "auf Anfrage"}` : `Miete: € ${form.miete || "auf Anfrage"}/Monat`}\n\n` +
        `Alle Angaben ohne Gewähr. Irrtümer und Änderungen vorbehalten. Provisionspflichtig gemäß Alleinvermittlungsauftrag (MaklerG). ` +
        `Energieausweis liegt vor bzw. wird bis zur Besichtigung beigebracht.`
      );
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exposé-Generator</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Professionelle Immobilien-Exposés erstellen</p>
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objektart</label>
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
            placeholder="Besonderheiten des Objekts, Lage, Ausstattung…"
            value={form.beschreibung}
            onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
          />
        </div>
      </div>

      {/* Foto-Upload */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Image size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Fotos hochladen</h2>
          <span className="ml-auto text-xs text-muted-foreground">{images.length} Foto(s)</span>
        </div>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-xl py-8 cursor-pointer hover:bg-accent transition-all bg-surface">
          <Upload size={24} className="text-primary mb-2" />
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
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5"
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
        <div className="flex items-center gap-2 mb-4">
          <Wand2 size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">KI-Textvorschlag</h2>
          <span className="text-xs bg-primary-light text-primary font-semibold px-2 py-0.5 rounded-full ml-auto">Beta</span>
        </div>
        <textarea
          className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={6}
          placeholder="KI-generierter Exposé-Text erscheint hier (österreichisches Deutsch, inkl. Provisionspflicht-Hinweis)…"
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
        />
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all disabled:opacity-60"
        >
          {generating ? "Generiere Text…" : "Text generieren"}
        </button>
      </div>

      <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold shadow-orange hover:opacity-90 transition-all">
        Exposé als PDF exportieren
      </button>
    </div>
  );
}
