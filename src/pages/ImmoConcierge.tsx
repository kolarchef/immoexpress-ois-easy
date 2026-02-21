import { useState, useEffect } from "react";
import { KeyRound, CheckCircle2, Circle, ExternalLink, MessageCircle, Mail, Gift, Phone, CalendarPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Kunde {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  ort: string | null;
}

const checkliste = [
  { kategorie: "Meldewesen", items: [
    { text: "Meldezettel – An-/Abmeldung beim Magistrat", link: "https://www.wien.gv.at/amtshelfer/dokumente/verwaltung/meldeservice/anmeldung.html", typ: "versand" },
    { text: "Parkpickerl beantragen (falls Wien)", link: "https://www.wien.gv.at/amtshelfer/verkehr/parken/kurzparkzone/parkpickerl.html", typ: "versand" },
  ]},
  { kategorie: "Versorgung & Versicherung", items: [
    { text: "Strom anmelden / Zählerstand ablesen", link: null, typ: "versand" },
    { text: "Gas anmelden / Zählerstand ablesen", link: null, typ: "versand" },
    { text: "Internet & Telefon anmelden", link: null, typ: "versand" },
    { text: "Haushaltsversicherung abschließen", link: null, typ: "versand" },
    { text: "Gebäudeversicherung prüfen (bei Kauf)", link: null, typ: "versand" },
  ]},
  { kategorie: "Behörden & Verträge", items: [
    { text: "Grundbucheintragung überprüfen", link: null, typ: "versand" },
    { text: "Finanzamt – Grunderwerbsteuer", link: null, typ: "versand" },
    { text: "Schlüsselübergabeprotokoll erstellen", link: null, typ: "versand" },
  ]},
  { kategorie: "After-Sales", items: [
    { text: "Google-Bewertung vom Kunden erbitten", link: "https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID", typ: "versand" },
    { text: "Dankeskarte / Geschenk senden", link: null, typ: "kalender" },
    { text: "Follow-up Anruf nach 2 Wochen", link: null, typ: "followup" },
  ]},
];

export default function ImmoConcierge() {
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [selectedKunde, setSelectedKunde] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("crm_kunden").select("id, name, phone, email, ort").then(({ data }) => {
      if (data) setKunden(data);
    });
  }, [user]);

  const kunde = kunden.find(k => k.id === selectedKunde);

  const toggle = (key: string) => {
    setDone(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const sendWhatsApp = (text: string) => {
    if (!kunde?.phone) { toast({ title: "Keine Telefonnummer hinterlegt", variant: "destructive" }); return; }
    const phone = kunde.phone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
    const msg = encodeURIComponent(`Hallo ${kunde.name},\n\n${text}\n\nBei Fragen stehe ich gerne zur Verfügung!\nIhr ImmoExpress-Team`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const sendEmail = (text: string) => {
    if (!kunde?.email) { toast({ title: "Keine E-Mail-Adresse hinterlegt", variant: "destructive" }); return; }
    const subject = encodeURIComponent("Immo-Concierge: Info für Sie");
    const body = encodeURIComponent(`Hallo ${kunde.name},\n\n${text}\n\nBei Fragen stehe ich gerne zur Verfügung!\nIhr ImmoExpress-Team`);
    window.open(`mailto:${kunde.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const createTermin = async (titel: string, inTagen: number) => {
    if (!user) return;
    const datum = new Date();
    datum.setDate(datum.getDate() + inTagen);
    const notiz = kunde ? `Kunde: ${kunde.name}${kunde.phone ? ` | Tel: ${kunde.phone}` : ""}${kunde.ort ? ` | ${kunde.ort}` : ""}` : "";

    const { error } = await supabase.from("termine").insert({
      user_id: user.id,
      titel,
      datum: datum.toISOString().slice(0, 10),
      uhrzeit: "10:00",
      dauer_min: 30,
      ort: kunde?.ort || "",
      typ: "concierge",
      notiz,
      kunde_id: kunde?.id || null,
    });

    if (error) {
      toast({ title: "Fehler beim Erstellen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✅ Termin erstellt`, description: `${titel} am ${datum.toLocaleDateString("de-AT")}` });
    }
  };

  const toggleSelected = (key: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const getSelectedVersandTexts = () => {
    const texts: string[] = [];
    checkliste.forEach(({ items }) => {
      items.forEach(item => {
        if (item.typ === "versand" && selected.has(item.text)) {
          texts.push(`• ${item.text}`);
        }
      });
    });
    return texts;
  };

  const sendBatch = (via: "whatsapp" | "email") => {
    const texts = getSelectedVersandTexts();
    if (texts.length === 0) {
      toast({ title: "Keine Punkte ausgewählt", description: "Bitte wähle mindestens einen Versand-Punkt aus.", variant: "destructive" });
      return;
    }
    const body = `hier sind die gesammelten Informationen für Ihren Einzug:\n\n${texts.join("\n")}\n\nBitte kümmern Sie sich bei Gelegenheit um die genannten Punkte.`;
    if (via === "whatsapp") sendWhatsApp(body);
    if (via === "email") sendEmail(body);
  };

  const handleItemAction = (item: typeof checkliste[0]["items"][0], actionType: "whatsapp" | "email" | "click") => {
    if (item.typ === "kalender") {
      createTermin(`🎁 ${item.text}${kunde ? ` – ${kunde.name}` : ""}`, 3);
      return;
    }
    if (item.typ === "followup") {
      createTermin(`📞 Follow-up${kunde ? `: ${kunde.name}` : ""}`, 14);
      return;
    }

    if (actionType === "whatsapp") sendWhatsApp(item.text);
    if (actionType === "email") sendEmail(item.text);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in" style={{ paddingBottom: 200 }}>
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <KeyRound size={22} className="text-primary" /> ImmoExpress-Concierge
      </h1>
      <p className="text-sm text-muted-foreground">After-Sales Checkliste für deine Kunden</p>

      {/* Kunden-Auswahl */}
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border">
        <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Kunde auswählen</label>
        <Select value={selectedKunde} onValueChange={setSelectedKunde}>
          <SelectTrigger>
            <SelectValue placeholder="Kunde wählen (aus CRM)" />
          </SelectTrigger>
          <SelectContent>
            {kunden.map(k => (
              <SelectItem key={k.id} value={k.id}>
                {k.name}{k.ort ? ` – ${k.ort}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {kunde && (
          <div className="mt-2 text-xs text-muted-foreground space-x-3">
            {kunde.phone && <span>📱 {kunde.phone}</span>}
            {kunde.email && <span>✉️ {kunde.email}</span>}
          </div>
        )}
      </div>

      {checkliste.map(({ kategorie, items }) => (
        <section key={kategorie} className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <h2 className="font-bold text-foreground mb-3">{kategorie}</h2>
          <div className="space-y-2">
            {items.map(item => {
              const key = `${kategorie}-${item.text}`;
              const isDone = done.has(key);
              const isKalender = item.typ === "kalender" || item.typ === "followup";
              const isVersand = item.typ === "versand";

              return (
                <div key={key} className={`rounded-xl transition-all ${isDone ? "bg-muted opacity-60" : "bg-accent"}`}>
                  <div className="flex items-center gap-3 p-3">
                    {/* Checkbox for batch selection (versand only) */}
                    {isVersand && !isDone && (
                      <Checkbox
                        checked={selected.has(item.text)}
                        onCheckedChange={() => toggleSelected(item.text)}
                        className="flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                    )}

                    <div
                      onClick={() => {
                        toggle(key);
                        if (isKalender && !isDone) handleItemAction(item, "click");
                      }}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      {isDone ? <CheckCircle2 size={18} className="text-primary flex-shrink-0" /> : <Circle size={18} className="text-muted-foreground flex-shrink-0" />}
                      <span className={`text-sm flex-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</span>
                    </div>

                    {isKalender && (
                      <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                        <CalendarPlus size={12} /> {item.typ === "followup" ? "+14 Tage" : "Termin"}
                      </span>
                    )}

                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {/* Einzel-Versand-Buttons */}
                  {!isDone && isVersand && (
                    <div className="flex gap-2 px-3 pb-3">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleItemAction(item, "whatsapp")}>
                        <MessageCircle size={12} className="mr-1" /> WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleItemAction(item, "email")}>
                        <Mail size={12} className="mr-1" /> E-Mail
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Sammelversand-Button */}
      {selected.size > 0 && (
        <div className="bg-card rounded-2xl p-5 shadow-card border border-primary/30 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Send size={16} className="text-primary" />
            {selected.size} Punkt{selected.size > 1 ? "e" : ""} ausgewählt – gesammelt senden
          </p>
          <div className="flex gap-3">
            <Button size="sm" onClick={() => sendBatch("whatsapp")} className="flex-1">
              <MessageCircle size={14} className="mr-1" /> Via WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendBatch("email")} className="flex-1">
              <Mail size={14} className="mr-1" /> Via E-Mail
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
