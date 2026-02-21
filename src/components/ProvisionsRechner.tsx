import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

export default function ProvisionsRechner({ trigger }: { trigger: React.ReactNode }) {
  const [kaufpreis, setKaufpreis] = useState("");
  const kp = Number(kaufpreis) || 0;

  const kaeuferNetto = kp * 0.036;
  const kaeuferBrutto = kaeuferNetto * 1.2;
  const verkaeuferNetto = kp * 0.036;
  const verkaeuferBrutto = verkaeuferNetto * 1.2;
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
              <div className="bg-accent rounded-xl p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Käufer-Provision (3,6%)</h3>
                <div className="flex justify-between text-sm"><span>Netto</span><span className="font-semibold">{fmt(kaeuferNetto)} €</span></div>
                <div className="flex justify-between text-sm"><span>+ 20% USt.</span><span className="font-semibold">{fmt(kaeuferBrutto - kaeuferNetto)} €</span></div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1 mt-1"><span>Brutto</span><span className="text-primary">{fmt(kaeuferBrutto)} €</span></div>
              </div>

              <div className="bg-accent rounded-xl p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Verkäufer-Provision (3,6%)</h3>
                <div className="flex justify-between text-sm"><span>Netto</span><span className="font-semibold">{fmt(verkaeuferNetto)} €</span></div>
                <div className="flex justify-between text-sm"><span>+ 20% USt.</span><span className="font-semibold">{fmt(verkaeuferBrutto - verkaeuferNetto)} €</span></div>
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
