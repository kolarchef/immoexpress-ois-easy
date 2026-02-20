import { useState } from "react";
import { Mail, Users, Shield, Plus, Send, ChevronDown, ChevronUp, Bell, Gift, Snowflake, Egg, PartyPopper, Home, Image, Calendar, X } from "lucide-react";

// ─── Geteilt mit CRM – gleiche Kunden-Datenbasis ───────────────────────────
const crmKunden = [
  { id: 1, name: "Maria Huber",   email: "m.huber@email.at",   liste: "Käufer Wien",              status: "aktiv",      geburtsdatum: "1982-03-15", kaufdatum: "2024-06-01" },
  { id: 2, name: "Thomas Müller", email: "t.mueller@firma.at", liste: "Investoren Österreich",    status: "aktiv",      geburtsdatum: "1975-11-28", kaufdatum: "2023-09-10" },
  { id: 3, name: "Anna Schmidt",  email: "a.schmidt@web.at",   liste: "Mieter Graz",              status: "aktiv",      geburtsdatum: "1990-07-04", kaufdatum: "2025-01-15" },
  { id: 4, name: "Klaus Müller",  email: "k.mueller@example.at", liste: "Käufer Wien",            status: "abgemeldet", geburtsdatum: "1985-05-12", kaufdatum: "" },
  { id: 5, name: "Eva Steiner",   email: "e.steiner@example.at", liste: "Investoren Österreich", status: "aktiv",      geburtsdatum: "1978-12-25", kaufdatum: "2022-04-20" },
  { id: 6, name: "Karl Bauer",    email: "k.bauer@outlook.at", liste: "Investoren Österreich",   status: "aktiv",      geburtsdatum: "1968-12-25", kaufdatum: "2022-04-20" },
  { id: 7, name: "Sandra Lehner", email: "s.lehner@gmx.at",    liste: "Käufer Linz",             status: "aktiv",      geburtsdatum: "1995-05-20", kaufdatum: "" },
  { id: 8, name: "Peter Wimmer",  email: "p.wimmer@aon.at",    liste: "Verkäufer Wien",          status: "aktiv",      geburtsdatum: "1970-08-10", kaufdatum: "2021-12-01" },
];

const kampagnen = [
  { datum: "15.02.2026", betreff: "Neue Objekte in Wien – Februar 2026", empfaenger: 312, oeffnungsrate: "71%" },
  { datum: "01.02.2026", betreff: "Immobilienmarkt-Update Q1 2026",      empfaenger: 298, oeffnungsrate: "65%" },
  { datum: "15.01.2026", betreff: "Jahresrückblick & Top-Angebote 2025", empfaenger: 285, oeffnungsrate: "74%" },
];

