import { GraduationCap, PlayCircle, CheckCircle, Lock, ChevronRight, BarChart3, Clock } from "lucide-react";

const module = [
  { titel: "Fotografie & Exposé", status: "completed", sub: "ABGESCHLOSSEN", fortschritt: 100, img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop" },
  { titel: "Objektakquise", status: "next", sub: "NEXT IN QUEUE", fortschritt: 0, img: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&h=150&fit=crop" },
  { titel: "Rechtliche Grundlagen", status: "locked", sub: "Voraussetzung erforderlich", fortschritt: 0, img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&h=150&fit=crop" },
  { titel: "Social Ads Hub", status: "new", sub: "NEUER INHALT", fortschritt: 0, img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200&h=150&fit=crop" },
  { titel: "Alleinvermittlung Mastery", status: "next", sub: "VERFÜGBAR", fortschritt: 35, img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop" },
  { titel: "Nebenkostenübersicht AT", status: "new", sub: "NEU", fortschritt: 0, img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=150&fit=crop" },
];

export default function Academy() {
  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academy Hub</h1>
          <p className="text-muted-foreground text-sm">ImmoExpress Weiterbildung · Österreich</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer">
          <Clock size={15} /> Historie
        </div>
      </div>

      {/* Profil-Banner */}
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-orange">M</div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
            <CheckCircle size={12} className="text-primary-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground">Willkommen, Max</div>
          <div className="text-xs text-primary font-semibold uppercase tracking-wide">Senior Agent · ImmoExpress</div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Trainingsfortschritt</span>
              <span className="text-xs font-bold text-primary">60%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "60%" }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Aktueller Kurs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-lg">Aktueller Kurs</h2>
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-card group cursor-pointer">
          <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=280&fit=crop" alt="Menschenkenntnis" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent"></div>
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">LEVEL 2</span>
            <span className="bg-card/80 text-foreground text-xs font-bold px-2.5 py-1 rounded-full">PSYCHOLOGIE</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-primary-foreground font-black text-xl mb-1">Menschenkenntnis</h3>
            <p className="text-primary-foreground/70 text-sm">Psychologische Techniken für Immobilienmakler</p>
            <div className="flex items-center justify-between mt-3">
              <div>
                <span className="text-primary-foreground/60 text-xs">EINHEIT 4 VON 8</span>
                <div className="w-28 h-1.5 bg-primary-foreground/30 rounded-full mt-1">
                  <div className="w-[45%] h-1.5 bg-primary rounded-full"></div>
                </div>
                <span className="text-primary-foreground/60 text-xs">45%</span>
              </div>
              <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full font-bold text-sm shadow-orange hover:bg-primary-dark transition-all active:scale-95">
                <PlayCircle size={16} /> Fortsetzen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spezialisierte Module */}
      <h2 className="font-bold text-foreground text-lg mb-3">Spezialisierte Module</h2>
      <div className="grid grid-cols-2 gap-3">
        {module.map((m, i) => (
          <div key={i} className={`bg-card rounded-2xl border border-border shadow-card overflow-hidden ${m.status === "locked" ? "opacity-60" : "hover:shadow-card-hover cursor-pointer"} transition-all`}>
            <div className="relative">
              <img src={m.img} alt={m.titel} className="w-full h-24 object-cover" />
              {m.status === "completed" && (
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-orange">
                    <CheckCircle size={20} className="text-primary-foreground" />
                  </div>
                </div>
              )}
              {m.status === "locked" && (
                <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                  <Lock size={20} className="text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-bold text-foreground text-xs leading-tight mb-0.5 line-clamp-2">{m.titel}</h3>
              <p className={`text-xs font-semibold mb-2 ${
                m.status === "completed" ? "text-primary" :
                m.status === "new" ? "text-primary" :
                m.status === "locked" ? "text-muted-foreground" :
                "text-muted-foreground"
              }`}>{m.sub}</p>
              {m.fortschritt > 0 && m.fortschritt < 100 && (
                <div className="w-full h-1 bg-muted rounded-full mb-2">
                  <div className="bg-primary h-1 rounded-full" style={{ width: `${m.fortschritt}%` }}></div>
                </div>
              )}
              {m.status === "completed" ? (
                <div className="flex gap-1.5">
                  <button className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center">
                    <BarChart3 size={14} className="text-primary" />
                  </button>
                  <button className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center">
                    <Clock size={14} className="text-primary" />
                  </button>
                </div>
              ) : m.status === "locked" ? (
                <p className="text-xs text-muted-foreground">GESPERRT</p>
              ) : m.status === "new" ? (
                <button className="w-full bg-transparent border border-primary text-primary py-1.5 rounded-xl text-xs font-bold hover:bg-primary-light transition-all">
                  JETZT EINSCHREIBEN
                </button>
              ) : (
                <button className="w-full bg-primary text-primary-foreground py-1.5 rounded-xl text-xs font-bold shadow-orange-sm hover:bg-primary-dark transition-all active:scale-95">
                  START
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
