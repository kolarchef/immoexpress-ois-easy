import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  User, Calendar, Phone, Mail, Percent, KeyRound, TrendingUp,
  Home, Banknote, GraduationCap, Save, Eye, EyeOff
} from "lucide-react";

type Partner = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  join_date: string;
  leave_date: string | null;
  notiz: string | null;
  user_id: string | null;
  geburtsdatum: string | null;
  provisionssatz: number | null;
  lernerfolg: string | null;
};

type PerformanceData = {
  umsatz: number;
  objektCount: number;
  finanzCount: number;
};

interface GPDetailModalProps {
  partner: Partner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function GPDetailModal({ partner, open, onOpenChange, onSaved }: GPDetailModalProps) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", geburtsdatum: "", provisionssatz: "", lernerfolg: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perf, setPerf] = useState<PerformanceData>({ umsatz: 0, objektCount: 0, finanzCount: 0 });

  useEffect(() => {
    if (!partner) return;
    setForm({
      name: partner.name || "",
      email: partner.email || "",
      phone: partner.phone || "",
      geburtsdatum: partner.geburtsdatum || "",
      provisionssatz: partner.provisionssatz != null ? String(partner.provisionssatz) : "",
      lernerfolg: partner.lernerfolg || "",
    });
    setNewPassword("");
    loadPerformance(partner);
  }, [partner]);

  const loadPerformance = async (p: Partner) => {
    if (!p.user_id) { setPerf({ umsatz: 0, objektCount: 0, finanzCount: 0 }); return; }

    const [objRes, finRes] = await Promise.all([
      supabase.from("objekte").select("kaufpreis, status").eq("user_id", p.user_id),
      supabase.from("crm_kunden").select("id, finance_status").eq("user_id", p.user_id),
    ]);

    const objekte = (objRes.data as any[]) || [];
    const kunden = (finRes.data as any[]) || [];

    const verkauft = objekte.filter(o => o.status === "verkauft");
    const umsatz = verkauft.reduce((s, o) => s + (Number(o.kaufpreis) || 0), 0);
    const finanzCount = kunden.filter(k => k.finance_status === "genehmigt").length;

    setPerf({ umsatz, objektCount: objekte.length, finanzCount });
  };

  const handleSave = async () => {
    if (!partner) return;
    setSaving(true);
    const { error } = await supabase.from("geschaeftspartner").update({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      geburtsdatum: form.geburtsdatum || null,
      provisionssatz: form.provisionssatz ? Number(form.provisionssatz) : null,
      lernerfolg: form.lernerfolg || null,
    } as any).eq("id", partner.id);
    setSaving(false);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Profil gespeichert" });
    onSaved();
  };

  const handlePasswordReset = async () => {
    if (!partner?.user_id) { toast({ title: "Kein Benutzerkonto verknüpft", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Mindestens 6 Zeichen", variant: "destructive" }); return; }
    setPwLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ user_id: partner.user_id, new_password: newPassword }),
    });
    const result = await res.json();
    setPwLoading(false);
    if (result.error) { toast({ title: "Fehler", description: result.error, variant: "destructive" }); return; }
    toast({ title: "Passwort wurde zurückgesetzt" });
    setNewPassword("");
  };

  if (!partner) return null;

  const isTrainee = partner.status === "trainee";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} className="text-primary" />
            GP-Profil: {partner.name}
            <Badge className={partner.status === "makler" ? "bg-green-100 text-green-800" : partner.status === "trainee" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"}>
              {partner.status === "makler" ? "Makler" : partner.status === "trainee" ? "Trainee" : "Ehemalig"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Stammdaten */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <User size={14} className="text-primary" /> Stammdaten
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="flex items-center gap-1"><User size={12} /> Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Calendar size={12} /> Geburtsdatum</Label>
                <Input type="date" value={form.geburtsdatum} onChange={e => setForm(f => ({ ...f, geburtsdatum: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Percent size={12} /> Provisionssatz %</Label>
                <Input type="number" step="0.1" value={form.provisionssatz} onChange={e => setForm(f => ({ ...f, provisionssatz: e.target.value }))} placeholder="z.B. 3.0" className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Phone size={12} /> Telefon</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Mail size={12} /> E-Mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </section>

          {/* Performance Widget */}
          <section className="bg-muted/50 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp size={14} className="text-primary" /> Performance
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <Banknote size={18} className="mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{perf.umsatz.toLocaleString("de-AT")} €</p>
                <p className="text-[10px] text-muted-foreground">Umsatz (verkauft)</p>
              </div>
              <div className="text-center">
                <Home size={18} className="mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{perf.objektCount}</p>
                <p className="text-[10px] text-muted-foreground">Objekte gesamt</p>
              </div>
              <div className="text-center">
                <TrendingUp size={18} className="mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{perf.finanzCount}</p>
                <p className="text-[10px] text-muted-foreground">Finanz. genehmigt</p>
              </div>
            </div>
          </section>

          {/* Lernerfolg (nur Trainees) */}
          {isTrainee && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <GraduationCap size={14} className="text-blue-600" /> Lernerfolg
              </h3>
              <Textarea
                value={form.lernerfolg}
                onChange={e => setForm(f => ({ ...f, lernerfolg: e.target.value }))}
                placeholder="Lernfortschritte, Prüfungen, Notizen zum Trainee..."
                rows={4}
              />
            </section>
          )}

          {/* Admin: Passwort zurücksetzen */}
          {partner.user_id && (
            <section className="border-t border-border pt-4 space-y-2">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
                <KeyRound size={14} /> Passwort überschreiben
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Neues Passwort (min. 6 Zeichen)"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Button variant="destructive" size="sm" onClick={handlePasswordReset} disabled={pwLoading}>
                  {pwLoading ? "..." : "Setzen"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Das Passwort des Partners wird sofort überschrieben.</p>
            </section>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save size={16} className="mr-2" /> {saving ? "Speichern..." : "Profil speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
