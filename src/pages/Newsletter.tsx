import { useState } from "react";
import { Mail, Users, Shield, Plus, Send, ChevronDown, ChevronUp, Bell, Gift, Snowflake, Egg, PartyPopper, Home } from "lucide-react";

const initialSubscribers = [
  { id: 1, name: "Maria Huber", email: "m.huber@email.at", liste: "Käufer Wien", status: "aktiv", geburtsdatum: "1982-03-15", kaufdatum: "2024-06-01" },
  { id: 2, name: "Thomas Müller", email: "t.mueller@firma.at", liste: "Investoren Österreich", status: "aktiv", geburtsdatum: "1975-11-28", kaufdatum: "2023-09-10" },
  { id: 3, name: "Anna Schmidt", email: "a.schmidt@web.at", liste: "Mieter Graz", status: "aktiv", geburtsdatum: "1990-07-04", kaufdatum: "2025-01-15" },
  { id: 4, name: "Klaus Müller", email: "k.mueller@example.at", liste: "Käufer Wien", status: "abgemeldet", geburtsdatum: "1985-05-12", kaufdatum: "" },
  { id: 5, name: "Eva Steiner", email: "e.steiner@example.at", liste: "Investoren Österreich", status: "aktiv", geburtsdatum: "1978-12-25", kaufdatum: "2022-04-20" },
  { id: 6, name: "Karl Bauer", email: "k.bauer@outlook.at", liste: "Investoren Österreich", status: "aktiv", geburtsdatum: "1968-12-25", kaufdatum: "2022-04-20" },
];

const kampagnen = [
  { datum: "15.02.2026", betreff: "Neue Objekte in Wien – Februar 2026", empfaenger: 312, oeffnungsrate: "71%" },
  { datum: "01.02.2026", betreff: "Immobilienmarkt-Update Q1 2026", empfaenger: 298, oeffnungsrate: "65%" },
  { datum: "15.01.2026", betreff: "Jahresrückblick & Top-Angebote 2025", empfaenger: 285, oeffnungsrate: "74%" },
];

const eventTemplates = [
  {
    id: "geburtstag",
    icon: Gift,
    color: "bg-pink-50 text-pink-600",
    titel: "🎂 Geburtstags-Glückwunsch",
    betreff: "Herzlichen Glückwunsch zum Geburtstag, [Name]!",
    text: `Liebe/r [Name],\n\nwir von ImmoExpress wünschen Ihnen von Herzen alles Gute zu Ihrem Geburtstag! 🎉\n\nMögen das neue Lebensjahr Freude, Gesundheit und viele schöne Momente in Ihrem Zuhause bringen.\n\nMit herzlichen Grüßen,\nIhr ImmoExpress Team`,
  },
  {
    id: "weihnachten",
    icon: Snowflake,
    color: "bg-blue-50 text-blue-600",
    titel: "🎄 Frohe Weihnachten",
    betreff: "Frohe Weihnachten & erholsame Feiertage, [Name]!",
    text: `Liebe/r [Name],\n\nwir wünschen Ihnen und Ihrer Familie frohe, besinnliche Weihnachten und ein gutes neues Jahr! 🌟\n\nWir freuen uns, Sie auch im kommenden Jahr bei Ihren Immobilienangelegenheiten begleiten zu dürfen.\n\nMit festlichen Grüßen aus Wien,\nIhr ImmoExpress Team`,
  },
  {
    id: "ostern",
    icon: Egg,
    color: "bg-yellow-50 text-yellow-600",
    titel: "🐣 Frohe Ostern",
    betreff: "Frohe Ostern – ImmoExpress wünscht Ihnen schöne Feiertage!",
    text: `Liebe/r [Name],\n\nzu Ostern wünschen wir Ihnen erholsame Feiertage voller Freude und Sonnenschein! 🌸\n\nMöge das Osterfest für Sie und Ihre Familie eine schöne Zeit im Kreise Ihrer Liebsten bedeuten.\n\nMit osterlichen Grüßen,\nIhr ImmoExpress Team`,
  },
  {
    id: "neujahr",
    icon: PartyPopper,
    color: "bg-amber-50 text-amber-600",
    titel: "🎆 Frohes Neues Jahr",
    betreff: "Frohes neues Jahr [JAHR]! – ImmoExpress wünscht alles Gute",
    text: `Liebe/r [Name],\n\nein frohes, glückliches und erfolgreiches neues Jahr [JAHR]! 🥂\n\nWir danken Ihnen für Ihr Vertrauen und freuen uns auf eine weiterhin erfolgreiche Zusammenarbeit.\n\nMit den besten Wünschen für [JAHR],\nIhr ImmoExpress Team`,
  },
  {
    id: "jubilaeum",
    icon: Home,
    color: "bg-primary-light text-primary",
    titel: "🏠 Objektkauf-Jubiläum",
    betreff: "[X] Jahr(e) in Ihrem neuen Zuhause – herzlichen Glückwunsch!",
    text: `Liebe/r [Name],\n\nheute vor genau [X] Jahr(en) haben Sie Ihr Traumobjekt erworben – herzlichen Glückwunsch zum Jubiläum! 🏡\n\nWir hoffen, dass Sie sich in Ihrem Zuhause rundum wohlfühlen.\n\nFalls Sie Fragen zu Ihrer Immobilie haben oder einen Marktwert-Check wünschen, stehen wir Ihnen gerne zur Verfügung.\n\nMit herzlichen Grüßen,\nIhr ImmoExpress Team`,
  },
];

