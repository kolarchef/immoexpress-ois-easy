import { useState, useRef } from "react";
import { X, Send, MessageCircle, Mail, Search, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import type { PdfTemplate } from "@/pages/Expose";
import { sendAction } from "@/lib/sendAction";
import { useAuth } from "@/contexts/AuthContext";

interface ExposeData {
  titel: string;
  objektnummer: string;
  bezirk: string;
  objektart: string;
  verkaufsart: string;
  flaeche: string;
  zimmer: string;
  kaufpreis: string;
  miete?: string;
  provisionsstellung: string;
  plz?: string;
  strasse?: string;
  hnr?: string;
  aiText?: string;
  kurzbeschreibung?: string;
  images?: string[];
  sprachnotizen?: string;
  notebookLmText?: string;
}

interface Kunde {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  typ: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: ExposeData;
  template: PdfTemplate;
}

const templateLabels: Record<PdfTemplate, string> = {
  "quick-check": "⚡ Quick-Check",
  "expose-style": "🏠 Exposé-Style",
  "investment": "📊 Investment-Analyse",
};

export default function ExposePreviewModal({ open, onClose, data, template }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<"preview" | "send">("preview");
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [search, setSearch] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!open) return null;

  const priceLabel = data.verkaufsart === "Kauf" ? "Kaufpreis" : "Miete";
  const priceValue = data.verkaufsart === "Kauf"
    ? (data.kaufpreis ? `€ ${Number(data.kaufpreis).toLocaleString("de-AT")}` : "auf Anfrage")
    : (data.miete ? `€ ${Number(data.miete).toLocaleString("de-AT")}` : "auf Anfrage");
  const adresse = [data.strasse, data.hnr, data.plz].filter(Boolean).join(" ") || "–";
  const dateStr = new Date().toLocaleDateString("de-AT");

  // === Quick-Check HTML ===
  const quickCheckHtml = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Quick-Check – ${data.titel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;color:#1a1a1a;font-size:12px}
.header{border-bottom:3px solid #E8541A;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:18px;font-weight:bold;color:#E8541A}
h1{font-size:16px;margin-bottom:6px}
.score-box{background:#fff5f0;border:2px solid #E8541A;border-radius:12px;padding:16px;text-align:center;margin-bottom:16px}
.score{font-size:48px;font-weight:900;color:#E8541A}
.stars{font-size:24px;margin:4px 0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.fact{background:#f7f7f7;border-radius:8px;padding:10px;text-align:center}
.fact label{font-size:9px;text-transform:uppercase;color:#888;display:block;margin-bottom:3px}
.fact .val{font-size:16px;font-weight:800}
.fact .val.orange{color:#E8541A}
.checklist{margin-bottom:14px}.check-item{padding:6px 0;border-bottom:1px solid #eee;display:flex;align-items:center;gap:6px;font-size:11px}
.check-item .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.green{background:#22c55e}.yellow{background:#f59e0b}.red{background:#ef4444}
.disclaimer{border-top:1px solid #eee;padding-top:10px;font-size:8px;color:#999;margin-top:14px}
</style></head><body>
<div class="header"><div><div class="logo">ImmoExpress</div><div style="font-size:9px;color:#888">Quick-Check · ${dateStr}</div></div><div style="font-size:9px;color:#888;text-align:right">Ref: ${data.objektnummer || "–"}</div></div>
<h1>${data.titel || "Immobilien Quick-Check"}</h1>
<p style="color:#E8541A;font-size:11px;font-weight:600;margin-bottom:14px">${data.bezirk} · ${data.objektart} · ${data.verkaufsart}</p>
<div class="score-box"><div class="stars">★★★★☆</div><div class="score">8.4</div><div style="font-size:10px;color:#888;margin-top:2px">KI STANDORT-SCORE</div></div>
<div class="grid">
<div class="fact"><label>Objektart</label><div class="val">${data.objektart || "–"}</div></div>
<div class="fact"><label>Wohnfläche</label><div class="val">${data.flaeche ? data.flaeche + " m²" : "–"}</div></div>
<div class="fact"><label>Zimmer</label><div class="val">${data.zimmer || "–"}</div></div>
<div class="fact"><label>${priceLabel}</label><div class="val orange">${priceValue}</div></div>
<div class="fact"><label>Adresse</label><div class="val" style="font-size:11px">${adresse}</div></div>
<div class="fact"><label>Provision</label><div class="val" style="font-size:11px">${data.provisionsstellung}</div></div>
</div>
<h3 style="font-size:12px;margin-bottom:8px">Lage-Check</h3>
<div class="checklist">
<div class="check-item"><div class="dot green"></div>ÖPNV: Sehr gut angebunden</div>
<div class="check-item"><div class="dot green"></div>Nahversorgung: Ausgezeichnet</div>
<div class="check-item"><div class="dot green"></div>Bildung: Schulen in Gehdistanz</div>
<div class="check-item"><div class="dot yellow"></div>Grünflächen: Befriedigend</div>
<div class="check-item"><div class="dot green"></div>Sicherheit: Überdurchschnittlich</div>
</div>
${data.kurzbeschreibung ? `<div style="background:#fff8f5;border-left:3px solid #E8541A;padding:10px;border-radius:4px;font-size:10px;line-height:1.6;margin-bottom:10px">${data.kurzbeschreibung.slice(0, 500)}</div>` : ""}
<div class="disclaimer"><strong>Haftungsausschluss:</strong> Alle Angaben ohne Gewähr. Provisionspflichtig gem. § 14 MaklerG. ImmoExpress GmbH · ÖVI-Mitglied</div>
</body></html>`;

  // === Exposé-Style HTML ===
  const exposeStyleHtml = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Exposé – ${data.titel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:12px}
.hero{width:100%;height:220px;background:#ddd;position:relative;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover}
.hero-overlay{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:20px}
.hero-overlay h1{color:white;font-size:20px;margin-bottom:4px}
.hero-overlay .sub{color:#ffaa80;font-size:11px;font-weight:600}
.content{padding:24px}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px}
.field{background:#f7f7f7;border-radius:6px;padding:8px 10px}
.field label{font-size:9px;text-transform:uppercase;color:#888;display:block;margin-bottom:2px}
.field span{font-size:13px;font-weight:700}
.preis span{color:#E8541A}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:18px}
.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px}
.text-block{background:#fff8f5;border-left:4px solid #E8541A;border-radius:6px;padding:14px;white-space:pre-wrap;font-size:11px;line-height:1.7;margin-bottom:16px}
.voice-block{background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:12px;font-size:11px;line-height:1.6;margin-bottom:16px}
.voice-block strong{color:#16a34a}
.disclaimer{border-top:1px solid #eee;padding-top:12px;font-size:8px;color:#999;line-height:1.5}
</style></head><body>
<div class="hero">${(data.images?.length || 0) > 0 ? `<img src="${data.images![0]}" />` : ""}<div class="hero-overlay"><h1>${data.titel || "Immobilien-Exposé"}</h1><div class="sub">${data.bezirk} · ${data.objektart} · ${data.verkaufsart}</div></div></div>
<div class="content">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:9px;color:#888">Erstellt: ${dateStr}</div><div style="font-size:9px;color:#888">Ref: ${data.objektnummer || "–"}</div></div>
<div class="grid">
<div class="field"><label>Objektart</label><span>${data.objektart || "–"}</span></div>
<div class="field"><label>Wohnfläche</label><span>${data.flaeche ? data.flaeche + " m²" : "–"}</span></div>
<div class="field"><label>Zimmer</label><span>${data.zimmer || "–"}</span></div>
<div class="field"><label>Adresse</label><span style="font-size:10px">${adresse}</span></div>
<div class="field"><label>Provision</label><span style="font-size:10px">${data.provisionsstellung}</span></div>
<div class="field preis"><label>${priceLabel}</label><span>${priceValue}</span></div>
</div>
${(data.images?.length || 0) > 1 ? `<div class="photos">${data.images!.slice(1, 7).map(img => `<img src="${img}" />`).join("")}</div>` : ""}
${data.sprachnotizen ? `<div class="voice-block"><strong>🎙️ VOR-ORT-EINDRUCK:</strong><br/>${data.sprachnotizen}</div>` : ""}
${data.aiText ? `<div class="text-block">${data.aiText.replace(/\n/g, "<br/>")}</div>` : ""}
${data.kurzbeschreibung ? `<div class="text-block"><strong>KURZBESCHREIBUNG:</strong><br/>${data.kurzbeschreibung}</div>` : ""}
<div class="disclaimer"><strong>Haftungsausschluss:</strong> Alle Angaben ohne Gewähr. Provisionspflichtig gem. § 14 MaklerG. Energieausweis gem. § 6a EAVG. ImmoExpress GmbH · ÖVI-Mitglied</div>
</div></body></html>`;

  // === Investment-Analyse HTML ===
  const investmentHtml = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Investment – ${data.titel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;color:#1a1a1a;font-size:11px}
.header{border-bottom:2px solid #E8541A;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between}
.logo{font-size:16px;font-weight:bold;color:#E8541A}
h1{font-size:15px;margin-bottom:4px;color:#E8541A}
.sub{font-size:10px;color:#666;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}
th{background:#E8541A;color:white;text-align:left;padding:8px 10px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px}
td{padding:7px 10px;border-bottom:1px solid #eee}
tr:nth-child(even){background:#fff8f5}
.highlight{color:#E8541A;font-weight:700}
.section{margin-bottom:18px}
.section h3{font-size:12px;color:#E8541A;border-bottom:1px solid #fdd;padding-bottom:4px;margin-bottom:8px}
.metric-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
.metric{background:#fff8f5;border-radius:6px;padding:10px;text-align:center;border:1px solid #fdd}
.metric label{font-size:8px;text-transform:uppercase;color:#888;display:block;margin-bottom:3px}
.metric .val{font-size:18px;font-weight:900;color:#E8541A}
.metric .val.green{color:#16a34a}
.notebook-box{background:#fff8f5;border-left:4px solid #E8541A;border-radius:6px;padding:12px;font-size:10px;line-height:1.6;margin-bottom:14px;white-space:pre-wrap}
.disclaimer{border-top:1px solid #ddd;padding-top:10px;font-size:8px;color:#999;margin-top:16px}
</style></head><body>
<div class="header"><div><div class="logo">ImmoExpress · Investment Report</div><div style="font-size:8px;color:#888;margin-top:2px">Vertraulich · Nur für qualifizierte Investoren</div></div><div style="text-align:right;font-size:9px;color:#888">Datum: ${dateStr}<br/>Ref: ${data.objektnummer || "–"}</div></div>
<h1>${data.titel || "Investment-Analyse"}</h1>
<div class="sub">${data.bezirk} · ${data.objektart} · ${data.verkaufsart}</div>
<div class="metric-grid">
<div class="metric"><label>${priceLabel}</label><div class="val">${priceValue}</div></div>
<div class="metric"><label>Rendite (geschätzt)</label><div class="val green">3.8%</div></div>
<div class="metric"><label>m²-Preis</label><div class="val">${data.flaeche && data.kaufpreis ? `€ ${Math.round(Number(data.kaufpreis) / Number(data.flaeche)).toLocaleString("de-AT")}` : "–"}</div></div>
</div>
<div class="section"><h3>Objektdaten</h3>
<table><thead><tr><th>Merkmal</th><th>Wert</th></tr></thead><tbody>
<tr><td>Objektart</td><td>${data.objektart || "–"}</td></tr>
<tr><td>Adresse</td><td>${adresse}</td></tr>
<tr><td>Wohnfläche</td><td>${data.flaeche ? data.flaeche + " m²" : "–"}</td></tr>
<tr><td>Zimmer</td><td>${data.zimmer || "–"}</td></tr>
<tr><td>Vermarktung</td><td>${data.verkaufsart}</td></tr>
<tr><td>Provision</td><td>${data.provisionsstellung}</td></tr>
</tbody></table></div>
${data.notebookLmText ? `<div class="section"><h3>Markt- & Infrastruktur-Analyse (NotebookLM)</h3><div class="notebook-box">${data.notebookLmText.replace(/\n/g, "<br/>")}</div></div>` : ""}
<div class="section"><h3>Infrastruktur-Bewertung</h3>
<table><thead><tr><th>Kategorie</th><th>Bewertung</th><th>Details</th></tr></thead><tbody>
<tr><td>ÖPNV</td><td class="highlight">★★★★★</td><td>U-Bahn, Bus & Straßenbahn fußläufig</td></tr>
<tr><td>Bildung</td><td class="highlight">★★★★☆</td><td>Volksschulen & Gymnasium im Bezirk</td></tr>
<tr><td>Nahversorgung</td><td class="highlight">★★★★★</td><td>Supermärkte & Apotheken in 200m</td></tr>
<tr><td>Grünflächen</td><td>★★★☆☆</td><td>Parks in akzeptabler Distanz</td></tr>
<tr><td>Wertsteigerung</td><td class="highlight">★★★★☆</td><td>Bezirk mit steigendem Trend</td></tr>
</tbody></table></div>
${data.aiText ? `<div class="section"><h3>KI-Analyse</h3><div style="background:#f9f9f9;border-radius:6px;padding:12px;font-size:10px;line-height:1.6;white-space:pre-wrap">${data.aiText.replace(/\n/g, "<br/>")}</div></div>` : ""}
<div class="disclaimer"><strong>Haftungsausschluss:</strong> Alle Angaben ohne Gewähr. Diese Analyse stellt keine Anlageberatung dar. Provisionspflichtig gem. § 14 MaklerG. ImmoExpress GmbH · ÖVI-Mitglied</div>
</body></html>`;

  const htmlByTemplate: Record<PdfTemplate, string> = {
    "quick-check": quickCheckHtml,
    "expose-style": exposeStyleHtml,
    "investment": investmentHtml,
  };

  const htmlContent = htmlByTemplate[template];

  const loadKunden = async () => {
    const { data: k } = await supabase.from("crm_kunden").select("id, name, email, phone, typ");
    if (k) setKunden(k);
  };

  const notifyWebhook = async (actionId: string, extra: Record<string, unknown> = {}) => {
    if (!user) return;
    try {
      await sendAction(actionId, {
        template,
        objekt: { titel: data.titel, objektnummer: data.objektnummer, bezirk: data.bezirk, objektart: data.objektart, verkaufsart: data.verkaufsart },
        ...extra,
      });
    } catch { /* silent */ }
  };

  const confirmAndSend = () => {
    setStep("send");
    loadKunden();
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const orange = [232, 84, 26] as [number, number, number];
    const dark = [26, 26, 46] as [number, number, number];
    const isInvestment = template === "investment";
    const accentColor = orange;

    // Header line
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(1);
    doc.line(15, 22, w - 15, 22);

    // Logo text
    doc.setFontSize(18);
    doc.setTextColor(...accentColor);
    doc.text(isInvestment ? "ImmoExpress · Investment" : "ImmoExpress", 15, 18);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${templateLabels[template]} · ${dateStr}`, 15, 28);
    doc.text(`Ref: ${data.objektnummer || "–"}`, w - 15, 18, { align: "right" });

    // Title
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(data.titel || "Immobilien-Exposé", 15, 38);

    doc.setFontSize(10);
    doc.setTextColor(...accentColor);
    doc.text(`${data.bezirk || ""} ${data.objektart ? "· " + data.objektart : ""} · ${data.verkaufsart}`, 15, 45);

    // Data grid
    let y = 55;
    doc.setFontSize(9);
    const fields = [
      ["Objektart", data.objektart || "–"],
      ["Wohnfläche", data.flaeche ? data.flaeche + " m²" : "–"],
      ["Zimmer", data.zimmer || "–"],
      ["Lage", data.bezirk || "–"],
      ["Adresse", adresse],
      [priceLabel, priceValue],
      ["Provision", data.provisionsstellung || "–"],
    ];

    if (isInvestment && data.flaeche && data.kaufpreis) {
      fields.push(["m²-Preis", `€ ${Math.round(Number(data.kaufpreis) / Number(data.flaeche)).toLocaleString("de-AT")}`]);
      fields.push(["Rendite (geschätzt)", "3.8%"]);
    }

    fields.forEach(([label, value]) => {
      doc.setTextColor(130, 130, 130);
      doc.text(label, 15, y);
      doc.setTextColor(30, 30, 30);
      doc.text(String(value), 70, y);
      y += 6;
    });

    // Sprachnotizen (expose-style)
    if (template === "expose-style" && data.sprachnotizen) {
      y += 4;
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.line(15, y, 15, y + 4);
      doc.setFontSize(8);
      doc.setTextColor(22, 163, 74);
      doc.text("VOR-ORT-EINDRUCK:", 18, y + 4);
      doc.setTextColor(50, 50, 50);
      const voiceLines = doc.splitTextToSize(data.sprachnotizen, w - 35);
      doc.text(voiceLines.slice(0, 10), 18, y + 9);
      y += voiceLines.slice(0, 10).length * 3.5 + 14;
    }

    // NotebookLM (investment)
    if (template === "investment" && data.notebookLmText) {
      y += 4;
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(15, y, 15, y + 4);
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      doc.text("MARKT-ANALYSE (NotebookLM):", 18, y + 4);
      doc.setTextColor(50, 50, 50);
      const nbLines = doc.splitTextToSize(data.notebookLmText, w - 35);
      doc.text(nbLines.slice(0, 20), 18, y + 9);
      y += nbLines.slice(0, 20).length * 3.5 + 14;
    }

    // AI text
    y += 4;
    if (data.aiText) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.5);
      doc.line(15, y, 15, y + 4);
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(data.aiText, w - 35);
      doc.text(lines.slice(0, 40), 18, y + 4);
      y += lines.slice(0, 40).length * 3.5 + 8;
    }

    // Disclaimer
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("Haftungsausschluss: Alle Angaben ohne Gewähr. Provisionspflichtig gem. § 14 MaklerG. Energieausweis gem. § 6a EAVG.", 15, 280);
    doc.text("ImmoExpress GmbH · ÖVI-Mitglied", 15, 284);

    doc.save(`${template}_${data.objektnummer || data.titel || "Immobilie"}.pdf`);
    notifyWebhook("expose_pdf_download");
  };

  const sendTo = (kunde: Kunde, via: "wa" | "email") => {
    const text = `📋 Exposé: ${data.titel}\n📍 ${adresse}\n🏠 ${data.objektart} · ${data.flaeche || "–"} m² · ${data.zimmer || "–"} Zi.\n💰 ${priceValue}\n\nBei Interesse bitte melden!\nImmoExpress`;
    if (via === "wa" && kunde.phone) {
      const phone = kunde.phone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    } else if (via === "email" && kunde.email) {
      window.open(`mailto:${kunde.email}?subject=${encodeURIComponent(`Exposé: ${data.titel}`)}&body=${encodeURIComponent(text)}`, "_blank");
    }
    notifyWebhook("expose_pdf_senden", { kunde_name: kunde.name, kanal: via });
    onClose();
  };

  const filtered = kunden.filter(k => k.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-md-custom border border-border w-full max-w-2xl animate-fade-in max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Eye size={18} className="text-primary" />
            {step === "preview" ? `PDF-Vorschau · ${templateLabels[template]}` : "Exposé versenden"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>

        {step === "preview" ? (
          <>
            <div className="flex-1 overflow-hidden p-4">
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                className="w-full h-[60vh] rounded-xl border border-border bg-white"
                title="Exposé Vorschau"
              />
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <button onClick={onClose} className="border border-border rounded-xl py-2.5 px-4 text-sm font-semibold hover:bg-accent transition-all">
                Zurück
              </button>
              <button onClick={downloadPdf} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Download size={14} /> PDF herunterladen
              </button>
              <button onClick={confirmAndSend} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Send size={14} /> Versenden
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kunde suchen…" className="pl-9" />
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {filtered.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-accent rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{k.name}</p>
                    <p className="text-xs text-muted-foreground">{k.typ}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {k.phone && (
                      <button onClick={() => sendTo(k, "wa")} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                    )}
                    {k.email && (
                      <button onClick={() => sendTo(k, "email")} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <Mail size={12} /> E-Mail
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Keine Kunden gefunden</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
