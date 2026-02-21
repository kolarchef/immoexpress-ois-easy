import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare, Calendar, MapPin, Clock,
  Users, Building2, ShieldAlert, GraduationCap,
  ShoppingCart, FileText, Mail, ArrowLeftRight,
  Video, Clipboard, Link as LinkIcon, Copy, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const modules = [
  { label: "KUNDEN", icon: Users, path: "/crm", color: "bg-primary-light text-primary" },
  { label: "OBJEKTE", icon: Building2, path: "/objekte", color: "bg-primary-light text-primary" },
  { label: "EXPOSÉ", icon: FileText, path: "/expose", color: "bg-primary-light text-primary" },
  { label: "STANDORT", icon: MapPin, path: "/standort", color: "bg-primary-light text-primary" },
  { label: "LEGAL", icon: ShieldAlert, path: "/sos-recht", color: "bg-primary-light text-primary" },
  { label: "MEETINGS", icon: Video, path: "/kalender", color: "bg-primary-light text-primary" },
  { label: "MAIL", icon: Mail, path: "/newsletter", color: "bg-primary-light text-primary" },
  { label: "LEARNING", icon: GraduationCap, path: "/academy", color: "bg-primary-light text-primary" },
  { label: "MANUAL", icon: Clipboard, path: "/bestellung", color: "bg-primary-light text-primary" },
];

const todos = [
  { id: 1, text: "Alleinvermittlungsvertrag Mayer unterzeichnen lassen", done: false, prio: "hoch" },
  { id: 2, text: "Exposé für Penthouse 1010 Wien finalisieren", done: false, prio: "mittel" },
  { id: 3, text: "Nebenkostenübersicht für Müller vorbereiten", done: true, prio: "niedrig" },
  { id: 4, text: "Finanzamt-Gebühren Kaufvertrag Schober berechnen", done: false, prio: "hoch" },
  { id: 5, text: "Rückruf KlientIn Schmidt (0664 123 4567)", done: false, prio: "mittel" },
];

const appointments = [
  { time: "10:30", duration: "60 MIN", title: "Villa Seeufer Besichtigung", location: "Am See 14, Berlin", type: "besichtigung" },
  { time: "14:00", duration: "30 MIN", title: "Notartermin: Müller & Partner", location: "Beurkundung CRM", type: "notar" },
];

const unterlagenItems = [
  { key: "strom", label: "Strom-Foto (Zählerstand)" },
  { key: "wasser", label: "Wasserzähler" },
  { key: "reisepass", label: "Reisepass / Ausweis" },
  { key: "mietvertrag", label: "Mietvertrag" },
  { key: "grundbuch", label: "Grundbuchauszug" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [kundeName, setKundeName] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const toggleCheck = (key: string) => setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCreateLink = async () => {
    const selected = Object.entries(checkedItems).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) {
      toast({ title: "Bitte mindestens ein Dokument auswählen", variant: "destructive" });
      return;
    }
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase.from("unterlagen_anfragen").insert({
        kunde_name: kundeName || "Kunde",
        checkliste: selected,
      }).select().single();
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

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Jahresumsatz Card */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Jahresumsatz (YTD)</p>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">€452.000</span>
            <span className="text-sm font-semibold text-primary">↗ 12.4%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center">
            <ArrowLeftRight size={22} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Heutige Termine */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Heutige Termine</h2>
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Clock size={12} className="text-primary" /> CLOUD SYNC
          </span>
        </div>
        <div className="space-y-3">
          {appointments.map((apt, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-card border border-border flex gap-4 items-center">
              <div className="flex-shrink-0 text-left">
                <div className="font-bold text-primary text-base">{apt.time}</div>
                <div className="text-xs text-muted-foreground">{apt.duration}</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground">{apt.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {apt.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Grid – Stitch Style 3x3 */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-3">Module</h2>
        <div className="grid grid-cols-3 gap-3">
          {modules.map(({ label, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card shadow-card border border-border hover:shadow-card-hover transition-all group"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${color}`}>
                <Icon size={22} />
              </div>
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Meetings & Unterlagen */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Clipboard size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Meetings & Unterlagen</h2>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kundenname</label>
          <input
            className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="z.B. Maria Huber"
            value={kundeName}
            onChange={(e) => setKundeName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {unterlagenItems.map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-accent border border-border cursor-pointer hover:bg-secondary transition-all">
              <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${checkedItems[item.key] ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                {checkedItems[item.key] && <CheckCircle size={12} className="text-primary-foreground" />}
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleCreateLink}
          disabled={generatingLink}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <LinkIcon size={16} /> Anforderungs-Link erstellen
        </button>

        {generatedLink && (
          <div className="bg-accent rounded-xl p-3 border border-border flex items-center gap-2">
            <input className="flex-1 bg-transparent text-xs text-foreground truncate" readOnly value={generatedLink} />
            <button onClick={copyLink} className="flex-shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all">
              <Copy size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
