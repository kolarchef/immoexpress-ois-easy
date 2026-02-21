import { useState, useRef } from "react";
import { X, Send, MessageCircle, Mail, Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

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
}

export default function ExposePreviewModal({ open, onClose, data }: Props) {
  const [step, setStep] = useState<"preview" | "send">("preview");
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [search, setSearch] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!open) return null;

  const htmlContent = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"/><title>Exposé – ${data.titel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;font-size:13px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #E8541A;padding-bottom:14px;margin-bottom:20px}
.logo{font-size:20px;font-weight:bold;color:#E8541A}
.logo-sub{font-size:10px;color:#888;margin-top:2px}
h1{font-size:18px;margin-bottom:4px}
.subtitle{color:#E8541A;font-size:12px;font-weight:600;margin-bottom:16px}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px}
.field{background:#f7f7f7;border-radius:6px;padding:8px 10px}
.field label{font-size:9px;text-transform:uppercase;color:#888;display:block;margin-bottom:2px}
.field span{font-size:13px;font-weight:700}
.preis span{color:#E8541A}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:16px}
.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px}
.ai-box{background:#fff8f5;border-left:4px solid #E8541A;border-radius:6px;padding:14px;white-space:pre-wrap;font-size:11px;line-height:1.7;margin-bottom:16px}
.disclaimer{border-top:1px solid #eee;padding-top:12px;font-size:9px;color:#999;line-height:1.5}
</style></head><body>
<div class="header"><div><div class="logo">ImmoExpress</div><div class="logo-sub">Ihr Makler in Wien & Österreich</div></div>
<div style="text-align:right;font-size:10px;color:#888">Erstellt: ${new Date().toLocaleDateString("de-AT")}<br/>Ref: ${data.objektnummer || "–"}</div></div>
<h1>${data.titel || "Immobilien-Exposé"}</h1>
<div class="subtitle">${data.bezirk || ""} ${data.objektart ? "· " + data.objektart : ""} · ${data.verkaufsart}</div>
${(data.images?.length || 0) > 0 ? `<div class="photos">${data.images!.slice(0, 6).map(img => `<img src="${img}" />`).join("")}</div>` : ""}
<div class="grid">
<div class="field"><label>Objektart</label><span>${data.objektart || "–"}</span></div>
<div class="field"><label>Wohnfläche</label><span>${data.flaeche ? data.flaeche + " m²" : "–"}</span></div>
<div class="field"><label>Zimmer</label><span>${data.zimmer || "–"}</span></div>
<div class="field"><label>Lage</label><span>${data.bezirk || "–"}</span></div>
<div class="field"><label>Provision</label><span>${data.provisionsstellung}</span></div>
<div class="field preis"><label>${data.verkaufsart === "Kauf" ? "Kaufpreis" : "Miete"}</label><span>€ ${data.verkaufsart === "Kauf" ? (data.kaufpreis ? Number(data.kaufpreis).toLocaleString("de-AT") : "auf Anfrage") : (data.miete ? Number(data.miete).toLocaleString("de-AT") : "auf Anfrage")}</span></div>
</div>
${data.kurzbeschreibung ? `<div class="ai-box"><strong>KURZBESCHREIBUNG:</strong><br/>${data.kurzbeschreibung}</div>` : ""}
${data.aiText ? `<div class="ai-box">${data.aiText.replace(/\n/g, "<br/>")}</div>` : ""}
<div class="disclaimer"><strong>Haftungsausschluss:</strong> Alle Angaben ohne Gewähr. Provisionspflichtig gemäß § 14 MaklerG. Energieausweis gem. § 6a EAVG. ImmoExpress GmbH · ÖVI-Mitglied</div>
</body></html>`;

  const loadKunden = async () => {
    const { data: k } = await supabase.from("crm_kunden").select("id, name, email, phone, typ");
    if (k) setKunden(k);
  };

  const confirmAndSend = () => {
    setStep("send");
    loadKunden();
  };

  const sendTo = (kunde: Kunde, via: "wa" | "email") => {
    const text = `📋 Exposé: ${data.titel}\n📍 ${data.strasse || ""} ${data.hnr || ""}, ${data.plz || ""} ${data.bezirk}\n🏠 ${data.objektart} · ${data.flaeche || "–"} m² · ${data.zimmer || "–"} Zi.\n💰 €${data.kaufpreis ? Number(data.kaufpreis).toLocaleString("de-AT") : "auf Anfrage"}\n\nBei Interesse bitte melden!\nImmoExpress`;
    if (via === "wa" && kunde.phone) {
      const phone = kunde.phone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    } else if (via === "email" && kunde.email) {
      window.open(`mailto:${kunde.email}?subject=${encodeURIComponent(`Exposé: ${data.titel}`)}&body=${encodeURIComponent(text)}`, "_blank");
    }
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
            {step === "preview" ? "PDF-Vorschau" : "Exposé versenden"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>

        {step === "preview" ? (
          <>
            {/* PDF Preview */}
            <div className="flex-1 overflow-hidden p-4">
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                className="w-full h-[60vh] rounded-xl border border-border bg-white"
                title="Exposé Vorschau"
              />
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-accent transition-all">
                Zurück
              </button>
              <button onClick={confirmAndSend} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold shadow-orange hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Send size={14} /> Bestätigen & Versenden
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
