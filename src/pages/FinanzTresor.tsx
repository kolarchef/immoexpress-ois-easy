import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Shield, Lock, FileText, Upload, Download, Trash2, Loader2,
  User, Home, MapPin, Euro, Phone, Mail, StickyNote, FileSpreadsheet,
  File, Building, Save, ChevronRight, AlertTriangle, CircleCheck, Circle,
  Plus, History, Send, MessageSquare, Paperclip, FolderOpen, Pencil, Link, Copy,
  Archive, CircleDot, UserPlus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Kunde = {
  id: string; name: string; email: string | null; phone: string | null;
  typ: string | null; ort: string | null; budget: string | null; status: string | null;
  notiz: string | null; finance_shared: boolean;
  objekt_id: string | null;
  finance_status: string | null;
  ablehnungsgrund_bank: string | null;
  user_id: string | null;
};

type Objekt = {
  id: string; strasse: string | null; hnr: string | null; plz: string | null;
  ort: string | null; objektart: string | null; zimmer: number | null;
  flaeche_m2: number | null; kaufpreis: number | null; status: string | null;
  objektnummer: string | null; kurzinfo: string | null;
  beschreibung: string | null; stock: string | null; top: string | null;
};

type TresorNotiz = { id: string; notiz: string; created_at: string; updated_at: string };
type TresorUpload = { id: string; dateiname: string; storage_path: string; created_at: string };
type CrmDok = { id: string; dateiname: string; storage_path: string; created_at: string };
type KundenUploadDoc = { id: string; dateiname: string | null; dokument_typ: string; storage_path: string | null; erstellt_am: string };

const CHECKLIST_ITEMS = [
  { key: "grundbuch", label: "Grundbuchauszug", pflicht: true, patterns: ["grundbuch"] },
  { key: "gehalt", label: "Gehaltszettel (3 Monate)", pflicht: true, patterns: ["gehalt", "lohn", "einkommens"] },
  { key: "ausweis", label: "Lichtbildausweis", pflicht: true, patterns: ["ausweis", "reisepass", "führerschein", "personalausweis"] },
  { key: "objektdaten", label: "Objektdaten-Blatt", pflicht: false, patterns: ["objektdaten", "objektblatt"] },
] as const;

