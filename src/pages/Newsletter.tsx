import { useState } from "react";
import { Mail, Users, Shield, Plus, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const initialSubscribers = [
  { id: 1, name: "Maria Gruber", email: "m.gruber@example.at", liste: "Käufer Wien", status: "aktiv" },
  { id: 2, name: "Thomas Bauer", email: "t.bauer@example.at", liste: "Investoren Österreich", status: "aktiv" },
  { id: 3, name: "Sandra Hofer", email: "s.hofer@example.at", liste: "Mieter Graz", status: "aktiv" },
  { id: 4, name: "Klaus Müller", email: "k.mueller@example.at", liste: "Käufer Wien", status: "abgemeldet" },
  { id: 5, name: "Eva Steiner", email: "e.steiner@example.at", liste: "Investoren Österreich", status: "aktiv" },
];

const kampagnen = [
  { datum: "15.02.2026", betreff: "Neue Objekte in Wien – Februar 2026", empfaenger: 312, oeffnungsrate: "71%" },
  { datum: "01.02.2026", betreff: "Immobilienmarkt-Update Q1 2026", empfaenger: 298, oeffnungsrate: "65%" },
  { datum: "15.01.2026", betreff: "Jahresrückblick & Top-Angebote 2025", empfaenger: 285, oeffnungsrate: "74%" },
];

export default function Newsletter() {
  const [subscribers] = useState(initialSubscribers);
  const [showCompose, setShowCompose] = useState(false);
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [liste, setListe] = useState("alle");
  const [sent, setSent] = useState(false);

  const aktiv = subscribers.filter((s) => s.status === "aktiv").length;

  const handleSend = () => {
    if (!betreff.trim() || !text.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setShowCompose(false);
      setBetreff("");
      setText("");
    }, 2000);
  };

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in max-w-2xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
        <p className="text-muted-foreground text-sm mt-0.5">E-Mail-Marketing · DSGVO & TKG §107 konform (Österreich)</p>
      </div>

      {/* DSGVO-Hinweis */}
      <div className="bg-primary-light border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Shield size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Alle Kampagnen entsprechen der <strong>DSGVO</strong> und dem österreichischen <strong>TKG §107</strong>.
          Double-Opt-In ist für alle Empfänger aktiviert. Abmeldungen werden automatisch verarbeitet.
        </p>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <div className="text-2xl font-bold text-foreground">{aktiv}</div>
          <div className="text-xs text-muted-foreground mt-1">Abonnenten</div>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <div className="text-2xl font-bold text-primary">68%</div>
          <div className="text-xs text-muted-foreground mt-1">Öffnungsrate</div>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <div className="text-2xl font-bold text-foreground">{kampagnen.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Kampagnen</div>
        </div>
      </div>

      {/* Neue Kampagne verfassen */}
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5"
          onClick={() => setShowCompose(!showCompose)}
        >
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Neue Rundmail verfassen</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-1.5 text-xs font-semibold shadow-orange">
              <Plus size={13} /> Neu
            </span>
            {showCompose ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>

        {showCompose && (
          <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empfängerliste</label>
              <select
                className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={liste}
                onChange={(e) => setListe(e.target.value)}
              >
                <option value="alle">Alle Abonnenten ({aktiv})</option>
                <option value="kaeufer">Käufer-Interessenten Wien</option>
                <option value="mieter">Mieter-Interessenten Graz</option>
                <option value="investoren">Investoren Österreich</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Betreff *</label>
              <input
                className="mt-1 w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="z.B. Neue Angebote – März 2026"
                value={betreff}
                onChange={(e) => setBetreff(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nachrichtentext *</label>
              <textarea
                className="mt-1 w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={5}
                placeholder="Sehr geehrte Damen und Herren,&#10;&#10;wir freuen uns, Ihnen unsere neuesten Immobilienangebote vorstellen zu dürfen…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ℹ️ Jede E-Mail enthält automatisch einen Abmelde-Link (DSGVO-konform, TKG §107).
            </p>
            <button
              onClick={handleSend}
              disabled={!betreff.trim() || !text.trim() || sent}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold shadow-orange hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Send size={15} />
              {sent ? "Kampagne wurde gesendet ✓" : "Kampagne senden"}
            </button>
          </div>
        )}
      </div>

      {/* Bisherige Kampagnen */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <h2 className="font-bold text-foreground mb-4">Bisherige Kampagnen</h2>
        <div className="space-y-3">
          {kampagnen.map((k, i) => (
            <div key={i} className="flex items-start justify-between p-3 bg-accent rounded-xl gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{k.betreff}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.datum} · {k.empfaenger} Empfänger · {k.oeffnungsrate} geöffnet</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Abonnentenliste */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Abonnenten ({aktiv} aktiv)</h2>
        </div>
        <div className="space-y-2">
          {subscribers.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email} · {s.liste}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.status === "aktiv"
                    ? "bg-accent text-primary border border-primary/20"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {s.status === "aktiv" ? "Double-Opt-In ✓" : "Abgemeldet"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
