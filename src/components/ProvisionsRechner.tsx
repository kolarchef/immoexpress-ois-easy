import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

export default function ProvisionsRechner({ trigger }: { trigger: React.ReactNode }) {
  const { user } = useAuth();
  const [kaufpreis, setKaufpreis] = useState("");
  const [kaeuferProzent, setKaeuferProzent] = useState("3");
  const [verkaeuferProzent, setVerkaeuferProzent] = useState("3");
  const [firmenabgabe, setFirmenabgabe] = useState("20");
  const [provisionssatz, setProvisionssatz] = useState("100");
  const [isAdmin, setIsAdmin] = useState(false);
  const [rolleLabel, setRolleLabel] = useState("");

  useEffect(() => {
    if (!user) return;
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    // Check admin
    const { data: adminData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!adminData);

    // Get GP profile for role & provisionssatz
    const { data: gp } = await supabase
      .from("geschaeftspartner")
      .select("status, provisionssatz")
      .eq("user_id", user.id)
      .maybeSingle();

    if (gp) {
      if (gp.status === "trainee") {
        setFirmenabgabe("30");
        setRolleLabel("Trainee");
      } else {
        setFirmenabgabe("20");
        setRolleLabel("Makler");
      }
      if (gp.provisionssatz != null) {
        setProvisionssatz(String(gp.provisionssatz));
      }
    } else if (adminData) {
      setFirmenabgabe("20");
      setRolleLabel("Admin");
    }
  };

  const kp = Number(kaufpreis) || 0;
  const kPct = Number(kaeuferProzent) || 0;
  const vPct = Number(verkaeuferProzent) || 0;
  const firmaPct = Number(firmenabgabe) || 0;
  const eigenerPct = Number(provisionssatz) || 0;

  const kaeuferNetto = kp * (kPct / 100);
  const kaeuferUst = kaeuferNetto * 0.2;
  const kaeuferBrutto = kaeuferNetto + kaeuferUst;

  const verkaeuferNetto = kp * (vPct / 100);
  const verkaeuferUst = verkaeuferNetto * 0.2;
  const verkaeuferBrutto = verkaeuferNetto + verkaeuferUst;

  const gesamtBrutto = kaeuferBrutto + verkaeuferBrutto;
  const firmenAnteil = gesamtBrutto * (firmaPct / 100);
  const provisionsBasis = gesamtBrutto - firmenAnteil;
  const auszahlung = provisionsBasis * (eigenerPct / 100);

  const fmt = (n: number) => n.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const chartData = gesamtBrutto > 0 ? [
    { name: "Firmenanteil", value: firmenAnteil },
    { name: "Dein Anteil", value: auszahlung },
    { name: "Rest", value: Math.max(0, provisionsBasis - auszahlung) },
  ].filter(d => d.value > 0) : [];

  const COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--accent))"];

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={20} className="text-primary" /> Provisions-Rechner
            {rolleLabel && <span className="text-xs font-normal text-muted-foreground ml-auto">Rolle: {rolleLabel}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Kaufpreis (€)</Label>
            <Input type="number" value={kaufpreis} onChange={e => setKaufpreis(e.target.value)} placeholder="z.B. 350000" className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Käufer-Provision (%)</Label>
              <Input type="number" value={kaeuferProzent} onChange={e => setKaeuferProzent(e.target.value)} min="0" step="0.1" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Verkäufer-Provision (%)</Label>
              <Input type="number" value={verkaeuferProzent} onChange={e => setVerkaeuferProzent(e.target.value)} min="0" step="0.1" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Firmenabgabe (%)
                {!isAdmin && <span className="text-muted-foreground ml-1">🔒</span>}
              </Label>
              <Input
                type="number"
                value={firmenabgabe}
                onChange={e => setFirmenabgabe(e.target.value)}
                min="0" max="100" step="1"
                className="mt-1"
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label className="text-xs">Dein Provisionssatz (%)</Label>
              <Input
                type="number"
                value={provisionssatz}
                onChange={e => setProvisionssatz(e.target.value)}
                min="0" max="100" step="1"
                className="mt-1"
                disabled={!isAdmin}
              />
            </div>
          </div>

          {kp > 0 && (
            <div className="space-y-3 pt-2">
              {/* A) Gesamtprovision */}
              <div className="bg-accent rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Aufschlüsselung</h3>
                <div className="flex justify-between text-sm">
                  <span>Käufer-Prov. (Brutto)</span>
                  <span className="font-semibold">{fmt(kaeuferBrutto)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Verkäufer-Prov. (Brutto)</span>
                  <span className="font-semibold">{fmt(verkaeuferBrutto)} €</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1.5">
                  <span>A) Gesamtprovision (Brutto)</span>
                  <span className="text-primary">{fmt(gesamtBrutto)} €</span>
                </div>
              </div>

              {/* B-D) Verteilung */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>B) Firmenanteil ({firmaPct}%)</span>
                  <span className="font-semibold text-muted-foreground">{fmt(firmenAnteil)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>C) Provisionsbasis MA</span>
                  <span className="font-semibold">{fmt(provisionsBasis)} €</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-1">
                  <span>D) Dein Auszahlungsbetrag</span>
                  <span className="text-primary text-lg">{fmt(auszahlung)} €</span>
                </div>
                <p className="text-[10px] text-muted-foreground">({eigenerPct}% von {fmt(provisionsBasis)} €)</p>
              </div>

              {/* Pie Chart */}
              {chartData.length > 0 && (
                <div className="bg-accent rounded-xl p-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Verteilung</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value: string, entry: any) => (
                          <span className="text-xs text-foreground">{value}: {fmt(entry.payload.value)} €</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
