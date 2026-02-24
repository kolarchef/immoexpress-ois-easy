import { LayoutTemplate } from "lucide-react";

export type PdfTemplate = "quick-check" | "expose-style" | "investment";

const templates: { id: PdfTemplate; icon: string; label: string; sub: string; desc: string }[] = [
  { id: "quick-check", icon: "⚡", label: "Quick-Check", sub: "Kompakt", desc: "Infografiken · Sterne-Ratings · Harte Fakten" },
  { id: "expose-style", icon: "🏠", label: "Klassisch", sub: "Ausführlich", desc: "Emotionale Bilder · Sprachnotizen · NotebookLM" },
  { id: "investment", icon: "📊", label: "Investment", sub: "Zahlenfokus", desc: "Tabellen · Marktdaten · Mietpreisentwicklung" },
];

interface PdfTemplateSelectorProps {
  selected: PdfTemplate;
  onChange: (template: PdfTemplate) => void;
  onTemplateClick?: (template: PdfTemplate) => void;
}

export default function PdfTemplateSelector({ selected, onChange, onTemplateClick }: PdfTemplateSelectorProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
      <div className="flex items-center gap-2">
        <LayoutTemplate size={18} className="text-primary" />
        <h2 className="font-bold text-foreground">PDF-Vorlage wählen</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => { onChange(t.id); onTemplateClick?.(t.id); }}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center min-h-[180px] justify-center ${
              selected === t.id
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
            {selected === t.id && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">✓ Ausgewählt</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