function getUpcomingEvents() {
  const today = new Date();
  const events: { name: string; event: string; date: Date; typ: string; icon: typeof Gift; color: string }[] = [];

  initialSubscribers.filter(s => s.status === "aktiv").forEach(sub => {
    // Geburtstag
    if (sub.geburtsdatum) {
      const geb = new Date(sub.geburtsdatum);
      const nextGeb = new Date(today.getFullYear(), geb.getMonth(), geb.getDate());
      if (nextGeb < today) nextGeb.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((nextGeb.getTime() - today.getTime()) / 86400000);
      if (diff <= 30) events.push({ name: sub.name, event: "Geburtstag", date: nextGeb, typ: "geburtstag", icon: Gift, color: "text-pink-500" });
    }
    // Kaufjubiläum
    if (sub.kaufdatum) {
      const kauf = new Date(sub.kaufdatum);
      const nextJub = new Date(today.getFullYear(), kauf.getMonth(), kauf.getDate());
      if (nextJub < today) nextJub.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((nextJub.getTime() - today.getTime()) / 86400000);
      const years = today.getFullYear() - kauf.getFullYear() + (nextJub.getFullYear() > today.getFullYear() ? 0 : 1);
      if (diff <= 30) events.push({ name: sub.name, event: `${years}. Kaufjubiläum`, date: nextJub, typ: "jubilaeum", icon: Home, color: "text-primary" });
    }
  });

  // Feste Events
  const weihnachten = new Date(today.getFullYear(), 11, 24);
  if (weihnachten < today) weihnachten.setFullYear(today.getFullYear() + 1);
  const diffXmas = Math.ceil((weihnachten.getTime() - today.getTime()) / 86400000);
  if (diffXmas <= 60) events.push({ name: "Alle Abonnenten", event: "Weihnachten", date: weihnachten, typ: "weihnachten", icon: Snowflake, color: "text-blue-500" });

  const neujahr = new Date(today.getFullYear() + 1, 0, 1);
  const diffNY = Math.ceil((neujahr.getTime() - today.getTime()) / 86400000);
  if (diffNY <= 60) events.push({ name: "Alle Abonnenten", event: "Neujahr", date: neujahr, typ: "neujahr", icon: PartyPopper, color: "text-amber-500" });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);
}

export default function Newsletter() {
  const [subscribers] = useState(initialSubscribers);
  const [showCompose, setShowCompose] = useState(false);
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [liste, setListe] = useState("alle");
  const [sent, setSent] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const aktiv = subscribers.filter((s) => s.status === "aktiv").length;
  const upcomingEvents = getUpcomingEvents();

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

  const applyTemplate = (tpl: typeof eventTemplates[0]) => {
    setBetreff(tpl.betreff);
    setText(tpl.text);
    setActiveTemplate(tpl.id);
    setShowCompose(true);
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

      {/* Automatische Event-Aussendungen */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Automatische Aussendungen</h2>
          {upcomingEvents.length > 0 && (
            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">{upcomingEvents.length} anstehend</span>
          )}
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-2 mb-4">
            {upcomingEvents.map((ev, i) => {
              const Icon = ev.icon;
              const diff = Math.ceil((ev.date.getTime() - new Date().getTime()) / 86400000);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-accent rounded-xl">
                  <Icon size={18} className={ev.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ev.name}</p>
                    <p className="text-xs text-muted-foreground">{ev.event} · {ev.date.toLocaleDateString("de-AT", { day: "2-digit", month: "long" })}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${diff <= 7 ? "bg-destructive/10 text-destructive" : "bg-card text-muted-foreground border border-border"}`}>
                    {diff === 0 ? "Heute!" : `in ${diff}T`}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Keine anstehenden Events in den nächsten 60 Tagen.</p>
        )}

        {/* Event-Vorlagen */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">E-Mail-Vorlagen</p>
        <div className="grid grid-cols-1 gap-2">
          {eventTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-primary/50 text-left ${activeTemplate === tpl.id ? "border-primary bg-primary-light" : "border-border bg-accent"}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tpl.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{tpl.titel}</p>
                  <p className="text-xs text-muted-foreground truncate">{tpl.betreff}</p>
                </div>
                <span className="text-xs text-primary font-semibold flex-shrink-0">Verwenden →</span>
              </button>
            );
          })}
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
                rows={6}
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
