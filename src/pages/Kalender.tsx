import { useState, useEffect } from "react";
import { Plus, MapPin, Shield, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const monate = ["Jänner","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const wochentage = ["MO","DI","MI","DO","FR","SA","SO"];

interface Termin {
  id: string;
  titel: string;
  datum: string;
  uhrzeit: string;
  dauer_min: number;
  ort: string | null;
  typ: string | null;
  wichtig: boolean | null;
  notiz: string | null;
}

export default function Kalender() {
  const { user } = useAuth();
  const [ansicht, setAnsicht] = useState<"Tag" | "Woche" | "Agenda">("Tag");
  const [heute] = useState(new Date());
  const [termine, setTermine] = useState<Termin[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitel, setNewTitel] = useState("");
  const [newDatum, setNewDatum] = useState(new Date().toISOString().slice(0, 10));
  const [newUhrzeit, setNewUhrzeit] = useState("10:00");
  const [newOrt, setNewOrt] = useState("");
  const [newDauer, setNewDauer] = useState("60");

  const monat = monate[heute.getMonth()];
  const jahr = heute.getFullYear();
  const dayOfWeek = heute.getDay() || 7;

  const wochenDaten = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(heute);
    d.setDate(heute.getDate() - (dayOfWeek - 1) + i);
    return { tag: d.getDate(), aktiv: i + 1 === dayOfWeek, datum: d.toISOString().slice(0, 10) };
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("termine").select("*").order("datum").order("uhrzeit");
    if (data) setTermine(data as Termin[]);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const heuteStr = heute.toISOString().slice(0, 10);
  const tagesTermine = termine.filter(t => t.datum === heuteStr);

  const addTermin = async () => {
    if (!user || !newTitel.trim()) return;
    const { error } = await supabase.from("termine").insert({
      user_id: user.id,
      titel: newTitel,
      datum: newDatum,
      uhrzeit: newUhrzeit,
      dauer_min: Number(newDauer) || 60,
      ort: newOrt || null,
    });
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✅ Termin erstellt" });
    setNewTitel(""); setNewOrt(""); setAddOpen(false);
    load();
  };

  const deleteTermin = async (id: string) => {
    await supabase.from("termine").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto" style={{ paddingBottom: 200 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
            <Clock size={18} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{monat} {jahr}</h1>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card border border-border rounded-xl px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            Cloud Sync
          </div>
        </div>
      </div>

      {/* Ansicht Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        {(["Tag", "Woche", "Agenda"] as const).map(a => (
          <button key={a} onClick={() => setAnsicht(a)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${ansicht === a ? "bg-card text-primary shadow-card" : "text-muted-foreground hover:text-foreground"}`}
          >{a}</button>
        ))}
      </div>

      {/* Wochenübersicht */}
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4">
        <div className="grid grid-cols-7 gap-1">
          {wochentage.map((wt, i) => (
            <div key={wt} className="text-center">
              <div className="text-xs text-muted-foreground font-medium mb-2">{wt}</div>
              <button className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                wochenDaten[i]?.aktiv ? "bg-primary text-primary-foreground shadow-orange" : "hover:bg-accent text-foreground"
              }`}>
                {wochenDaten[i]?.tag}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Termine */}
      <div className="space-y-3">
        {tagesTermine.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Keine Termine heute</div>
        ) : (
          tagesTermine.map(t => (
            <div key={t.id} className={`relative rounded-2xl border overflow-hidden shadow-card ${
              t.typ === "notar" ? "bg-primary border-primary" : "bg-card border-border"
            }`}>
              {t.typ !== "notar" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-2xl"></div>}
              <div className="p-4 pl-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold text-lg tabular-nums ${t.typ === "notar" ? "text-primary-foreground" : "text-primary"}`}>
                        {t.uhrzeit?.slice(0, 5)}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        t.typ === "notar" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary-light text-primary"
                      }`}>{t.dauer_min} MIN</span>
                    </div>
                    <h3 className={`font-bold text-base ${t.typ === "notar" ? "text-primary-foreground" : "text-foreground"}`}>{t.titel}</h3>
                    {t.ort && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${t.typ === "notar" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        <MapPin size={11} />{t.ort}
                      </div>
                    )}
                    {t.notiz && <p className="text-xs text-muted-foreground mt-1">{t.notiz}</p>}
                    {t.wichtig && (
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-primary-foreground/20 text-primary-foreground">
                        <Shield size={10} /> WICHTIG
                      </span>
                    )}
                  </div>
                  <button onClick={() => deleteTermin(t.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB - Add Termin */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <button className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-orange flex items-center justify-center hover:bg-primary-dark transition-all active:scale-90 hover:scale-105 z-20">
            <Plus size={24} />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Neuer Termin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titel</Label><Input value={newTitel} onChange={e => setNewTitel(e.target.value)} placeholder="Terminbezeichnung" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Datum</Label><Input type="date" value={newDatum} onChange={e => setNewDatum(e.target.value)} /></div>
              <div><Label>Uhrzeit</Label><Input type="time" value={newUhrzeit} onChange={e => setNewUhrzeit(e.target.value)} /></div>
            </div>
            <div><Label>Dauer (Min.)</Label><Input type="number" value={newDauer} onChange={e => setNewDauer(e.target.value)} /></div>
            <div><Label>Ort</Label><Input value={newOrt} onChange={e => setNewOrt(e.target.value)} placeholder="Optional" /></div>
            <Button onClick={addTermin} className="w-full" disabled={!newTitel.trim()}>Termin erstellen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
