import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

export default function ProvisionsRechner({ trigger }: { trigger: React.ReactNode }) {
  const [kaufpreis, setKaufpreis] = useState("");
  const [kaeuferProzent, setKaeuferProzent] = useState("3");
  const [verkaeuferProzent, setVerkaeuferProzent] = useState("3");

  const kp = Number(kaufpreis) || 0;
  const kPct = Number(kaeuferProzent) || 0;
  const vPct = Number(verkaeuferProzent) || 0;

  const kaeuferNetto = kp * (kPct / 100);
  const kaeuferUst = kaeuferNetto * 0.2;
  const kaeuferBrutto = kaeuferNetto + kaeuferUst;

  const verkaeuferNetto = kp * (vPct / 100);
  const verkaeuferUst = verkaeuferNetto * 0.2;
  const verkaeuferBrutto = verkaeuferNetto + verkaeuferUst;

  const gesamtBrutto = kaeuferBrutto + verkaeuferBrutto;

  const fmt = (n: number) => n.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={20} className="text-primary" /> Provisions-Rechner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Kaufpreis (€)</Label>
            <Input type="number" value={kaufpreis} onChange={e => setKaufpreis(e.target.value)} placeholder="z.B. 350000" className="mt-1" />
          </div>

          {kp > 0 && (
            <div className="space-y-3">
              {/* Käufer */}
              <div className="bg-accent rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase">Käufer-Provision</h3>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={kaeuferProzent}
                      onChange={e => setKaeuferProzent(e.target.value)}
                      className="w-16 h-7 text-xs text-right"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm"><span>Netto</span><span className="font-semibold">{fmt(kaeuferNetto)} €</span></div>
                <div className="flex justify-between text-sm"><span>+ 20% USt.</span><span className="font-semibold">{fmt(kaeuferUst)} €</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1"><span>Brutto</span><span className="text-primary">{fmt(kaeuferBrutto)} €</span></div>
              </div>

              {/* Verkäufer */}
              <div className="bg-accent rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase">Verkäufer-Provision</h3>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={verkaeuferProzent}
                      onChange={e => setVerkaeuferProzent(e.target.value)}
                      className="w-16 h-7 text-xs text-right"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm"><span>Netto</span><span className="font-semibold">{fmt(verkaeuferNetto)} €</span></div>
                <div className="flex justify-between text-sm"><span>+ 20% USt.</span><span className="font-semibold">{fmt(verkaeuferUst)} €</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1"><span>Brutto</span><span className="text-primary">{fmt(verkaeuferBrutto)} €</span></div>
              </div>

              <div className="bg-primary/10 rounded-xl p-4">
                <div className="flex justify-between font-bold text-foreground"><span>Gesamt Brutto</span><span className="text-primary text-lg">{fmt(gesamtBrutto)} €</span></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
