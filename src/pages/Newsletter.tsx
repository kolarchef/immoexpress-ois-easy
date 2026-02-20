import { Mail, Users, Shield, Plus } from "lucide-react";

export default function Newsletter() {
  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
        <p className="text-muted-foreground text-sm mt-0.5">E-Mail-Marketing · DSGVO-konform (Österreich)</p>
      </div>

      <div className="bg-primary-light border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Shield size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Alle Kampagnen entsprechen der <strong>DSGVO</strong> und dem österreichischen <strong>TKG §107</strong>. 
          Double-Opt-In ist für alle Empfänger aktiviert.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <div className="text-2xl font-bold text-foreground">347</div>
          <div className="text-xs text-muted-foreground mt-1">Abonnenten</div>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border text-center">
          <div className="text-2xl font-bold text-primary">68%</div>
          <div className="text-xs text-muted-foreground mt-1">Öffnungsrate</div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Kampagnen</h2>
          </div>
          <button className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-semibold shadow-orange hover:opacity-90 transition-all">
            <Plus size={14} /> Neue Kampagne
          </button>
        </div>
        <p className="text-muted-foreground text-sm text-center py-6">Noch keine Kampagnen erstellt.</p>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-primary" />
          <h2 className="font-bold text-foreground">Empfängerlisten</h2>
        </div>
        {["Käufer-Interessenten Wien", "Mieter-Interessenten Graz", "Investoren Österreich"].map((list) => (
          <div key={list} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <span className="text-sm font-medium text-foreground">{list}</span>
            <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">Double-Opt-In ✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}
