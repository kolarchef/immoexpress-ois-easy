import { useState } from "react";
import {
  FolderPlus, Link as LinkIcon, Copy, CheckCircle, MessageCircle, Mail
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const categories: Record<string, { label: string; items: { key: string; label: string }[] }> = {
  kaeufer_wohnung: {
    label: "Käufer Wohnung",
    items: [
      { key: "reisepass", label: "Reisepass / Ausweis" },
      { key: "meldezettel", label: "Meldezettel" },
      { key: "finanzierungszusage", label: "Finanzierungszusage" },
      { key: "kaufanbot", label: "Kaufanbot (unterschrieben)" },
      { key: "grundbuch_wohnung", label: "Grundbuchauszug" },
    ],
  },
  kaeufer_haus: {
    label: "Käufer Haus",
    items: [
      { key: "reisepass_haus", label: "Reisepass / Ausweis" },
      { key: "meldezettel_haus", label: "Meldezettel" },
      { key: "finanzierungszusage_haus", label: "Finanzierungszusage" },
      { key: "kaufanbot_haus", label: "Kaufanbot (unterschrieben)" },
      { key: "grundbuch_haus", label: "Grundbuchauszug" },
      { key: "baubewilligung", label: "Baubewilligung" },
    ],
  },
  mieten: {
    label: "Mieten",
    items: [
      { key: "reisepass_miete", label: "Reisepass / Ausweis" },
      { key: "lohnzettel_miete", label: "Lohnzettel (letzte 3 Monate)" },
      { key: "mietvertrag", label: "Mietvertrag (unterschrieben)" },
      { key: "kaution_nachweis", label: "Kautionsnachweis" },
      { key: "strom_foto_miete", label: "Strom-Foto (Zählerstand)" },
      { key: "wasser_miete", label: "Wasserzähler-Foto" },
    ],
  },
  vk_etw: {
    label: "VK Eigentum",
    items: [
      { key: "grundbuch_vk_etw", label: "Grundbuchauszug" },
      { key: "bk_vorschreibung", label: "Monatl. Betriebskosten-Vorschreibung" },
      { key: "jahresabrechnung", label: "Jahresabrechnung" },
      { key: "plan_etw", label: "Plan" },
      { key: "we_vertrag", label: "Wohnungseigentumsvertrag" },
      { key: "hauseigentümerprotokoll", label: "Letztes Hauseigentümerprotokoll" },
      { key: "energieausweis_etw", label: "Energieausweis" },
      { key: "reparaturruecklage", label: "Reparaturrücklagen-Stand" },
      { key: "wohnbaufoerderung_etw", label: "Wohnbauförderung" },
      { key: "wasser_etw", label: "Wasserstand Foto" },
      { key: "strom_etw", label: "Stromzähler Foto" },
      { key: "gas_etw", label: "Gasstand Foto" },
      { key: "vollmacht_etw", label: "Vollmacht (Amt)" },
      { key: "parifizierung_etw", label: "Parifizierung" },
    ],
  },
  vk_haus: {
    label: "VK Haus",
    items: [
      { key: "grundbuch_vk_haus", label: "Grundbuchauszug" },
      { key: "benuetzungsbewilligung", label: "Benützungsbewilligung / Fertigstellungsanzeige" },
      { key: "befunde", label: "Befunde (Kanal, Strom, Kamin, Gas)" },
      { key: "baubeschreibung", label: "Bau-/Ausstattungsbeschreibung" },
      { key: "einreichplan", label: "Einreichplan" },
      { key: "energieausweis_haus", label: "Energieausweis" },
      { key: "betriebskosten_haus", label: "Betriebskosten (Abgaben, Wasser, Müll)" },
      { key: "wohnbaufoerderung_haus", label: "Wohnbauförderung (Annuitätenplan)" },
      { key: "vollmacht_haus", label: "Vollmacht (Amt)" },
      { key: "immoest", label: "Immobilienertragssteuer (ImmoESt)" },
      { key: "parifizierung_haus", label: "Parifizierung" },
      { key: "plan_haus", label: "Plan" },
      { key: "wasser_haus", label: "Wasserstand Foto" },
      { key: "strom_haus", label: "Stromstand Foto" },
      { key: "gas_haus", label: "Gasstand Foto" },
    ],
  },
  finanzierungen: {
    label: "Finanzierung",
    items: [
      { key: "lohnzettel_fin", label: "Lohnzettel (letzte 3 Monate)" },
      { key: "kontoauszuege", label: "Kontoauszüge (letzte 3 Monate)" },
      { key: "steuerbescheid", label: "Einkommensteuerbescheid" },
      { key: "kreditvertrag", label: "Bestehende Kreditverträge" },
      { key: "reisepass_fin", label: "Reisepass / Ausweis" },
      { key: "eigenkapital", label: "Eigenkapitalnachweis" },
    ],
  },
};

export default function Unterlagen() {
  const [activeTab, setActiveTab] = useState("kaeufer_wohnung");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [kundeName, setKundeName] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const toggleCheck = (key: string) =>
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCreateLink = async () => {
    const selected = Object.entries(checkedItems)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (selected.length === 0) {
      toast({ title: "Bitte mindestens ein Dokument auswählen", variant: "destructive" });
      return;
    }
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase
        .from("unterlagen_anfragen")
        .insert({ kunde_name: kundeName || "Kunde", checkliste: selected })
        .select()
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/upload?token=${data.token}`;
      setGeneratedLink(link);
      toast({ title: "✓ Link erstellt", description: "Der Anforderungs-Link wurde generiert." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "✓ In Zwischenablage kopiert" });
  };

  const shareWhatsApp = () => {
    const text = `Hallo ${kundeName || ""},\n\nbitte laden Sie die benötigten Unterlagen über folgenden Link hoch:\n${generatedLink}\n\nVielen Dank!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = () => {
    const subject = `Unterlagen-Anforderung – ${kundeName || "Immobilientransaktion"}`;
    const body = `Sehr geehrte/r ${kundeName || "Kunde/Kundin"},\n\nbitte laden Sie die benötigten Unterlagen über folgenden Link hoch:\n${generatedLink}\n\nMit freundlichen Grüßen`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <FolderPlus size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">Unterlagen-Anforderung</h1>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        {/* Kundenname */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Kundenname
          </label>
          <input
            className="mt-1 w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="z.B. Maria Huber"
            value={kundeName}
            onChange={(e) => setKundeName(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCheckedItems({}); setGeneratedLink(""); }}>
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-xl">
            {Object.entries(categories).map(([key, cat]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="text-[11px] px-2 py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(categories).map(([key, cat]) => (
            <TabsContent key={key} value={key} className="space-y-2 mt-4">
              {cat.items.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-accent border border-border cursor-pointer hover:bg-secondary transition-all"
                >
                  <div
                    onClick={() => toggleCheck(item.key)}
                    className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${
                      checkedItems[item.key]
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {checkedItems[item.key] && (
                      <CheckCircle size={12} className="text-primary-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </label>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Create Link */}
        <button
          onClick={handleCreateLink}
          disabled={generatingLink}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <LinkIcon size={16} /> Anforderungs-Link erstellen
        </button>

        {generatedLink && (
          <div className="space-y-3">
            <div className="bg-accent rounded-xl p-3 border border-border flex items-center gap-2">
              <input
                className="flex-1 bg-transparent text-xs text-foreground truncate"
                readOnly
                value={generatedLink}
              />
              <button
                onClick={copyLink}
                className="flex-shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                <Copy size={14} />
              </button>
            </div>
            {/* Quick-Send Buttons */}
            <div className="flex gap-2">
              <button
                onClick={shareWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[hsl(142,70%,40%)] text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95"
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button
                onClick={shareEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-foreground border border-border text-sm font-semibold hover:bg-secondary transition-all active:scale-95"
              >
                <Mail size={16} /> E-Mail
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