const eventTemplates = [
  {
    id: "geburtstag",
    icon: Gift,
    color: "bg-pink-50 text-pink-600",
    emoji: "🎂",
    titel: "🎂 Geburtstags-Glückwunsch",
    betreff: "Herzlichen Glückwunsch zum Geburtstag, [Name]!",
    bildPlatzhalter: "🎈 Lustiges Geburtstags-GIF oder Bild hier einfügen",
    text: `Liebe/r [Name],\n\nwir von ImmoExpress wünschen Ihnen von Herzen alles Gute zu Ihrem Geburtstag! 🎉\n\nMögen das neue Lebensjahr Freude, Gesundheit und viele schöne Momente in Ihrem Zuhause bringen.\n\nMit herzlichen Grüßen,\nIhr ImmoExpress Team\n\n---\n⚖️ Diese E-Mail wurde gemäß DSGVO & TKG §107 versandt. Sie erhalten diese Nachricht, weil Sie unserem Newsletter zugestimmt haben (Double-Opt-In). Abmeldung: [Abmelde-Link]`,
  },
  {
    id: "weihnachten",
    icon: Snowflake,
    color: "bg-blue-50 text-blue-600",
    emoji: "🎄",
    titel: "🎄 Frohe Weihnachten",
    betreff: "Frohe Weihnachten & erholsame Feiertage, [Name]!",
    bildPlatzhalter: "🎅 Weihnachtliches Bild oder Video hier einfügen (z.B. Wiener Christkindlmarkt)",
    text: `Liebe/r [Name],\n\nwir wünschen Ihnen und Ihrer Familie frohe, besinnliche Weihnachten und ein gutes neues Jahr! 🌟\n\nWir freuen uns, Sie auch im kommenden Jahr bei Ihren Immobilienangelegenheiten begleiten zu dürfen.\n\nMit festlichen Grüßen aus Wien,\nIhr ImmoExpress Team\n\n---\n⚖️ DSGVO & TKG §107 konform · Double-Opt-In bestätigt · [Abmelde-Link]`,
  },
  {
    id: "ostern",
    icon: Egg,
    color: "bg-yellow-50 text-yellow-600",
    emoji: "🐣",
    titel: "🐣 Frohe Ostern",
    betreff: "Frohe Ostern – ImmoExpress wünscht Ihnen schöne Feiertage!",
    bildPlatzhalter: "🌸 Frühlingshaftes Bild oder lustiges Oster-GIF hier einfügen",
    text: `Liebe/r [Name],\n\nzu Ostern wünschen wir Ihnen erholsame Feiertage voller Freude und Sonnenschein! 🌸\n\nMöge das Osterfest für Sie und Ihre Familie eine schöne Zeit im Kreise Ihrer Liebsten bedeuten.\n\nMit osterlichen Grüßen,\nIhr ImmoExpress Team\n\n---\n⚖️ DSGVO & TKG §107 konform · [Abmelde-Link]`,
  },
  {
    id: "neujahr",
    icon: PartyPopper,
    color: "bg-amber-50 text-amber-600",
    emoji: "🎆",
    titel: "🎆 Frohes Neues Jahr",
    betreff: "Frohes neues Jahr [JAHR]! – ImmoExpress wünscht alles Gute",
    bildPlatzhalter: "🥂 Silvester-Video oder Feuerwerk-GIF (z.B. Wiener Silvesterpfad) hier einfügen",
    text: `Liebe/r [Name],\n\nein frohes, glückliches und erfolgreiches neues Jahr [JAHR]! 🥂\n\nWir danken Ihnen für Ihr Vertrauen und freuen uns auf eine weiterhin erfolgreiche Zusammenarbeit.\n\nMit den besten Wünschen für [JAHR],\nIhr ImmoExpress Team\n\n---\n⚖️ DSGVO & TKG §107 konform · [Abmelde-Link]`,
  },
  {
    id: "jubilaeum",
    icon: Home,
    color: "bg-primary-light text-primary",
    emoji: "🏠",
    titel: "🏠 Objektkauf-Jubiläum",
    betreff: "[X] Jahr(e) in Ihrem neuen Zuhause – herzlichen Glückwunsch!",
    bildPlatzhalter: "🏡 Foto des Objekts oder ein charmantes Haus-GIF hier einfügen",
    text: `Liebe/r [Name],\n\nheute vor genau [X] Jahr(en) haben Sie Ihr Traumobjekt erworben – herzlichen Glückwunsch zum Jubiläum! 🏡\n\nWir hoffen, dass Sie sich in Ihrem Zuhause rundum wohlfühlen.\n\nFalls Sie Fragen zu Ihrer Immobilie haben oder einen Marktwert-Check wünschen, stehen wir Ihnen gerne zur Verfügung.\n\nMit herzlichen Grüßen,\nIhr ImmoExpress Team\n\n---\n⚖️ DSGVO & TKG §107 konform · [Abmelde-Link]`,
  },
];

type EventItem = {
  name: string;
  email: string;
  event: string;
  date: Date;
  typ: string;
  icon: typeof Gift;
  color: string;
  yearsAgo?: number;
};

