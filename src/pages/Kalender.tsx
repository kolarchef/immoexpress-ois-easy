import { useState, useEffect, useRef } from "react";
import { Plus, MapPin, Shield, Clock, Trash2, Upload, FileText, Download, Users, Check, HelpCircle, X, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Meeting {
  id: string;
  titel: string;
  datum: string;
  uhrzeit: string;
  zielgruppe: string;
  beschreibung: string | null;
  created_by: string;
  created_at: string;
}

interface MeetingFile {
  id: string;
  meeting_id: string;
  dateiname: string;
  storage_path: string;
}

interface MeetingResponse {
  id: string;
  meeting_id: string;
  user_id: string;
  status: string;
  notiz: string | null;
}

interface GpProfile {
  id: string;
  name: string;
  user_id: string | null;
  status: string;
}

export default function Kalender() {
  const { user } = useAuth();
  const [ansicht, setAnsicht] = useState<"Termine" | "Meetings">("Meetings");
  const [heute] = useState(new Date());
  const [termine, setTermine] = useState<Termin[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingFiles, setMeetingFiles] = useState<Record<string, MeetingFile[]>>({});
  const [meetingResponses, setMeetingResponses] = useState<Record<string, MeetingResponse[]>>({});
  const [myResponses, setMyResponses] = useState<Record<string, MeetingResponse>>({});
  const [gpProfiles, setGpProfiles] = useState<Record<string, GpProfile>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  // Termin form
  const [addOpen, setAddOpen] = useState(false);
  const [newTitel, setNewTitel] = useState("");
  const [newDatum, setNewDatum] = useState(new Date().toISOString().slice(0, 10));
  const [newUhrzeit, setNewUhrzeit] = useState("10:00");
  const [newOrt, setNewOrt] = useState("");
  const [newDauer, setNewDauer] = useState("60");

  // Meeting form
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [mTitel, setMTitel] = useState("");
  const [mDatum, setMDatum] = useState(new Date().toISOString().slice(0, 10));
  const [mUhrzeit, setMUhrzeit] = useState("10:00");
  const [mZielgruppe, setMZielgruppe] = useState("alle");
  const [mBeschreibung, setMBeschreibung] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Response note editing
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const monat = monate[heute.getMonth()];
  const jahr = heute.getFullYear();
  const dayOfWeek = heute.getDay() || 7;

  const wochenDaten = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(heute);
    d.setDate(heute.getDate() - (dayOfWeek - 1) + i);
    return { tag: d.getDate(), aktiv: i + 1 === dayOfWeek, datum: d.toISOString().slice(0, 10) };
  });

  useEffect(() => {
    if (!user) return;
    checkAdmin();
    loadTermine();
    loadMeetings();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
    setIsAdmin(!!data);
  };

  const loadTermine = async () => {
    const { data } = await supabase.from("termine").select("*").order("datum").order("uhrzeit");
    if (data) setTermine(data as Termin[]);
  };

  const loadMeetings = async () => {
    const { data: meetingsData } = await supabase
      .from("meetings" as any)
      .select("*")
      .order("datum", { ascending: false });
    if (!meetingsData) return;
    setMeetings(meetingsData as any[]);

    const ids = (meetingsData as any[]).map((m: any) => m.id);
    if (ids.length === 0) return;

    // Load files
    const { data: filesData } = await supabase
      .from("meeting_files" as any)
      .select("*")
      .in("meeting_id", ids);
    if (filesData) {
      const grouped: Record<string, MeetingFile[]> = {};
      (filesData as any[]).forEach((f: any) => {
        if (!grouped[f.meeting_id]) grouped[f.meeting_id] = [];
        grouped[f.meeting_id].push(f);
      });
      setMeetingFiles(grouped);
    }

    // Load responses
    const { data: respData } = await supabase
      .from("meeting_responses" as any)
      .select("*")
      .in("meeting_id", ids);
    if (respData) {
      const grouped: Record<string, MeetingResponse[]> = {};
      const mine: Record<string, MeetingResponse> = {};
      (respData as any[]).forEach((r: any) => {
        if (!grouped[r.meeting_id]) grouped[r.meeting_id] = [];
        grouped[r.meeting_id].push(r);
        if (r.user_id === user!.id) mine[r.meeting_id] = r;
      });
      setMeetingResponses(grouped);
      setMyResponses(mine);
    }

    // Load GP profiles for participant names (admin only)
    const { data: gps } = await supabase.from("geschaeftspartner").select("id, name, user_id, status");
    if (gps) {
      const map: Record<string, GpProfile> = {};
      gps.forEach((g: any) => { if (g.user_id) map[g.user_id] = g; });
      setGpProfiles(map);
    }
  };

  const heuteStr = heute.toISOString().slice(0, 10);
  const tagesTermine = termine.filter(t => t.datum === heuteStr);

  const addTermin = async () => {
    if (!user || !newTitel.trim()) return;
    const { error } = await supabase.from("termine").insert({
      user_id: user.id, titel: newTitel, datum: newDatum, uhrzeit: newUhrzeit,
      dauer_min: Number(newDauer) || 60, ort: newOrt || null,
    });
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✅ Termin erstellt" });
    setNewTitel(""); setNewOrt(""); setAddOpen(false);
    loadTermine();
  };

  const deleteTermin = async (id: string) => {
    await supabase.from("termine").delete().eq("id", id);
    loadTermine();
  };

  const createMeeting = async () => {
    if (!user || !mTitel.trim()) return;
    const { data, error } = await supabase.from("meetings" as any).insert({
      titel: mTitel, datum: mDatum, uhrzeit: mUhrzeit, zielgruppe: mZielgruppe,
      beschreibung: mBeschreibung || null, created_by: user.id,
    } as any).select().single();
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }

    // Upload pending files
    if (pendingFiles.length > 0 && data) {
      setUploadingFiles(true);
      for (const file of pendingFiles) {
        const path = `${(data as any).id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("meeting-files").upload(path, file);
        if (!uploadErr) {
          await supabase.from("meeting_files" as any).insert({
            meeting_id: (data as any).id, dateiname: file.name, storage_path: path,
          } as any);
        }
      }
      setUploadingFiles(false);
    }

    toast({ title: "✅ Meeting erstellt" });
    setMTitel(""); setMBeschreibung(""); setPendingFiles([]); setMeetingOpen(false);
    loadMeetings();
  };

  const deleteMeeting = async (id: string) => {
    // Delete storage files first
    const files = meetingFiles[id] || [];
    for (const f of files) {
      await supabase.storage.from("meeting-files").remove([f.storage_path]);
    }
    await supabase.from("meeting_files" as any).delete().eq("meeting_id", id);
    await supabase.from("meeting_responses" as any).delete().eq("meeting_id", id);
    await supabase.from("meetings" as any).delete().eq("id", id);
    loadMeetings();
    toast({ title: "Meeting gelöscht" });
  };

  const respondToMeeting = async (meetingId: string, status: string) => {
    if (!user) return;
    const existing = myResponses[meetingId];
    if (existing) {
      await supabase.from("meeting_responses" as any).update({ status } as any).eq("id", existing.id);
    } else {
      await supabase.from("meeting_responses" as any).insert({
        meeting_id: meetingId, user_id: user.id, status,
      } as any);
    }
    loadMeetings();
  };

  const saveNote = async (meetingId: string) => {
    if (!user) return;
    const existing = myResponses[meetingId];
    if (existing) {
      await supabase.from("meeting_responses" as any).update({ notiz: noteText } as any).eq("id", existing.id);
    } else {
      await supabase.from("meeting_responses" as any).insert({
        meeting_id: meetingId, user_id: user.id, status: "teilnehmen", notiz: noteText,
      } as any);
    }
    setEditingNoteFor(null);
    setNoteText("");
    loadMeetings();
    toast({ title: "Notiz gespeichert" });
  };

  const downloadFile = async (path: string, name: string) => {
    const { data } = await supabase.storage.from("meeting-files").download(path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const uploadFilesToMeeting = async (meetingId: string, files: FileList) => {
    setUploadingFiles(true);
    for (const file of Array.from(files)) {
      const path = `${meetingId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("meeting-files").upload(path, file);
      if (!error) {
        await supabase.from("meeting_files" as any).insert({
          meeting_id: meetingId, dateiname: file.name, storage_path: path,
        } as any);
      }
    }
    setUploadingFiles(false);
    loadMeetings();
    toast({ title: "Dateien hochgeladen" });
  };

  const zielgruppeLabel = (z: string) => {
    if (z === "alle") return "Alle";
    if (z === "makler") return "Makler";
    if (z === "trainees") return "Trainees";
    return z;
  };

  const statusColor = (s: string) => {
    if (s === "teilnehmen") return "bg-green-500";
    if (s === "vielleicht") return "bg-yellow-500";
    return "bg-red-500";
  };

  const getGpName = (userId: string) => gpProfiles[userId]?.name || "Unbekannt";

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto" style={{ paddingBottom: 200 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock size={18} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{monat} {jahr}</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={ansicht} onValueChange={(v) => setAnsicht(v as any)} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="Meetings" className="flex-1">Meetings</TabsTrigger>
          <TabsTrigger value="Termine" className="flex-1">Meine Termine</TabsTrigger>
        </TabsList>

        {/* ─── MEETINGS TAB ─── */}
        <TabsContent value="Meetings" className="space-y-4 mt-4">
          {/* Admin: Create Meeting */}
          {isAdmin && (
            <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2"><Plus size={16} /> Neues Meeting erstellen</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Neues Meeting</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Titel *</Label><Input value={mTitel} onChange={e => setMTitel(e.target.value)} placeholder="Meeting-Titel" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Datum</Label><Input type="date" value={mDatum} onChange={e => setMDatum(e.target.value)} /></div>
                    <div><Label>Uhrzeit</Label><Input type="time" value={mUhrzeit} onChange={e => setMUhrzeit(e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Zielgruppe</Label>
                    <Select value={mZielgruppe} onValueChange={setMZielgruppe}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alle">Alle</SelectItem>
                        <SelectItem value="makler">Makler</SelectItem>
                        <SelectItem value="trainees">Trainees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Beschreibung</Label><Textarea value={mBeschreibung} onChange={e => setMBeschreibung(e.target.value)} placeholder="Optional" rows={3} /></div>

                  {/* File Upload */}
                  <div>
                    <Label>Dokumente anhängen</Label>
                    <div
                      className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={20} className="mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">PPT, PDF, Video, Word, Excel …</p>
                      <input ref={fileInputRef} type="file" multiple className="hidden"
                        accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi"
                        onChange={e => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                      />
                    </div>
                    {pendingFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {pendingFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-1.5">
                            <FileText size={14} className="text-primary" />
                            <span className="flex-1 truncate">{f.name}</span>
                            <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={createMeeting} className="w-full" disabled={!mTitel.trim() || uploadingFiles}>
                    {uploadingFiles ? "Wird hochgeladen…" : "Meeting erstellen"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Meeting List */}
          {meetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Keine Meetings vorhanden</div>
          ) : (
            meetings.map(m => {
              const files = meetingFiles[m.id] || [];
              const responses = meetingResponses[m.id] || [];
              const myResp = myResponses[m.id];
              const teilnehmer = responses.filter(r => r.status === "teilnehmen");
              const vielleicht = responses.filter(r => r.status === "vielleicht");
              const absagen = responses.filter(r => r.status === "absage");

              return (
                <div key={m.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  {/* Meeting Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-primary font-bold tabular-nums">{m.uhrzeit?.slice(0, 5)}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {new Date(m.datum).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                            {zielgruppeLabel(m.zielgruppe)}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-foreground">{m.titel}</h3>
                        {m.beschreibung && <p className="text-sm text-muted-foreground mt-1">{m.beschreibung}</p>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => deleteMeeting(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Quick stats */}
                    <div className="flex gap-3 mt-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>{teilnehmer.length} Zusagen</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>{vielleicht.length} Vielleicht</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{absagen.length} Absagen</span>
                    </div>
                  </div>

                  {/* Files */}
                  {files.length > 0 && (
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">📎 Dokumente</p>
                      <div className="space-y-1">
                        {files.map(f => (
                          <button key={f.id} onClick={() => downloadFile(f.storage_path, f.dateiname)}
                            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors w-full text-left">
                            <Download size={14} className="text-primary" />
                            <span className="truncate">{f.dateiname}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin file upload to existing meeting */}
                  {isAdmin && (
                    <div className="px-4 py-2 border-b border-border">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors">
                        <Upload size={14} />
                        <span>Datei hinzufügen</span>
                        <input type="file" multiple className="hidden"
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi"
                          onChange={e => { if (e.target.files) uploadFilesToMeeting(m.id, e.target.files); }}
                        />
                      </label>
                    </div>
                  )}

                  {/* Interaction Bar */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex gap-2">
                      <Button size="sm" variant={myResp?.status === "teilnehmen" ? "default" : "outline"}
                        className={myResp?.status === "teilnehmen" ? "bg-green-600 hover:bg-green-700 text-white flex-1" : "flex-1 border-green-300 text-green-700 hover:bg-green-50"}
                        onClick={() => respondToMeeting(m.id, "teilnehmen")}>
                        <Check size={14} /> Teilnehmen
                      </Button>
                      <Button size="sm" variant={myResp?.status === "vielleicht" ? "default" : "outline"}
                        className={myResp?.status === "vielleicht" ? "bg-yellow-500 hover:bg-yellow-600 text-white flex-1" : "flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"}
                        onClick={() => respondToMeeting(m.id, "vielleicht")}>
                        <HelpCircle size={14} /> Vielleicht
                      </Button>
                      <Button size="sm" variant={myResp?.status === "absage" ? "default" : "outline"}
                        className={myResp?.status === "absage" ? "bg-red-600 hover:bg-red-700 text-white flex-1" : "flex-1 border-red-300 text-red-700 hover:bg-red-50"}
                        onClick={() => respondToMeeting(m.id, "absage")}>
                        <X size={14} /> Absagen
                      </Button>
                    </div>

                    {/* Note */}
                    <div className="mt-2">
                      {editingNoteFor === m.id ? (
                        <div className="flex gap-2">
                          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Deine Notiz…" rows={2} className="flex-1 text-sm" />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => saveNote(m.id)}>Speichern</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNoteFor(null)}>Abbrechen</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNoteFor(m.id); setNoteText(myResp?.notiz || ""); }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {myResp?.notiz ? `📝 ${myResp.notiz}` : "📝 Notiz hinzufügen…"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Admin: Participant List */}
                  {isAdmin && responses.length > 0 && (
                    <div className="px-4 py-3 bg-muted/20">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Users size={14} /> Teilnehmer-Übersicht
                      </p>
                      <div className="space-y-1.5">
                        {responses.map(r => (
                          <div key={r.id} className="flex items-center gap-2 text-sm">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusColor(r.status)}`}></span>
                            <span className="font-medium text-foreground">{getGpName(r.user_id)}</span>
                            <span className="text-xs text-muted-foreground capitalize">({r.status === "teilnehmen" ? "Zusage" : r.status === "vielleicht" ? "Vielleicht" : "Absage"})</span>
                            {r.notiz && <span className="text-xs text-muted-foreground ml-auto italic">„{r.notiz}"</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ─── TERMINE TAB ─── */}
        <TabsContent value="Termine" className="mt-4">
          {/* Wochenübersicht */}
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border mb-4">
            <div className="grid grid-cols-7 gap-1">
              {wochentage.map((wt, i) => (
                <div key={wt} className="text-center">
                  <div className="text-xs text-muted-foreground font-medium mb-2">{wt}</div>
                  <button className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    wochenDaten[i]?.aktiv ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"
                  }`}>
                    {wochenDaten[i]?.tag}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Termine List */}
          <div className="space-y-3">
            {tagesTermine.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Keine Termine heute</div>
            ) : (
              tagesTermine.map(t => (
                <div key={t.id} className={`relative rounded-2xl border overflow-hidden shadow-sm ${
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
                            t.typ === "notar" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
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
              <button className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-all active:scale-90 z-20">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
