import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, UserPlus, GraduationCap, UserX, ArrowLeft, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import GPDetailModal from "@/components/GPDetailModal";

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
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
};

const statusLabels: Record<string, string> = {
  makler: "Makler",
  trainee: "Trainee",
  ehemalig: "Ehemalig",
};

const statusColors: Record<string, string> = {
  makler: "bg-green-100 text-green-800",
  trainee: "bg-blue-100 text-blue-800",
  ehemalig: "bg-gray-100 text-gray-500",
};

export default function Team() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "makler", join_date: new Date().toISOString().slice(0, 10) });

  const fetchPartners = async () => {
    const { data } = await supabase.from("geschaeftspartner").select("*").order("name");
    setPartners((data as Partner[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  const counts = {
    makler: partners.filter(p => p.status === "makler").length,
    trainee: partners.filter(p => p.status === "trainee").length,
    ehemalig: partners.filter(p => p.status === "ehemalig").length,
    total: partners.length,
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast({ title: "Name ist erforderlich" }); return; }
    const { error } = await supabase.from("geschaeftspartner").insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      status: form.status,
      join_date: form.join_date,
      created_by: user!.id,
    } as any);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Geschäftspartner angelegt" });
    setForm({ name: "", email: "", phone: "", status: "makler", join_date: new Date().toISOString().slice(0, 10) });
    setDialogOpen(false);
    fetchPartners();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    if (newStatus === "ehemalig") updateData.leave_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("geschaeftspartner").update(updateData).eq("id", id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Status auf "${statusLabels[newStatus]}" geändert` });
    fetchPartners();
  };


  const PartnerTable = ({ list }: { list: Partner[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>E-Mail</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>Beitritt</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Keine Einträge</TableCell></TableRow>
        )}
        {list.map(p => (
          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedPartner(p); setDetailOpen(true); }}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.email || "–"}</TableCell>
            <TableCell>{p.phone || "–"}</TableCell>
            <TableCell>{new Date(p.join_date).toLocaleDateString("de-AT")}</TableCell>
            <TableCell><Badge className={statusColors[p.status]}>{statusLabels[p.status]}</Badge></TableCell>
            <TableCell>
              <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="makler">Makler</SelectItem>
                  <SelectItem value="trainee">Trainee</SelectItem>
                  <SelectItem value="ehemalig">Ehemalig</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-32 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/launchpad")} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-foreground">Team-Dashboard</h1>
      </div>

      {/* KPI-Zähler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 text-center">
            <Users size={28} className="mx-auto text-primary mb-2" />
            <p className="text-3xl font-extrabold text-foreground">{counts.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Gesamt-GPs</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-5 text-center">
            <Users size={28} className="mx-auto text-green-600 mb-2" />
            <p className="text-3xl font-extrabold text-foreground">{counts.makler}</p>
            <p className="text-xs text-muted-foreground mt-1">Aktive Makler</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-5 text-center">
            <GraduationCap size={28} className="mx-auto text-blue-600 mb-2" />
            <p className="text-3xl font-extrabold text-foreground">{counts.trainee}</p>
            <p className="text-xs text-muted-foreground mt-1">Trainees in Ausbildung</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-muted/30">
          <CardContent className="p-5 text-center">
            <UserX size={28} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-3xl font-extrabold text-foreground">{counts.ehemalig}</p>
            <p className="text-xs text-muted-foreground mt-1">Ehemalige</p>
          </CardContent>
        </Card>
      </div>

      {/* Neuen GP anlegen */}
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus size={16} className="mr-1" /> Neuen GP anlegen
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="makler">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="makler">Makler ({counts.makler})</TabsTrigger>
          <TabsTrigger value="trainee">Trainees ({counts.trainee})</TabsTrigger>
          <TabsTrigger value="ehemalig">Ehemalige ({counts.ehemalig})</TabsTrigger>
        </TabsList>
        <TabsContent value="makler"><PartnerTable list={partners.filter(p => p.status === "makler")} /></TabsContent>
        <TabsContent value="trainee"><PartnerTable list={partners.filter(p => p.status === "trainee")} /></TabsContent>
        <TabsContent value="ehemalig"><PartnerTable list={partners.filter(p => p.status === "ehemalig")} /></TabsContent>
      </Tabs>

      {/* Dialog: Neuen GP anlegen */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuen Geschäftspartner anlegen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>E-Mail</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="makler">Makler</SelectItem>
                  <SelectItem value="trainee">Trainee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Beitrittsdatum</Label><Input type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} /></div>
            <Button onClick={handleCreate} className="w-full">Anlegen</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* GP Detail Modal */}
      <GPDetailModal
        partner={selectedPartner}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSaved={() => { fetchPartners(); setDetailOpen(false); }}
      />
    </div>
  );
}