function getUpcomingEvents(windowDays = 60): EventItem[] {
  const today = new Date();
  const events: EventItem[] = [];

  crmKunden.filter(s => s.status === "aktiv").forEach(sub => {
    // Geburtstag
    if (sub.geburtsdatum) {
      const geb = new Date(sub.geburtsdatum);
      const nextGeb = new Date(today.getFullYear(), geb.getMonth(), geb.getDate());
      if (nextGeb < today) nextGeb.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((nextGeb.getTime() - today.getTime()) / 86400000);
      if (diff <= windowDays) {
        const age = nextGeb.getFullYear() - geb.getFullYear();
        events.push({ name: sub.name, email: sub.email, event: `Geburtstag (${age} Jahre)`, date: nextGeb, typ: "geburtstag", icon: Gift, color: "text-pink-500" });
      }
    }
    // Kaufjubiläum
    if (sub.kaufdatum) {
      const kauf = new Date(sub.kaufdatum);
      const nextJub = new Date(today.getFullYear(), kauf.getMonth(), kauf.getDate());
      if (nextJub < today) nextJub.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((nextJub.getTime() - today.getTime()) / 86400000);
      const years = nextJub.getFullYear() - kauf.getFullYear();
      if (diff <= windowDays) {
        events.push({ name: sub.name, email: sub.email, event: `${years}. Kaufjubiläum`, date: nextJub, typ: "jubilaeum", icon: Home, color: "text-primary", yearsAgo: years });
      }
    }
  });

  // Österreichische Festtage
  const festtage: { name: string; month: number; day: number; typ: string; icon: typeof Snowflake; color: string }[] = [
    { name: "Weihnachten",  month: 11, day: 24, typ: "weihnachten", icon: Snowflake,    color: "text-blue-500" },
    { name: "Neujahr",      month: 0,  day: 1,  typ: "neujahr",     icon: PartyPopper,  color: "text-amber-500" },
    { name: "Ostersonntag", month: 3,  day: 20, typ: "ostern",      icon: Egg,          color: "text-yellow-500" }, // 2026
  ];

  festtage.forEach(f => {
    const d = new Date(today.getFullYear(), f.month, f.day);
    if (d < today) d.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    if (diff <= windowDays) {
      events.push({ name: "Alle Abonnenten", email: "–", event: f.name, date: d, typ: f.typ, icon: f.icon, color: f.color });
    }
  });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export default function Newsletter() {
  const [subscribers] = useState(crmKunden);
  const [showCompose, setShowCompose] = useState(false);
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [liste, setListe] = useState("alle");
  const [sent, setSent] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<typeof eventTemplates[0] | null>(null);
  const [windowDays, setWindowDays] = useState(60);

  const aktiv = subscribers.filter((s) => s.status === "aktiv").length;
  const upcomingEvents = getUpcomingEvents(windowDays);

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
    setPreviewTemplate(null);
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
          Kein Versand ohne ausdrückliche Einwilligung.
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

      {/* ── Automatische Aussendungen ── */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Automatische Aussendungen</h2>
          {upcomingEvents.length > 0 && (
            <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">
              {upcomingEvents.length} anstehend
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Automatisch aus CRM-Daten berechnet (Geburtsdatum & Kaufdatum)</p>

        {/* Zeitfenster-Wahl */}
        <div className="flex gap-2 mb-4">
          {[30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-xl border transition-all ${windowDays === d ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-muted-foreground border-border hover:border-primary/40"}`}
            >
              {d} Tage
            </button>
          ))}
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-2 mb-5">
            {upcomingEvents.map((ev, i) => {
              const Icon = ev.icon;
              const diff = Math.ceil((ev.date.getTime() - new Date().getTime()) / 86400000);
              const tpl = eventTemplates.find(t => t.id === ev.typ);
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-accent rounded-xl">
                  <Icon size={18} className={ev.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ev.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.event} · {ev.date.toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diff === 0 ? "bg-destructive text-destructive-foreground" : diff <= 7 ? "bg-destructive/10 text-destructive" : "bg-card text-muted-foreground border border-border"}`}>
                      {diff === 0 ? "Heute!" : `in ${diff}T`}
                    </span>
                    {tpl && (
                      <button
                        onClick={() => applyTemplate(tpl)}
                        className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-lg font-semibold hover:opacity-90 transition-all active:scale-95"
                      >
                        Senden →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 mb-4">
            Keine anstehenden Events in den nächsten {windowDays} Tagen.
          </p>
        )}

        {/* Event-Vorlagen */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">E-Mail-Vorlagen (Österreich)</p>
        <div className="grid grid-cols-1 gap-2">
          {eventTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <div key={tpl.id} className="rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setPreviewTemplate(previewTemplate?.id === tpl.id ? null : tpl)}
                  className={`w-full flex items-center gap-3 p-3 transition-all hover:border-primary/50 text-left ${activeTemplate === tpl.id ? "bg-primary-light" : "bg-accent"}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tpl.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{tpl.titel}</p>
                    <p className="text-xs text-muted-foreground truncate">{tpl.betreff}</p>
                  </div>
                  <ChevronDown size={14} className={`text-muted-foreground flex-shrink-0 transition-transform ${previewTemplate?.id === tpl.id ? "rotate-180" : ""}`} />
                </button>

                {/* Vorschau ausgeklappt */}
                {previewTemplate?.id === tpl.id && (
                  <div className="p-4 border-t border-border bg-card space-y-3">
                    {/* Bild-Platzhalter */}
                    <div className="flex items-center gap-2 p-3 bg-accent rounded-xl border-2 border-dashed border-primary/30">
                      <Image size={16} className="text-primary flex-shrink-0" />
                      <p className="text-xs text-muted-foreground italic">{tpl.bildPlatzhalter}</p>
                    </div>
                    {/* Text-Vorschau */}
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-sans bg-surface p-3 rounded-xl max-h-40 overflow-y-auto leading-relaxed border border-border">
                      {tpl.text}
                    </pre>
                    <button
                      onClick={() => applyTemplate(tpl)}
                      className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95"
                    >
                      Diese Vorlage verwenden →
                    </button>
                  </div>
                )}
              </div>
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
                rows={7}
                placeholder="Sehr geehrte Damen und Herren,&#10;&#10;wir freuen uns, Ihnen unsere neuesten Immobilienangebote vorstellen zu dürfen…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            {/* Bild-Platzhalter Hinweis */}
            <div className="flex items-start gap-2 p-3 bg-accent rounded-xl border border-border">
              <Image size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Bild / Video einfügen:</strong> Fügen Sie eine Bild-URL oder ein lustiges GIF direkt in den Text ein.
                Empfehlung: Giphy, Tenor oder eigene Fotos über Cloudflare Images.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              ℹ️ Jede E-Mail enthält automatisch einen Abmelde-Link und den Pflichttext gemäß <strong>DSGVO & TKG §107</strong>.
              Kein Versand an abgemeldete Kontakte.
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
                {s.geburtsdatum && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={10} /> {new Date(s.geburtsdatum).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
                    </span>
                    {s.kaufdatum && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Home size={10} /> Kauf: {new Date(s.kaufdatum).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}
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
