import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  User, Calendar, Phone, Mail, Percent, KeyRound, TrendingUp,
  Home, Banknote, GraduationCap, Save, Eye, EyeOff, MapPin,
  Upload, ShoppingCart, Package, CheckCircle2, Pencil, Building2, ArrowRightLeft
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
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  gp_number?: string | null;
};

type PerformanceData = {
  umsatz: number;
  objektCount: number;
  finanzCount: number;
};

type Bestellung = {
  id: string;
  produkt: string;
  menge: number;
  status: string;
  created_at: string;
  bestellt_am: string | null;
  abgeschlossen_am: string | null;
};

type AssignedObjekt = {
  id: string;
  objektnummer: string | null;
  objektart: string | null;
  strasse: string | null;
  hnr: string | null;
  plz: string | null;
  ort: string | null;
  kaufpreis: number | null;
  status: string | null;
  flaeche_m2: number | null;
  zimmer: number | null;
};

type GPOption = { id: string; name: string; status: string };

interface GPDetailModalProps {
  partner: Partner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function GPDetailModal({ partner, open, onOpenChange, onSaved }: GPDetailModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", geburtsdatum: "", provisionssatz: "", lernerfolg: "",
    strasse: "", hausnummer: "", plz: "", ort: "", gp_number: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perf, setPerf] = useState<PerformanceData>({ umsatz: 0, objektCount: 0, finanzCount: 0 });
  const [perfEditing, setPerfEditing] = useState(false);
  const [perfForm, setPerfForm] = useState<PerformanceData>({ umsatz: 0, objektCount: 0, finanzCount: 0 });
  const [statusVal, setStatusVal] = useState("makler");
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; path: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Assigned objects state
  const [assignedObjekte, setAssignedObjekte] = useState<AssignedObjekt[]>([]);
  const [gpOptions, setGpOptions] = useState<GPOption[]>([]);
  const [transferObjektId, setTransferObjektId] = useState<string | null>(null);
  const [transferTargetId, setTransferTargetId] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!partner) return;
    setForm({
      name: partner.name || "",
      email: partner.email || "",
      phone: partner.phone || "",
      geburtsdatum: partner.geburtsdatum || "",
      provisionssatz: partner.provisionssatz != null ? String(partner.provisionssatz) : "",
      lernerfolg: partner.lernerfolg || "",
      strasse: partner.strasse || "",
      hausnummer: partner.hausnummer || "",
      plz: partner.plz || "",
      ort: partner.ort || "",
      gp_number: partner.gp_number || "",
    });
    setStatusVal(partner.status);
    setNewPassword("");
    setPerfEditing(false);
    setTransferObjektId(null);
    loadPerformance(partner);
    loadBestellungen(partner);
    loadUploadedFiles(partner);
    loadAssignedObjekte(partner);
    loadGpOptions();
  }, [partner]);

  const loadPerformance = async (p: Partner) => {
    // Use gp_id-based query for assigned objects
    const [objRes, finRes] = await Promise.all([
      supabase.from("objekte").select("kaufpreis, status").eq("gp_id", p.id),
      p.user_id
        ? supabase.from("crm_kunden").select("id, finance_status").eq("user_id", p.user_id)
        : Promise.resolve({ data: [] }),
    ]);
    const objekte = (objRes.data as any[]) || [];
    const kunden = ((finRes as any).data as any[]) || [];
    const verkauft = objekte.filter(o => o.status === "verkauft");
    const umsatz = verkauft.reduce((s: number, o: any) => s + (Number(o.kaufpreis) || 0), 0);
    const finanzCount = kunden.filter((k: any) => k.finance_status === "genehmigt").length;
    const data = { umsatz, objektCount: objekte.length, finanzCount };
    setPerf(data);
    setPerfForm(data);
  };

  const loadBestellungen = async (p: Partner) => {
    if (!p.user_id) { setBestellungen([]); return; }
    const { data } = await supabase.from("bestellungen").select("*").eq("user_id", p.user_id).order("created_at", { ascending: false });
    setBestellungen((data as Bestellung[]) || []);
  };

  const loadUploadedFiles = async (p: Partner) => {
    const { data } = await supabase.storage.from("gp-werbemittel").list(`${p.id}/`);
    setUploadedFiles((data || []).map(f => ({ name: f.name, path: `${p.id}/${f.name}` })));
  };

  const loadAssignedObjekte = async (p: Partner) => {
    const { data } = await supabase.from("objekte").select("id, objektnummer, objektart, strasse, hnr, plz, ort, kaufpreis, status, flaeche_m2, zimmer").eq("gp_id", p.id).order("created_at", { ascending: false });
    setAssignedObjekte((data as AssignedObjekt[]) || []);
  };

  const loadGpOptions = async () => {
    const { data } = await supabase.from("geschaeftspartner").select("id, name, status").neq("status", "ehemalig").order("name");
    setGpOptions((data as GPOption[]) || []);
  };

  const handleTransfer = async (objektId: string, targetGpId: string) => {
    if (!partner || !user) return;
    const targetGp = gpOptions.find(g => g.id === targetGpId);
    const { error } = await supabase.from("objekte").update({ gp_id: targetGpId } as any).eq("id", objektId);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }

    // Notify the target GP
    const { data: gpData } = await supabase.from("geschaeftspartner").select("user_id").eq("id", targetGpId).single();
    if (gpData?.user_id) {
      const obj = assignedObjekte.find(o => o.id === objektId);
      const addr = obj ? [obj.strasse, obj.hnr, obj.plz, obj.ort].filter(Boolean).join(", ") : "Objekt";
      await supabase.from("nachrichten").insert({
        user_id: user.id,
        empfaenger_id: gpData.user_id,
        titel: "Neues Objekt zugewiesen",
        inhalt: `Dir wurde das Objekt "${addr}" zugewiesen.`,
        typ: "system",
      });
    }

    toast({ title: `Objekt an ${targetGp?.name || "GP"} übertragen` });
    setTransferObjektId(null);
    setTransferTargetId("");
    loadAssignedObjekte(partner);
    loadPerformance(partner);
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
      strasse: form.strasse || null,
      hausnummer: form.hausnummer || null,
      plz: form.plz || null,
      ort: form.ort || null,
      gp_number: form.gp_number || null,
    } as any).eq("id", partner.id);
    setSaving(false);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Profil gespeichert" });
    onSaved();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!partner) return;
    const updateData: any = { status: newStatus };
    if (newStatus === "ehemalig") updateData.leave_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("geschaeftspartner").update(updateData).eq("id", partner.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    setStatusVal(newStatus);
    toast({ title: `Status auf "${newStatus === "makler" ? "Makler" : newStatus === "trainee" ? "Trainee" : "Ehemalig"}" geändert` });
    onSaved();
  };

  const handlePasswordReset = async () => {
    if (!partner?.user_id) { toast({ title: "Kein Benutzerkonto verknüpft", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Mindestens 6 Zeichen", variant: "destructive" }); return; }
    setPwLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ user_id: partner.user_id, new_password: newPassword }),
    });
    const result = await res.json();
    setPwLoading(false);
    if (result.error) { toast({ title: "Fehler", description: result.error, variant: "destructive" }); return; }
    toast({ title: "Passwort wurde zurückgesetzt" });
    setNewPassword("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!partner || !e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `${partner.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("gp-werbemittel").upload(path, file);
    setUploading(false);
    if (error) { toast({ title: "Upload fehlgeschlagen", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Datei hochgeladen" });
    loadUploadedFiles(partner);
  };

  const handleOrderFile = async (filePath: string, fileName: string) => {
    if (!partner?.user_id) { toast({ title: "Kein Benutzerkonto verknüpft – Bestellung nicht möglich", variant: "destructive" }); return; }
    const { error } = await supabase.from("bestellungen").insert({
      user_id: partner.user_id,
      produkt: `Werbemittel: ${fileName}`,
      menge: 1,
      status: "offen",
    } as any);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bestellung als 'Pending Order' gespeichert" });
    loadBestellungen(partner);
  };

  const handlePerfSave = () => {
    setPerf({ ...perfForm });
    setPerfEditing(false);
    toast({ title: "Performance-Daten manuell überschrieben" });
  };

  if (!partner) return null;

  const isTrainee = statusVal === "trainee";
  const statusBadge = statusVal === "makler" ? "bg-green-100 text-green-800" : statusVal === "trainee" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground";
  const statusLabel = statusVal === "makler" ? "Makler" : statusVal === "trainee" ? "Trainee" : "Ehemalig";

  const bestellStatusIcon = (s: string) => {
    if (s === "offen") return <Package size={14} className="text-yellow-600" />;
    if (s === "bestellt") return <ShoppingCart size={14} className="text-blue-600" />;
    return <CheckCircle2 size={14} className="text-green-600" />;
  };

  const objStatusBadge: Record<string, string> = {
    aktiv: "bg-green-100 text-green-800",
    reserviert: "bg-amber-100 text-amber-800",
    verkauft: "bg-red-100 text-red-800",
    vermietet: "bg-blue-100 text-blue-800",
    entwurf: "bg-orange-100 text-orange-800",
    deaktiviert: "bg-muted text-muted-foreground",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} className="text-primary" />
            GP-Profil: {partner.name}
            <Badge className={statusBadge}>{statusLabel}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="uebersicht" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
            <TabsTrigger value="objekte">Objekte ({assignedObjekte.length})</TabsTrigger>
            <TabsTrigger value="werbemittel">Werbemittel</TabsTrigger>
            {isTrainee && <TabsTrigger value="ausbildung">Ausbildung</TabsTrigger>}
          </TabsList>

          {/* TAB 1: Übersicht – 2 Spalten */}
          <TabsContent value="uebersicht" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Linke Spalte: Stammdaten */}
              <div className="space-y-4">
                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <User size={14} className="text-primary" /> Stammdaten
                  </h3>
                   <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-1"><User size={12} /> Name</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1 text-xs font-bold">GP-Nr.</Label>
                      <Input value={form.gp_number} onChange={e => setForm(f => ({ ...f, gp_number: e.target.value }))} placeholder="z.B. 001" className="mt-1 font-mono" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><Calendar size={12} /> Geburtsdatum</Label>
                      <Input type="date" value={form.geburtsdatum} onChange={e => setForm(f => ({ ...f, geburtsdatum: e.target.value }))} className="mt-1" />
                    </div>

                    {/* Provisionssatz – hervorgehoben */}
                    <div>
                      <Label className="flex items-center gap-1"><Percent size={12} /> Provisionssatz %</Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          step="0.1"
                          value={form.provisionssatz}
                          onChange={e => setForm(f => ({ ...f, provisionssatz: e.target.value }))}
                          placeholder="z.B. 3.0"
                          className="bg-primary/10 border-primary/30 font-bold text-lg pl-9"
                        />
                        <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      </div>
                    </div>

                    {/* Telefon – klickbar */}
                    <div>
                      <Label className="flex items-center gap-1"><Phone size={12} /> Telefon</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                      {form.phone && (
                        <a href={`tel:${form.phone}`} className="text-xs text-primary hover:underline mt-0.5 inline-flex items-center gap-1">
                          <Phone size={10} /> Anrufen
                        </a>
                      )}
                    </div>

                    {/* E-Mail – klickbar */}
                    <div>
                      <Label className="flex items-center gap-1"><Mail size={12} /> E-Mail</Label>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                      {form.email && (
                        <a href={`mailto:${form.email}`} className="text-xs text-primary hover:underline mt-0.5 inline-flex items-center gap-1">
                          <Mail size={10} /> Mail senden
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Adresse */}
                  <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 pt-2">
                    <MapPin size={12} /> Adresse
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label>Straße</Label>
                      <Input value={form.strasse} onChange={e => setForm(f => ({ ...f, strasse: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Hausnr.</Label>
                      <Input value={form.hausnummer} onChange={e => setForm(f => ({ ...f, hausnummer: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>PLZ</Label>
                      <Input value={form.plz} onChange={e => setForm(f => ({ ...f, plz: e.target.value }))} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Ort</Label>
                      <Input value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                </section>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save size={16} className="mr-2" /> {saving ? "Speichern..." : "Profil speichern"}
                </Button>
              </div>

              {/* Rechte Spalte: Performance + Admin */}
              <div className="space-y-4">
                {/* Performance Widget */}
                <section className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-primary" /> Performance
                    <button onClick={() => { setPerfEditing(!perfEditing); setPerfForm({ ...perf }); }} className="ml-auto text-muted-foreground hover:text-foreground">
                      <Pencil size={14} />
                    </button>
                  </h3>
                  {perfEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Umsatz (€)</Label>
                        <Input type="number" value={perfForm.umsatz} onChange={e => setPerfForm(f => ({ ...f, umsatz: Number(e.target.value) }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Objekte gesamt</Label>
                        <Input type="number" value={perfForm.objektCount} onChange={e => setPerfForm(f => ({ ...f, objektCount: Number(e.target.value) }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Finanzierungen genehmigt</Label>
                        <Input type="number" value={perfForm.finanzCount} onChange={e => setPerfForm(f => ({ ...f, finanzCount: Number(e.target.value) }))} className="mt-1" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handlePerfSave} className="flex-1">Übernehmen</Button>
                        <Button size="sm" variant="outline" onClick={() => setPerfEditing(false)} className="flex-1">Abbrechen</Button>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </section>

                {/* Admin-Einstellungen */}
                <section className="border border-border rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound size={14} className="text-destructive" /> Admin-Einstellungen
                  </h3>

                  {/* Rolle ändern */}
                  <div>
                    <Label className="text-xs">Rolle ändern</Label>
                    <Select value={statusVal} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="makler">Makler</SelectItem>
                        <SelectItem value="trainee">Trainee</SelectItem>
                        <SelectItem value="ehemalig">Ehemalig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Passwort zurücksetzen */}
                  {partner.user_id && (
                    <div>
                      <Label className="text-xs">Passwort überschreiben</Label>
                      <div className="flex gap-2 mt-1">
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
                      <p className="text-[10px] text-muted-foreground mt-1">Das Passwort wird sofort überschrieben.</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Zugeordnete Objekte */}
          <TabsContent value="objekte" className="space-y-4 mt-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Building2 size={14} className="text-primary" /> Zugeordnete Objekte
            </h3>
            {assignedObjekte.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Diesem GP sind noch keine Objekte zugewiesen.</p>
            ) : (
              <div className="space-y-2">
                {assignedObjekte.map(obj => {
                  const addr = [obj.strasse, obj.hnr, obj.plz, obj.ort].filter(Boolean).join(", ");
                  return (
                    <div key={obj.id} className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 border border-border">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Home size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{addr || obj.objektart || "Objekt"}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{obj.objektnummer}</span>
                          {obj.objektart && <span>· {obj.objektart}</span>}
                          {obj.flaeche_m2 && <span>· {obj.flaeche_m2}m²</span>}
                          {obj.zimmer && <span>· {obj.zimmer} Zi.</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {obj.kaufpreis && (
                          <span className="text-xs font-bold text-primary">€{Number(obj.kaufpreis).toLocaleString("de-AT")}</span>
                        )}
                        <Badge className={`text-[10px] ${objStatusBadge[obj.status || "aktiv"] || "bg-muted text-muted-foreground"}`}>
                          {(obj.status || "aktiv").charAt(0).toUpperCase() + (obj.status || "aktiv").slice(1)}
                        </Badge>
                        {/* Transfer button */}
                        <button
                          onClick={() => setTransferObjektId(transferObjektId === obj.id ? null : obj.id)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                          title="Objekt übertragen"
                        >
                          <ArrowRightLeft size={14} className="text-muted-foreground hover:text-primary" />
                        </button>
                      </div>
                      {/* Transfer dropdown */}
                      {transferObjektId === obj.id && (
                        <div className="absolute right-4 mt-24 bg-card border border-border rounded-xl shadow-lg z-50 w-56 p-3" onClick={e => e.stopPropagation()}>
                          <p className="text-xs font-semibold mb-2">Übertragen an:</p>
                          <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                            <SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder="GP auswählen…" /></SelectTrigger>
                            <SelectContent>
                              {gpOptions.filter(g => g.id !== partner.id).map(g => (
                                <SelectItem key={g.id} value={g.id}>{g.name} ({g.status})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            disabled={!transferTargetId}
                            onClick={() => handleTransfer(obj.id, transferTargetId)}
                          >
                            <ArrowRightLeft size={12} className="mr-1" /> Übertragen
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center bg-muted/30 rounded-lg p-3">
                <p className="text-xl font-bold">{assignedObjekte.length}</p>
                <p className="text-[10px] text-muted-foreground">Gesamt</p>
              </div>
              <div className="text-center bg-green-50 rounded-lg p-3">
                <p className="text-xl font-bold text-green-700">{assignedObjekte.filter(o => o.status === "aktiv").length}</p>
                <p className="text-[10px] text-muted-foreground">Aktiv</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-3">
                <p className="text-xl font-bold text-red-700">{assignedObjekte.filter(o => o.status === "verkauft").length}</p>
                <p className="text-[10px] text-muted-foreground">Verkauft</p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Werbemittel */}
          <TabsContent value="werbemittel" className="space-y-5 mt-4">
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Upload size={14} className="text-primary" /> Personalisierte Designs
              </h3>
              {isAdmin && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input type="file" id="gp-upload" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.ai,.psd" />
                  <label htmlFor="gp-upload" className="cursor-pointer space-y-2 block">
                    <Upload size={28} className="mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Design-Datei hier ablegen oder klicken</p>
                    <p className="text-[10px] text-muted-foreground">PDF, Bild, AI, PSD</p>
                  </label>
                  {uploading && <p className="text-xs text-primary mt-2">Wird hochgeladen…</p>}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">Verfügbare Dateien</h4>
                  {uploadedFiles.map(f => (
                    <div key={f.path} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-sm truncate flex-1">{f.name}</span>
                      <Button size="sm" variant="outline" onClick={() => handleOrderFile(f.path, f.name)}>
                        <ShoppingCart size={14} className="mr-1" /> Jetzt bestellen
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Package size={14} className="text-primary" /> Bestell-Verlauf
              </h3>
              {bestellungen.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Keine Bestellungen vorhanden</p>
              ) : (
                <div className="space-y-2">
                  {bestellungen.map(b => (
                    <div key={b.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                      {bestellStatusIcon(b.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.produkt}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString("de-AT")} · Menge: {b.menge}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {b.status === "offen" ? "Offen" : b.status === "bestellt" ? "Bestellt" : "Abgeschlossen"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* TAB 4: Ausbildung (nur Trainees) */}
          {isTrainee && (
            <TabsContent value="ausbildung" className="space-y-5 mt-4">
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-blue-600" /> Lernerfolg & Ausbildung
                </h3>
                <Textarea
                  value={form.lernerfolg}
                  onChange={e => setForm(f => ({ ...f, lernerfolg: e.target.value }))}
                  placeholder="Lernfortschritte, Prüfungen, Notizen zum Trainee..."
                  rows={8}
                />
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save size={16} className="mr-2" /> {saving ? "Speichern..." : "Lernerfolg speichern"}
                </Button>
              </section>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