const STATUS_OPTIONS = [
  { value: "uebertragen", label: "Übertragen", dotColor: "bg-blue-500" },
  { value: "nachfordern", label: "Infos nachfordern", dotColor: "bg-yellow-500" },
  { value: "abgeschlossen", label: "Abgeschlossen", dotColor: "bg-green-500" },
  { value: "storniert", label: "Storniert", dotColor: "bg-red-500" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatCurrency(n: number | null) {
  if (!n) return "–";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return <FileText size={16} className="text-destructive flex-shrink-0" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={16} className="text-green-600 flex-shrink-0" />;
  if (["doc", "docx"].includes(ext)) return <File size={16} className="text-blue-600 flex-shrink-0" />;
  return <FileText size={16} className="text-primary flex-shrink-0" />;
}

export default function FinanzTresor() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [selected, setSelected] = useState<Kunde | null>(null);
  const [objekt, setObjekt] = useState<Objekt | null>(null);
  const [notizen, setNotizen] = useState<TresorNotiz[]>([]);
  const [uploads, setUploads] = useState<TresorUpload[]>([]);
  const [crmDokumente, setCrmDokumente] = useState<CrmDok[]>([]);
  const [newNotiz, setNewNotiz] = useState("");
  const [savingNotiz, setSavingNotiz] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showStornoInput, setShowStornoInput] = useState(false);
  const [stornoGrund, setStornoGrund] = useState("");
  const [bankEmail, setBankEmail] = useState("");
  const [showMailDialog, setShowMailDialog] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [sendingMail, setSendingMail] = useState(false);
  const [kommMsg, setKommMsg] = useState("");
  const [kommTo, setKommTo] = useState("");
  const [sendingKomm, setSendingKomm] = useState(false);
  const [uploadingBankAngebot, setUploadingBankAngebot] = useState(false);
  const [kommAttachment, setKommAttachment] = useState<File | null>(null);
  // Editable doc names: { docId: editedName }
  const [editedDocNames, setEditedDocNames] = useState<Record<string, string>>({});
  // "In Akte einschließen" checkboxes: { docId: boolean }
  const [akteIncludes, setAkteIncludes] = useState<Record<string, boolean>>({});
  // Sonstige Unterlagen uploads (separate from tresor uploads)
  const [sonstigeUploading, setSonstigeUploading] = useState(false);
  const [kundenUploads, setKundenUploads] = useState<KundenUploadDoc[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showArchiv, setShowArchiv] = useState(false);
  const [showNewKundeDialog, setShowNewKundeDialog] = useState(false);
  const [newKundeName, setNewKundeName] = useState("");
  const [newKundeEmail, setNewKundeEmail] = useState("");
  const [newKundePhone, setNewKundePhone] = useState("");
  const [newKundeBudget, setNewKundeBudget] = useState("");
  const [creatingKunde, setCreatingKunde] = useState(false);
  const [maklerProfiles, setMaklerProfiles] = useState<Record<string, string>>({});
  const [bankEmailSentKunden, setBankEmailSentKunden] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const kommFileRef = useRef<HTMLInputElement>(null);
  const bankAngebotRef = useRef<HTMLInputElement>(null);
  const sonstigeRef = useRef<HTMLInputElement>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      setIsAdmin(data && data.length > 0);
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    loadKunden();
  }, [isAdmin]);

  const loadKunden = () => {
    setLoading(true);
    supabase.from("crm_kunden").select("*").eq("finance_shared", true).order("updated_at", { ascending: false })
      .then(({ data }) => {
        const kundenData = (data as Kunde[]) || [];
        setKunden(kundenData);
        setLoading(false);
        // Fetch makler profiles
        const userIds = [...new Set(kundenData.map(k => k.user_id).filter(Boolean))] as string[];
        if (userIds.length > 0) {
          supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
            .then(({ data: profiles }) => {
              const map: Record<string, string> = {};
              (profiles || []).forEach((p: any) => { map[p.user_id] = p.display_name || "Makler"; });
              setMaklerProfiles(map);
            });
        }
        // Fetch bank-email-sent status per kunde (check notizen for 📧)
        const kundeIds = kundenData.map(k => k.id);
        if (kundeIds.length > 0) {
          supabase.from("finanz_tresor_notizen").select("kunde_id, notiz").in("kunde_id", kundeIds)
            .then(({ data: allNotizen }) => {
              const sent = new Set<string>();
              (allNotizen || []).forEach((n: any) => {
                if (n.notiz && n.notiz.includes("📧")) sent.add(n.kunde_id);
              });
              setBankEmailSentKunden(sent);
            });
        }
      });
  };

  useEffect(() => {
    if (!selected) { setObjekt(null); setNotizen([]); setUploads([]); setCrmDokumente([]); setBankEmail(""); setEditedDocNames({}); setAkteIncludes({}); setKundenUploads([]); return; }
    if (selected.objekt_id) {
      supabase.from("objekte").select("*").eq("id", selected.objekt_id).single()
        .then(({ data }) => setObjekt(data as Objekt | null));
    } else { setObjekt(null); }
    supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setNotizen((data as TresorNotiz[]) || []));
    supabase.from("finanz_tresor_uploads").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => setUploads((data as TresorUpload[]) || []));
    supabase.from("crm_dokumente").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        setCrmDokumente((data as CrmDok[]) || []);
        const includes: Record<string, boolean> = {};
        (data || []).forEach((d: any) => { includes[d.id] = true; });
        setAkteIncludes(prev => ({ ...includes, ...prev }));
      });
    // Fetch kunden uploads from unterlagen_anfragen linked to this kunde
    supabase.from("unterlagen_anfragen").select("id").eq("kunde_id", selected.id)
      .then(({ data: anfragen }) => {
        if (anfragen && anfragen.length > 0) {
          const anfrageIds = anfragen.map(a => a.id);
          supabase.from("unterlagen_uploads").select("*").in("anfrage_id", anfrageIds).order("erstellt_am", { ascending: false })
            .then(({ data }) => setKundenUploads((data as KundenUploadDoc[]) || []));
        } else {
          setKundenUploads([]);
        }
      });
  }, [selected]);

  // Merge CRM docs + kunden uploads for checklist detection
  const allDocs: CrmDok[] = [
    ...crmDokumente,
    ...kundenUploads.filter(u => u.dateiname).map(u => ({
      id: `ku-${u.id}`,
      dateiname: u.dateiname || u.dokument_typ,
      storage_path: u.storage_path || "",
      created_at: u.erstellt_am,
    })),
  ];

  const detectedItems = CHECKLIST_ITEMS.reduce<Record<string, CrmDok | null>>((acc, item) => {
    // Check by dokument_typ match from kunden uploads first
    const kundenMatch = kundenUploads.find(u => u.dokument_typ === item.key);
    if (kundenMatch) {
      acc[item.key] = {
        id: `ku-${kundenMatch.id}`,
        dateiname: kundenMatch.dateiname || kundenMatch.dokument_typ,
        storage_path: kundenMatch.storage_path || "",
        created_at: kundenMatch.erstellt_am,
      };
      return acc;
    }
    // Then check CRM docs by filename pattern
    const found = crmDokumente.find(dok =>
      item.patterns.some(p => dok.dateiname.toLowerCase().includes(p))
    );
    acc[item.key] = found || null;
    return acc;
  }, {});

  // Sonstige = docs that don't match any checklist pattern
  const sonstigeDokumente = [
    ...crmDokumente.filter(dok =>
      !CHECKLIST_ITEMS.some(item => item.patterns.some(p => dok.dateiname.toLowerCase().includes(p)))
    ),
    ...kundenUploads.filter(u => u.dokument_typ === "sonstige" && u.dateiname).map(u => ({
      id: `ku-${u.id}`,
      dateiname: u.dateiname || "Sonstige",
      storage_path: u.storage_path || "",
      created_at: u.erstellt_am,
    })),
  ];

  const handleSaveNotiz = async () => {
    if (!newNotiz.trim() || !selected || !user) return;
    setSavingNotiz(true);
    const { error } = await supabase.from("finanz_tresor_notizen").insert({
      kunde_id: selected.id, user_id: user.id, notiz: newNotiz.trim()
    });
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "✓ Notiz gespeichert" });
      setNewNotiz("");
      const { data } = await supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setNotizen((data as TresorNotiz[]) || []);
    }
    setSavingNotiz(false);
  };

  const handleUpload = async (file: File) => {
    if (!selected || !user) return;
    setUploading(true);
    try {
      const tresorPath = `tresor/${selected.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("finanz-tresor").upload(tresorPath, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("finanz_tresor_uploads").insert({
        kunde_id: selected.id, user_id: user.id, dateiname: file.name, storage_path: tresorPath
      });
      if (dbErr) throw dbErr;

      const kundeOwnerUserId = selected.user_id || user.id;
      const crmPath = `crm/${selected.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from("kundenunterlagen").upload(crmPath, file);
      await supabase.from("crm_dokumente").insert({
        kunde_id: selected.id, user_id: kundeOwnerUserId, dateiname: file.name, storage_path: crmPath
      });

      toast({ title: "✓ Hochgeladen", description: `${file.name} (auch in Kunden-Dokumenten sichtbar)` });
      const { data } = await supabase.from("finanz_tresor_uploads").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setUploads((data as TresorUpload[]) || []);
      // Refresh CRM docs too
      const { data: crmData } = await supabase.from("crm_dokumente").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setCrmDokumente((crmData as CrmDok[]) || []);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleDeleteUpload = async (u: TresorUpload) => {
    await supabase.storage.from("finanz-tresor").remove([u.storage_path]);
    await supabase.from("finanz_tresor_uploads").delete().eq("id", u.id);
    toast({ title: "Gelöscht", description: u.dateiname });
    setUploads(prev => prev.filter(x => x.id !== u.id));
  };

  const handleDownload = (u: TresorUpload) => {
    const { data } = supabase.storage.from("finanz-tresor").getPublicUrl(u.storage_path);
    window.open(data.publicUrl, "_blank");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;
    if (newStatus === "storniert") {
      setShowStornoInput(true);
      return;
    }
    setStatusUpdating(true);
    const { error } = await supabase.from("crm_kunden").update({ finance_status: newStatus }).eq("id", selected.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Status aktualisiert" });
      setSelected({ ...selected, finance_status: newStatus });
      loadKunden();
    }
    setStatusUpdating(false);
  };

  const handleStorno = async () => {
    if (!selected || !stornoGrund.trim()) return;
    setStatusUpdating(true);
    const { error } = await supabase.from("crm_kunden").update({
      finance_status: "storniert",
      ablehnungsgrund_bank: stornoGrund.trim()
    }).eq("id", selected.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Storniert", description: "Ablehnungsgrund gespeichert." });
      setSelected({ ...selected, finance_status: "storniert", ablehnungsgrund_bank: stornoGrund.trim() });
      setShowStornoInput(false);
      setStornoGrund("");
      loadKunden();
    }
    setStatusUpdating(false);
  };

  const openMailDialog = () => {
    if (!selected) return;
    setMailTo(bankEmail);
    setMailSubject(`Finanzierungsanfrage - ${selected.name}`);
    setMailBody("");
    setShowMailDialog(true);
  };

  const handleSendMail = async () => {
    if (!selected || !user || !mailTo.trim() || !mailSubject.trim()) return;
    setSendingMail(true);
    const archiveText = `📧 E-Mail an Bank gesendet\nAn: ${mailTo}\nBetreff: ${mailSubject}\n${mailBody ? `Nachricht: ${mailBody}` : ""}`;
    const { error } = await supabase.from("finanz_tresor_notizen").insert({
      kunde_id: selected.id, user_id: user.id, notiz: archiveText.trim()
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ E-Mail archiviert", description: "Der Inhalt wurde in der Status-Historie gespeichert." });
      setShowMailDialog(false);
      const { data } = await supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setNotizen((data as TresorNotiz[]) || []);
    }
    setSendingMail(false);
  };

  const handleSendKomm = async () => {
    if (!selected || !user || !kommMsg.trim()) return;
    setSendingKomm(true);
    let attachmentInfo = "";
    if (kommAttachment) {
      attachmentInfo = `\n📎 Anhang: ${kommAttachment.name}`;
    }
    const archiveText = `💬 Nachricht gesendet${kommTo ? `\nAn: ${kommTo}` : ""}${attachmentInfo}\n${kommMsg}`;
    const { error } = await supabase.from("finanz_tresor_notizen").insert({
      kunde_id: selected.id, user_id: user.id, notiz: archiveText.trim()
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Nachricht archiviert" });
      setKommMsg("");
      setKommTo("");
      setKommAttachment(null);
      const { data } = await supabase.from("finanz_tresor_notizen").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setNotizen((data as TresorNotiz[]) || []);
    }
    setSendingKomm(false);
  };

  const handleEmailAutoFill = () => {
    if (selected?.email) {
      setKommTo(selected.email);
    }
  };

  const handleUploadBankAngebot = async (file: File) => {
    if (!selected || !user) return;
    setUploadingBankAngebot(true);
    try {
      const tresorPath = `tresor/${selected.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("finanz-tresor").upload(tresorPath, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("finanz_tresor_uploads").insert({
        kunde_id: selected.id, user_id: user.id, dateiname: file.name, storage_path: tresorPath
      });
      if (dbErr) throw dbErr;
      toast({ title: "✓ Bank-Angebot hochgeladen", description: file.name });
      const { data } = await supabase.from("finanz_tresor_uploads").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setUploads((data as TresorUpload[]) || []);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploadingBankAngebot(false);
  };

  const handleUploadSonstige = async (file: File) => {
    if (!selected || !user) return;
    setSonstigeUploading(true);
    try {
      const kundeOwnerUserId = selected.user_id || user.id;
      const crmPath = `crm/${selected.id}/${Date.now()}_${file.name}`;
      await supabase.storage.from("kundenunterlagen").upload(crmPath, file);
      await supabase.from("crm_dokumente").insert({
        kunde_id: selected.id, user_id: kundeOwnerUserId, dateiname: file.name, storage_path: crmPath
      });
      toast({ title: "✓ Sonstige Unterlage hochgeladen", description: file.name });
      const { data: crmData } = await supabase.from("crm_dokumente").select("*").eq("kunde_id", selected.id).order("created_at", { ascending: false });
      setCrmDokumente((crmData as CrmDok[]) || []);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setSonstigeUploading(false);
  };

  const handleRenameDoc = (docId: string, newName: string) => {
    setEditedDocNames(prev => ({ ...prev, [docId]: newName }));
  };

  const handleToggleAkte = (docId: string, checked: boolean) => {
    setAkteIncludes(prev => ({ ...prev, [docId]: checked }));
  };

  const handleGenerateBankAkte = () => {
    const includedDocs = crmDokumente.filter(d => akteIncludes[d.id] !== false);
    const docNames = includedDocs.map(d => editedDocNames[d.id] || d.dateiname);
    toast({
      title: "Bank-Akte wird generiert…",
      description: `${docNames.length} Dokument(e) werden in die Akte aufgenommen.`,
    });
  };

  const handleCopyUploadLink = async () => {
    if (!selected) return;
    setGeneratingLink(true);
    try {
      // Check if an anfrage already exists for this kunde
      const { data: existing } = await supabase
        .from("unterlagen_anfragen")
        .select("token")
        .eq("kunde_id", selected.id)
        .order("erstellt_am", { ascending: false })
        .limit(1);
      
      let linkToken: string;
      if (existing && existing.length > 0) {
        linkToken = existing[0].token;
      } else {
        const { data: newAnfrage, error } = await supabase
          .from("unterlagen_anfragen")
          .insert({
            kunde_name: selected.name,
            kunde_id: selected.id,
            checkliste: CHECKLIST_ITEMS.map(i => i.key),
          })
          .select("token")
          .single();
        if (error) throw error;
        linkToken = newAnfrage.token;
      }
      
      const uploadUrl = `${window.location.origin}/finanz-upload?token=${linkToken}`;
      await navigator.clipboard.writeText(uploadUrl);
      toast({ title: "✓ Link kopiert!", description: "Der Upload-Link wurde in die Zwischenablage kopiert." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setGeneratingLink(false);
  };

  // Render document row with editable name + checkbox
  const renderDocRow = (doc: CrmDok, showPflicht?: boolean) => {
    const displayName = editedDocNames[doc.id] ?? doc.dateiname;
    const included = akteIncludes[doc.id] !== false;
    return (
      <div key={doc.id} className="bg-card border border-border rounded-xl p-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          {getFileIcon(doc.dateiname)}
          <Input
            value={displayName}
            onChange={e => handleRenameDoc(doc.id, e.target.value)}
            className="h-7 text-xs rounded-lg flex-1 border-transparent hover:border-border focus:border-primary"
          />
          {showPflicht && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Pflicht ✓</span>
          )}
        </div>
        <div className="flex items-center gap-2 pl-6">
          <Checkbox
            id={`akte-${doc.id}`}
            checked={included}
            onCheckedChange={(checked) => handleToggleAkte(doc.id, !!checked)}
          />
          <label htmlFor={`akte-${doc.id}`} className="text-[10px] text-muted-foreground cursor-pointer select-none">
            In Akte einschließen
          </label>
          <p className="text-[10px] text-muted-foreground ml-auto">{formatDate(doc.created_at)}</p>
        </div>
      </div>
    );
  };

  const handleCreateKunde = async () => {
    if (!newKundeName.trim() || !user) return;
    setCreatingKunde(true);
    const { error } = await supabase.from("crm_kunden").insert({
      name: newKundeName.trim(),
      email: newKundeEmail.trim() || null,
      phone: newKundePhone.trim() || null,
      budget: newKundeBudget.trim() || null,
      user_id: user.id,
      finance_shared: true,
      finance_status: null,
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✓ Kunde angelegt" });
      setShowNewKundeDialog(false);
      setNewKundeName(""); setNewKundeEmail(""); setNewKundePhone(""); setNewKundeBudget("");
      loadKunden();
    }
    setCreatingKunde(false);
  };

  // Ampel color logic
  const getAmpelColor = (k: Kunde): { color: string; label: string } => {
    if (k.finance_status === "nachfordern") return { color: "text-yellow-500", label: "Infos nachfordern" };
    if (k.finance_status === "uebertragen" || bankEmailSentKunden.has(k.id)) return { color: "text-blue-500", label: "Zu Bank gesendet" };
    if (k.finance_status === "abgeschlossen") return { color: "text-green-500", label: "Abgeschlossen" };
    if (k.finance_status === "storniert") return { color: "text-destructive", label: "Storniert" };
    return { color: "text-muted-foreground", label: "Noch nicht gesendet" };
  };

  // Filter kunden for active vs archiv
  const activeKunden = kunden.filter(k => !k.finance_status || k.finance_status === "uebertragen" || k.finance_status === "nachfordern");
  const archivedErfolgreich = kunden.filter(k => k.finance_status === "abgeschlossen");
  const archivedStorniert = kunden.filter(k => k.finance_status === "storniert");

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Lock size={48} className="text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Zugriff verweigert</h2>
        <p className="text-muted-foreground text-sm">Dieses Modul ist ausschließlich für autorisierte Finanzierungsberater zugänglich.</p>
      </div>
    );
  }

  const isLocked = selected?.finance_status === "uebertragen" || selected?.finance_status === "abgeschlossen";

  const renderKundenCard = (k: Kunde) => {
    const ampel = getAmpelColor(k);
    const maklerName = k.user_id ? maklerProfiles[k.user_id] || "Makler" : "–";
    return (
      <Card key={k.id} className="card-radius shadow-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => { setSelected(k); setShowArchiv(false); }}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <CircleDot size={20} className={ampel.color} />
            <span className="text-[9px] text-muted-foreground leading-none text-center max-w-[60px]">{ampel.label}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-foreground">{k.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">{k.typ} · {k.ort || "–"} · {k.budget || "–"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Makler: <span className="font-semibold text-foreground">{maklerName}</span></p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Finanzierungs-Tresor</h1>
              <p className="text-muted-foreground text-xs">Verschlüsselte Kundenakten · Nur für Admins</p>
            </div>
          </div>
          {!selected && (
            <div className="flex items-center gap-2">
              <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setShowNewKundeDialog(true)}>
                <UserPlus size={14} /> Neuen Kunden anlegen
              </Button>
              <Button
                size="sm"
                variant={showArchiv ? "default" : "outline"}
                className="rounded-xl gap-1.5"
                onClick={() => setShowArchiv(!showArchiv)}
              >
                <Archive size={14} /> {showArchiv ? "Aktive Fälle" : "Archiv öffnen"}
              </Button>
            </div>
          )}
        </div>
        <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
          {showArchiv ? `${archivedErfolgreich.length + archivedStorniert.length} archiviert` : `${activeKunden.length} aktiv`}
        </Badge>
      </div>

      {/* New Kunde Dialog */}
      <Dialog open={showNewKundeDialog} onOpenChange={setShowNewKundeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Kunden anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={newKundeName} onChange={e => setNewKundeName(e.target.value)} placeholder="Max Mustermann" />
            </div>
            <div>
              <Label className="text-xs">E-Mail</Label>
              <Input value={newKundeEmail} onChange={e => setNewKundeEmail(e.target.value)} placeholder="max@example.com" />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={newKundePhone} onChange={e => setNewKundePhone(e.target.value)} placeholder="+43 …" />
            </div>
            <div>
              <Label className="text-xs">Budget</Label>
              <Input value={newKundeBudget} onChange={e => setNewKundeBudget(e.target.value)} placeholder="€ 300.000" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateKunde} disabled={!newKundeName.trim() || creatingKunde} className="rounded-xl gap-1.5">
              {creatingKunde ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-6 pb-24">
        {!selected ? (
          /* Kundenliste */
          <div className="space-y-3 max-w-2xl mx-auto">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="card-radius"><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            )) : showArchiv ? (
              /* ARCHIV MODE */
              <Tabs defaultValue="erfolgreich" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="erfolgreich" className="flex-1 gap-1.5">
                    <CircleDot size={12} className="text-green-500" /> Erfolgreich Abgeschlossen ({archivedErfolgreich.length})
                  </TabsTrigger>
                  <TabsTrigger value="storniert" className="flex-1 gap-1.5">
                    <CircleDot size={12} className="text-destructive" /> Stornierte Fälle ({archivedStorniert.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="erfolgreich" className="space-y-3 mt-3">
                  {archivedErfolgreich.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Keine abgeschlossenen Fälle.</div>
                  ) : archivedErfolgreich.map(renderKundenCard)}
                </TabsContent>
                <TabsContent value="storniert" className="space-y-3 mt-3">
                  {archivedStorniert.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Keine stornierten Fälle.</div>
                  ) : archivedStorniert.map(renderKundenCard)}
                </TabsContent>
              </Tabs>
            ) : activeKunden.length === 0 ? (
              <div className="text-center py-16">
                <Shield size={40} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Noch keine aktiven Kunden.</p>
              </div>
            ) : activeKunden.map(renderKundenCard)}
          </div>
        ) : (
          /* ===== DASHBOARD TWO-COLUMN LAYOUT ===== */
          <div className="max-w-5xl mx-auto">
            <button onClick={() => { setSelected(null); setShowStornoInput(false); setStornoGrund(""); }} className="text-sm text-primary font-semibold hover:underline mb-4 inline-flex items-center gap-1">
              ← Zurück zur Übersicht
            </button>

            {/* Customer Header Bar with BANK-AKTE GENERIEREN button */}
            <Card className="card-radius shadow-card mb-4">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-foreground">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">{selected.typ} · {selected.status}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {selected.email ? (
                      <button onClick={handleEmailAutoFill} className="flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer">
                        <Mail size={12} />{selected.email}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1"><Mail size={12} />–</span>
                    )}
                    {selected.phone ? (
                      <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-primary hover:underline font-semibold">
                        <Phone size={12} />{selected.phone}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1"><Phone size={12} />–</span>
                    )}
                    <span className="flex items-center gap-1"><MapPin size={12} />{selected.ort || "–"}</span>
                    <span className="flex items-center gap-1 font-bold text-primary"><Euro size={12} />{selected.budget || "–"}</span>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-orange font-bold text-xs uppercase tracking-wide"
                    onClick={handleGenerateBankAkte}
                  >
                    <FileText size={14} /> Bank-Akte generieren
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* ===== LEFT SIDEBAR: Pflichtdokumenten-Checkliste + Sonstige ===== */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="bg-muted rounded-2xl p-4 sticky top-4 space-y-4">
                  {/* PFLICHTDOKUMENTE */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                      <CircleCheck size={14} className="text-primary" /> Pflichtdokumente
                    </h4>
                    <div className="space-y-2">
                      {CHECKLIST_ITEMS.map(item => {
                        const foundDoc = detectedItems[item.key];
                        if (foundDoc) {
                          return renderDocRow(foundDoc, item.pflicht);
                        }
                        return (
                          <div
                            key={item.key}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border"
                          >
                            <Circle size={16} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                            </div>
                            {item.pflicht && (
                              <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Pflicht</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SONSTIGE UNTERLAGEN */}
                  <div className="pt-3 border-t border-border">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                      <FolderOpen size={14} className="text-primary" /> Sonstige Unterlagen
                    </h4>
                    <div className="space-y-2">
                      {sonstigeDokumente.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">Keine sonstigen Dokumente.</p>
                      ) : (
                        sonstigeDokumente.map(doc => renderDocRow(doc))
                      )}
                    </div>
                    <input
                      ref={sonstigeRef}
                      type="file"
                      accept=".pdf,.xls,.xlsx,.doc,.docx,.csv,.jpg,.png"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleUploadSonstige(e.target.files[0])}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 rounded-xl gap-1.5 text-xs"
                      onClick={() => sonstigeRef.current?.click()}
                      disabled={sonstigeUploading}
                    >
                      {sonstigeUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      Sonstige hochladen
                    </Button>
                  </div>

                  {/* Upload-Link für Kunden */}
                  <div className="pt-3 border-t border-border">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                      <Link size={14} className="text-primary" /> Kunden-Upload
                    </h4>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Link an den Kunden senden – Fotos & Dokumente werden automatisch zugeordnet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl gap-1.5 text-xs"
                      onClick={handleCopyUploadLink}
                      disabled={generatingLink}
                    >
                      {generatingLink ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                      Upload-Link für Kunden kopieren
                    </Button>
                  </div>

                  {objekt && (
                    <div className="pt-3 border-t border-border">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Building size={12} /> Objekt
                      </h4>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p className="font-medium text-foreground">{[objekt.strasse, objekt.hnr].filter(Boolean).join(" ")}</p>
                        <p>{objekt.plz} {objekt.ort}</p>
                        <p className="font-bold text-primary">{formatCurrency(objekt.kaufpreis)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== RIGHT MAIN AREA ===== */}
              <div className="flex-1 space-y-4">

                {/* VERKNÜPFTES OBJEKT Card - ohne Generator-Button */}
                <Card className="card-radius shadow-card border-2 border-primary/20">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-4">
                      <Building size={14} className="text-primary" /> Verknüpftes Objekt
                    </h4>
                    {objekt ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Adresse</p>
                            <p className="text-sm font-semibold text-foreground">
                              {[objekt.strasse, objekt.hnr].filter(Boolean).join(" ")}{objekt.top ? ` / Top ${objekt.top}` : ""}{objekt.stock ? ` / ${objekt.stock}. Stock` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{[objekt.plz, objekt.ort].filter(Boolean).join(" ")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Kaufpreis</p>
                            <p className="text-sm font-bold text-primary">{formatCurrency(objekt.kaufpreis)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Wohnfläche</p>
                            <p className="text-sm font-semibold text-foreground">{objekt.flaeche_m2 ? `${objekt.flaeche_m2} m²` : "–"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Objektart / Zimmer</p>
                            <p className="text-sm font-semibold text-foreground">{objekt.objektart || "–"} · {objekt.zimmer ? `${objekt.zimmer} Zimmer` : "–"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-1.5"
                            onClick={() => window.open(`/expose?objekt=${objekt.id}`, "_blank")}
                          >
                            <FileText size={13} /> Exposé-PDF öffnen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center">
                        <Building size={24} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Kein Objekt verknüpft</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card 1: FINANZIERUNGS-STATUS ÄNDERN */}
                <Card className="card-radius shadow-card">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-4">
                      Finanzierungs-Status ändern
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const isActive = selected.finance_status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleStatusChange(opt.value)}
                            disabled={statusUpdating || isActive}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95 disabled:cursor-default ${
                              isActive
                                ? "bg-card border-border ring-2 ring-primary/30 ring-offset-1 text-foreground shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${opt.dotColor} ${isActive ? "ring-2 ring-offset-1 ring-current" : ""}`} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {showStornoInput && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
                        <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                          <AlertTriangle size={13} /> Ablehnungsgrund Bank (Pflichtfeld)
                        </p>
                        <textarea
                          value={stornoGrund}
                          onChange={e => setStornoGrund(e.target.value)}
                          placeholder="z.B. Bonität nicht ausreichend, Eigenkapital fehlt..."
                          className="w-full bg-card border border-red-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[80px] text-foreground placeholder:text-muted-foreground"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleStorno}
                            disabled={!stornoGrund.trim() || statusUpdating}
                            className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {statusUpdating ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Stornierung bestätigen"}
                          </button>
                          <button
                            onClick={() => { setShowStornoInput(false); setStornoGrund(""); }}
                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-card text-muted-foreground hover:bg-accent transition-all"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    {selected.finance_status === "storniert" && selected.ablehnungsgrund_bank && !showStornoInput && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-red-700 mb-1">Ablehnungsgrund Bank:</p>
                        <p className="text-sm text-red-800">{selected.ablehnungsgrund_bank}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card Row: Status-Historie + Interne Notiz */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="card-radius shadow-card">
                    <CardContent className="p-5">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                        <History size={13} /> Status-Historie
                      </h4>
                      {isLocked && (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                          <Lock size={14} className="text-blue-600" />
                          <p className="text-xs text-blue-700 font-medium">Schreibschutz aktiv – Makler-Zugriff gesperrt</p>
                        </div>
                      )}
                      {selected.notiz && (
                        <div className="note-highlight mb-3">
                          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><StickyNote size={10} /> Makler-Notiz</p>
                          <p className="text-sm text-foreground">{selected.notiz}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Nachrichten-Log</p>
                        {notizen.filter(n => n.notiz.startsWith("💬") || n.notiz.startsWith("📧")).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Noch keine Nachrichten.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                            {notizen.filter(n => n.notiz.startsWith("💬") || n.notiz.startsWith("📧")).map(n => (
                              <div key={n.id} className="note-highlight border-l-4 border-l-primary/40">
                                <p className="text-sm text-foreground whitespace-pre-line">{n.notiz}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-radius shadow-card">
                    <CardContent className="p-5">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                        <Lock size={13} className="text-primary" /> Interne Notiz
                      </h4>
                      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto scrollbar-hide">
                        {notizen.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Noch keine Notizen.</p>
                        ) : notizen.map(n => (
                          <div key={n.id} className={`note-highlight ${n.notiz.startsWith("📧") ? "border-l-4 border-l-primary/40" : ""}`}>
                            <p className="text-sm text-foreground whitespace-pre-line">{n.notiz}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={newNotiz}
                          onChange={e => setNewNotiz(e.target.value)}
                          placeholder="Interne Notiz hinzufügen..."
                          className="flex-1 bg-card border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] text-foreground placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={handleSaveNotiz}
                          disabled={!newNotiz.trim() || savingNotiz}
                          className="self-end bg-primary text-primary-foreground p-3 rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                          title="Notiz speichern"
                        >
                          {savingNotiz ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* KOMMUNIKATION Card */}
                <Card className="card-radius shadow-card">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-4">
                      <MessageSquare size={14} className="text-primary" /> Kommunikation
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="komm-to" className="text-xs font-semibold text-foreground mb-1 block">Empfänger (E-Mail)</Label>
                        <Input
                          id="komm-to"
                          type="email"
                          placeholder="Klicke oben auf die E-Mail des Kunden"
                          value={kommTo}
                          onChange={e => setKommTo(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="komm-msg" className="text-xs font-semibold text-foreground mb-1 block">Nachricht</Label>
                        <Textarea
                          id="komm-msg"
                          value={kommMsg}
                          onChange={e => setKommMsg(e.target.value)}
                          placeholder="Nachricht verfassen..."
                          className="min-h-[100px] rounded-xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={kommFileRef}
                          type="file"
                          className="hidden"
                          onChange={e => { if (e.target.files?.[0]) setKommAttachment(e.target.files[0]); }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl gap-1.5"
                          onClick={() => kommFileRef.current?.click()}
                        >
                          <Paperclip size={13} /> Anhang
                        </Button>
                        {kommAttachment && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">📎 {kommAttachment.name}</span>
                        )}
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          className="rounded-xl gap-1.5"
                          onClick={handleSendKomm}
                          disabled={!kommMsg.trim() || sendingKomm}
                        >
                          {sendingKomm ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          Senden & archivieren
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FINANZ-TRESOR with Bank-Email */}
                <Card className="card-radius shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Lock size={22} className="text-primary" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Finanz-Tresor</h4>
                          <p className="text-[10px] text-muted-foreground">Dokumente werden automatisch auch in der Kunden-Dokumentenliste sichtbar.</p>
                        </div>
                        <div>
                          <Label htmlFor="bank-email" className="text-xs font-semibold text-foreground mb-1 block">Bank-E-Mail</Label>
                          <div className="flex gap-2">
                            <Input
                              id="bank-email"
                              type="email"
                              placeholder="bank@beispiel.at"
                              value={bankEmail}
                              onChange={e => setBankEmail(e.target.value)}
                              className="flex-1 rounded-xl"
                            />
                            <Button variant="outline" size="sm" onClick={openMailDialog} disabled={!bankEmail.trim()} className="rounded-xl gap-1.5">
                              <Send size={13} /> Dokumente an Bank mailen
                            </Button>
                          </div>
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".pdf,.xls,.xlsx,.doc,.docx,.csv"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        />
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          {uploading ? "Wird hochgeladen..." : "Dokument hochladen"}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BANK-ANGEBOTE Section */}
                <Card className="card-radius shadow-card">
                  <CardContent className="p-5">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-4">
                      <FileSpreadsheet size={14} className="text-primary" /> Bank-Angebote
                    </h4>
                    {uploads.length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-3">Noch keine Bank-Angebote hochgeladen.</p>
                    ) : (
                      <div className="space-y-1.5 mb-3">
                        {uploads.map(u => (
                          <div key={u.id} className="flex items-center gap-2 bg-accent rounded-xl p-2.5 border border-border">
                            {getFileIcon(u.dateiname)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{u.dateiname}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDate(u.created_at)}</p>
                            </div>
                            <button onClick={() => handleDownload(u)} className="p-1.5 rounded-lg hover:bg-card transition-colors"><Download size={13} className="text-primary" /></button>
                            <button onClick={() => handleDeleteUpload(u)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 size={13} className="text-destructive" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      ref={bankAngebotRef}
                      type="file"
                      accept=".pdf,.xls,.xlsx,.doc,.docx,.csv"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleUploadBankAngebot(e.target.files[0])}
                    />
                    <Button
                      variant="outline"
                      className="w-full rounded-xl gap-1.5"
                      onClick={() => bankAngebotRef.current?.click()}
                      disabled={uploadingBankAngebot}
                    >
                      {uploadingBankAngebot ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      {uploadingBankAngebot ? "Wird hochgeladen..." : "Bank-Angebot hochladen"}
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mail Dialog */}
      <Dialog open={showMailDialog} onOpenChange={setShowMailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail size={18} className="text-primary" /> Dokumente an Bank senden
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="mail-to" className="text-xs font-semibold mb-1 block">Empfänger</Label>
              <Input
                id="mail-to"
                type="email"
                value={mailTo}
                onChange={e => setMailTo(e.target.value)}
                placeholder="bank@beispiel.at"
              />
            </div>
            <div>
              <Label htmlFor="mail-subject" className="text-xs font-semibold mb-1 block">Betreff</Label>
              <Input
                id="mail-subject"
                value={mailSubject}
                onChange={e => setMailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mail-body" className="text-xs font-semibold mb-1 block">Nachricht</Label>
              <Textarea
                id="mail-body"
                value={mailBody}
                onChange={e => setMailBody(e.target.value)}
                placeholder="Ihre Nachricht an die Bank..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMailDialog(false)}>Abbrechen</Button>
            <Button
              onClick={handleSendMail}
              disabled={!mailTo.trim() || !mailSubject.trim() || sendingMail}
              className="gap-1.5"
            >
              {sendingMail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Senden & archivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
