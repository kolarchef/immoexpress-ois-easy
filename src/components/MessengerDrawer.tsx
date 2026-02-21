import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, Check, CheckCheck, Send, Plus, ArrowLeft, Users, User, Briefcase, Mail, Phone, UserPlus, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Nachricht {
  id: string;
  titel: string;
  inhalt: string | null;
  typ: string | null;
  gelesen: boolean | null;
  created_at: string;
  empfaenger_id: string | null;
}

interface Kunde {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

type View = "inbox" | "compose" | "detail" | "newcustomer";
type EmpfaengerTyp = "kunde" | "intern" | "chef" | "extern";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function ReadStatus({ typ, gelesen }: { typ: string | null; gelesen: boolean | null }) {
  if (typ === "ausgehend" || typ === "intern" || typ === "chef") {
    if (gelesen) return <CheckCheck size={14} className="text-blue-500" />;
    return <Check size={14} className="text-muted-foreground/50" />;
  }
  return null;
}

function TextWithEmailButtons({ text, onReply }: { text: string; onReply: (email: string) => void }) {
  const parts: (string | { email: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(EMAIL_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push({ email: match[0] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return (
    <span>
      {parts.map((p, i) =>
        typeof p === "string" ? <span key={i}>{p}</span> : (
          <span key={i} className="inline-flex items-center gap-1">
            <span className="text-primary font-medium">{p.email}</span>
            <button onClick={(e) => { e.stopPropagation(); onReply(p.email); }}
              className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold hover:bg-primary/20 transition-all">
              <Mail size={10} /> Antworten
            </button>
          </span>
        )
      )}
    </span>
  );
}

export default function MessengerDrawer({ trigger }: { trigger: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Nachricht[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("inbox");
  const [selectedMsg, setSelectedMsg] = useState<Nachricht | null>(null);

  const [empfaengerTyp, setEmpfaengerTyp] = useState<EmpfaengerTyp>("kunde");
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [selectedKunde, setSelectedKunde] = useState("");
  const [titel, setTitel] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [replyText, setReplyText] = useState("");
  const [adHocEmail, setAdHocEmail] = useState("");
  const [externEmail, setExternEmail] = useState("");
  const [externPhone, setExternPhone] = useState("");

  // New customer from message
  const [ncName, setNcName] = useState("");
  const [ncEmail, setNcEmail] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [extracting, setExtracting] = useState(false);

  // AI reply suggestion
  const [suggestedReply, setSuggestedReply] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("nachrichten").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setMessages(data as Nachricht[]);
  };

  const loadKunden = async () => {
    if (!user) return;
    const { data } = await supabase.from("crm_kunden").select("id, name, email, phone");
    if (data) setKunden(data);
  };

  useEffect(() => {
    if (open && user) { load(); loadKunden(); }
  }, [open, user]);

  const markRead = async (id: string) => {
    await supabase.from("nachrichten").update({ gelesen: true }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, gelesen: true } : m));
  };

  const openDetail = (m: Nachricht) => {
    setSelectedMsg(m);
    setAdHocEmail("");
    setSuggestedReply("");
    setView("detail");
    if (!m.gelesen) markRead(m.id);
  };

  const startAdHocReply = (email: string) => {
    setAdHocEmail(email);
    setReplyText("");
  };

  // KI: Extract contact from message
  const extractContact = async () => {
    if (!selectedMsg?.inhalt) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "extract-contact", messageText: selectedMsg.inhalt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data.result || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setNcName(parsed.name || "");
        setNcEmail(parsed.email || "");
        setNcPhone(parsed.phone || "");
      }
      setView("newcustomer");
    } catch (err: unknown) {
      toast({ title: "KI-Extraktion fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  // Save new customer
  const saveNewCustomer = async () => {
    if (!user || !ncName.trim()) return;
    const { error } = await supabase.from("crm_kunden").insert({
      user_id: user.id,
      name: ncName,
      email: ncEmail || null,
      phone: ncPhone || null,
      typ: "Interessent",
      status: "Aktiv",
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Neukunde angelegt", description: ncName });
      setView("detail");
      loadKunden();
    }
  };

  // KI: Suggest reply
  const suggestReply = async () => {
    if (!selectedMsg?.inhalt) return;
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "suggest-reply", messageText: selectedMsg.inhalt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const text = data.result || "";
      setSuggestedReply(text);
      setReplyText(text);
    } catch (err: unknown) {
      toast({ title: "KI-Fehler", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !titel.trim()) return;
    if (empfaengerTyp === "extern") {
      await supabase.from("nachrichten").insert({ user_id: user.id, titel, inhalt, typ: "ausgehend" });
      if (externPhone.trim()) {
        const phone = externPhone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`${titel}\n\n${inhalt}`)}`, "_blank");
      } else if (externEmail.trim()) {
        window.open(`mailto:${externEmail}?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent(inhalt)}`, "_blank");
      }
    } else if (empfaengerTyp === "kunde") {
      const kunde = kunden.find(k => k.id === selectedKunde);
      if (!kunde) { toast({ title: "Bitte Kunde wählen", variant: "destructive" }); return; }
      await supabase.from("nachrichten").insert({ user_id: user.id, titel, inhalt, typ: "ausgehend" });
      if (kunde.phone) {
        const phone = kunde.phone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`${titel}\n\n${inhalt}`)}`, "_blank");
      } else if (kunde.email) {
        window.open(`mailto:${kunde.email}?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent(inhalt)}`, "_blank");
      }
    } else {
      await supabase.from("nachrichten").insert({ user_id: user.id, titel, inhalt, typ: empfaengerTyp === "chef" ? "chef" : "intern" });
    }
    toast({ title: "✅ Nachricht gesendet" });
    setTitel(""); setInhalt(""); setSelectedKunde(""); setExternEmail(""); setExternPhone(""); setView("inbox"); load();
  };

  const sendReply = async () => {
    if (!user || !selectedMsg || !replyText.trim()) return;
    if (adHocEmail) {
      await supabase.from("nachrichten").insert({ user_id: user.id, titel: `Re: ${selectedMsg.titel}`, inhalt: replyText, typ: "ausgehend" });
      window.open(`mailto:${adHocEmail}?subject=${encodeURIComponent(`Re: ${selectedMsg.titel}`)}&body=${encodeURIComponent(replyText)}`, "_blank");
      toast({ title: `✅ E-Mail an ${adHocEmail}` });
      setAdHocEmail("");
    } else {
      await supabase.from("nachrichten").insert({ user_id: user.id, titel: `Re: ${selectedMsg.titel}`, inhalt: replyText, typ: "ausgehend" });
      toast({ title: "✅ Antwort gesendet" });
    }
    setReplyText(""); setSuggestedReply(""); load();
  };

  const unreadCount = messages.filter(m => !m.gelesen).length;

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setView("inbox"); }}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {view !== "inbox" && (
              <button onClick={() => { setView(view === "newcustomer" ? "detail" : "inbox"); setAdHocEmail(""); }} className="p-1 rounded hover:bg-accent">
                <ArrowLeft size={16} />
              </button>
            )}
            <MessageCircle size={20} className="text-primary" />
            {view === "inbox" && "Nachrichten"}
            {view === "compose" && "Neue Nachricht"}
            {view === "detail" && "Detail"}
            {view === "newcustomer" && "Neukunde anlegen"}
            {view === "inbox" && unreadCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {/* INBOX */}
          {view === "inbox" && (
            <div className="space-y-2">
              <Button onClick={() => setView("compose")} className="w-full mb-3" size="sm">
                <Plus size={14} className="mr-1" /> Neue Nachricht
              </Button>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={40} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Keine Nachrichten</p>
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} onClick={() => openDetail(m)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${m.gelesen ? "bg-muted border-border opacity-60" : "bg-accent border-primary/20 hover:bg-secondary"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold ${m.gelesen ? "text-muted-foreground" : "text-foreground"}`}>{m.titel}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {m.typ && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{m.typ}</span>}
                        <ReadStatus typ={m.typ} gelesen={m.gelesen} />
                      </div>
                    </div>
                    {m.inhalt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.inhalt}</p>}
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {new Date(m.created_at).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* COMPOSE */}
          {view === "compose" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Empfänger-Typ</label>
                <div className="grid grid-cols-2 gap-1">
                  {([
                    { value: "kunde" as EmpfaengerTyp, icon: User, label: "Kunde" },
                    { value: "extern" as EmpfaengerTyp, icon: Mail, label: "Extern" },
                    { value: "chef" as EmpfaengerTyp, icon: Briefcase, label: "Chef" },
                    { value: "intern" as EmpfaengerTyp, icon: Users, label: "Makler" },
                  ]).map(({ value, icon: Icon, label }) => (
                    <button key={value} onClick={() => setEmpfaengerTyp(value)}
                      className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${empfaengerTyp === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {empfaengerTyp === "kunde" && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Kunde</label>
                  <Select value={selectedKunde} onValueChange={setSelectedKunde}>
                    <SelectTrigger><SelectValue placeholder="Kunde wählen" /></SelectTrigger>
                    <SelectContent>
                      {kunden.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {empfaengerTyp === "extern" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">E-Mail Adresse</label>
                    <Input value={externEmail} onChange={e => setExternEmail(e.target.value)} placeholder="name@beispiel.at" type="email" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Oder Telefonnummer (WhatsApp)</label>
                    <Input value={externPhone} onChange={e => setExternPhone(e.target.value)} placeholder="+43 664 123 4567" type="tel" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Betreff</label>
                <Input value={titel} onChange={e => setTitel(e.target.value)} placeholder="Betreff eingeben" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Nachricht</label>
                <Textarea value={inhalt} onChange={e => setInhalt(e.target.value)} placeholder="Nachricht schreiben..." rows={4} />
              </div>
              <Button onClick={sendMessage} className="w-full" disabled={!titel.trim()}>
                <Send size={14} className="mr-1" /> Senden
              </Button>
            </div>
          )}

          {/* DETAIL */}
          {view === "detail" && selectedMsg && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-foreground">{selectedMsg.titel}</h3>
                  <ReadStatus typ={selectedMsg.typ} gelesen={selectedMsg.gelesen} />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(selectedMsg.created_at).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {selectedMsg.inhalt && (
                  <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">
                    <TextWithEmailButtons text={selectedMsg.inhalt} onReply={startAdHocReply} />
                  </p>
                )}
              </div>

              {/* Action Buttons: New Customer + AI Reply */}
              <div className="flex gap-2">
                <button onClick={extractContact} disabled={extracting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-accent border border-border hover:bg-secondary transition-all disabled:opacity-50">
                  {extracting ? <RefreshCw size={12} className="animate-spin" /> : <UserPlus size={12} className="text-primary" />}
                  Als Neukunde
                </button>
                <button onClick={suggestReply} disabled={suggesting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-accent border border-border hover:bg-secondary transition-all disabled:opacity-50">
                  {suggesting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} className="text-primary" />}
                  KI-Antwort
                </button>
              </div>

              {adHocEmail && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-xl text-xs">
                  <Mail size={14} className="text-primary" />
                  <span className="text-foreground font-medium">Antwort an: <span className="text-primary">{adHocEmail}</span></span>
                  <button onClick={() => setAdHocEmail("")} className="ml-auto text-muted-foreground hover:text-foreground text-xs">✕</button>
                </div>
              )}

              {suggestedReply && (
                <div className="p-2 bg-primary/5 rounded-xl border border-primary/20 text-xs">
                  <span className="font-bold text-primary flex items-center gap-1 mb-1"><Sparkles size={10} /> KI-Vorschlag</span>
                  <p className="text-foreground whitespace-pre-wrap">{suggestedReply}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  {adHocEmail ? `E-Mail an ${adHocEmail}` : "Antworten"}
                </label>
                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder={adHocEmail ? `Nachricht an ${adHocEmail}…` : "Antwort schreiben..."} rows={3} />
                <Button onClick={sendReply} size="sm" className="w-full" disabled={!replyText.trim()}>
                  <Send size={12} className="mr-1" /> {adHocEmail ? "Via E-Mail senden" : "Antworten"}
                </Button>
              </div>
            </div>
          )}

          {/* NEW CUSTOMER FROM MESSAGE */}
          {view === "newcustomer" && (
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-foreground">
                <span className="font-bold text-primary flex items-center gap-1 mb-1"><Sparkles size={10} /> KI-extrahierte Daten</span>
                <p className="text-muted-foreground">Bitte prüfen und bestätigen:</p>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Name *</label>
                <Input value={ncName} onChange={e => setNcName(e.target.value)} placeholder="Vor- und Nachname" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">E-Mail</label>
                <Input value={ncEmail} onChange={e => setNcEmail(e.target.value)} placeholder="email@beispiel.at" type="email" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Telefon</label>
                <Input value={ncPhone} onChange={e => setNcPhone(e.target.value)} placeholder="+43 664 ..." type="tel" />
              </div>
              <Button onClick={saveNewCustomer} className="w-full" disabled={!ncName.trim()}>
                <UserPlus size={14} className="mr-1" /> Im CRM speichern
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
