import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, Check, Send, Plus, ArrowLeft, Users, User, Briefcase } from "lucide-react";
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

type View = "inbox" | "compose" | "detail";
type EmpfaengerTyp = "kunde" | "intern" | "chef";

export default function MessengerDrawer({ trigger }: { trigger: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Nachricht[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("inbox");
  const [selectedMsg, setSelectedMsg] = useState<Nachricht | null>(null);

  // Compose state
  const [empfaengerTyp, setEmpfaengerTyp] = useState<EmpfaengerTyp>("kunde");
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [selectedKunde, setSelectedKunde] = useState("");
  const [titel, setTitel] = useState("");
  const [inhalt, setInhalt] = useState("");
  const [replyText, setReplyText] = useState("");

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
    if (open && user) {
      load();
      loadKunden();
    }
  }, [open, user]);

  const markRead = async (id: string) => {
    await supabase.from("nachrichten").update({ gelesen: true }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, gelesen: true } : m));
  };

  const openDetail = (m: Nachricht) => {
    setSelectedMsg(m);
    setView("detail");
    if (!m.gelesen) markRead(m.id);
  };

  const sendMessage = async () => {
    if (!user || !titel.trim()) return;

    if (empfaengerTyp === "kunde") {
      const kunde = kunden.find(k => k.id === selectedKunde);
      if (!kunde) { toast({ title: "Bitte Kunde wählen", variant: "destructive" }); return; }

      // Save to DB
      await supabase.from("nachrichten").insert({
        user_id: user.id,
        titel,
        inhalt,
        typ: "ausgehend",
      });

      // Open WhatsApp or Email
      if (kunde.phone) {
        const phone = kunde.phone.replace(/[^0-9+]/g, "").replace(/^0/, "+43");
        const msg = encodeURIComponent(`${titel}\n\n${inhalt}`);
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
      } else if (kunde.email) {
        window.open(`mailto:${kunde.email}?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent(inhalt)}`, "_blank");
      }
    } else {
      // Intern or Chef - just save as internal message
      await supabase.from("nachrichten").insert({
        user_id: user.id,
        titel,
        inhalt,
        typ: empfaengerTyp === "chef" ? "chef" : "intern",
      });
    }

    toast({ title: "✅ Nachricht gesendet" });
    setTitel("");
    setInhalt("");
    setSelectedKunde("");
    setView("inbox");
    load();
  };

  const sendReply = async () => {
    if (!user || !selectedMsg || !replyText.trim()) return;
    await supabase.from("nachrichten").insert({
      user_id: user.id,
      titel: `Re: ${selectedMsg.titel}`,
      inhalt: replyText,
      typ: "ausgehend",
    });
    toast({ title: "✅ Antwort gesendet" });
    setReplyText("");
    load();
  };

  const unreadCount = messages.filter(m => !m.gelesen).length;

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setView("inbox"); }}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {view !== "inbox" && (
              <button onClick={() => setView("inbox")} className="p-1 rounded hover:bg-accent">
                <ArrowLeft size={16} />
              </button>
            )}
            <MessageCircle size={20} className="text-primary" />
            {view === "inbox" && "Nachrichten"}
            {view === "compose" && "Neue Nachricht"}
            {view === "detail" && "Detail"}
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
                  <div
                    key={m.id}
                    onClick={() => openDetail(m)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${m.gelesen ? "bg-muted border-border opacity-60" : "bg-accent border-primary/20 hover:bg-secondary"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-semibold ${m.gelesen ? "text-muted-foreground" : "text-foreground"}`}>{m.titel}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {m.typ && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{m.typ}</span>}
                        {m.gelesen && <Check size={14} className="text-primary" />}
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
                <div className="flex gap-1">
                  {([
                    { value: "kunde" as EmpfaengerTyp, icon: User, label: "Kunde" },
                    { value: "chef" as EmpfaengerTyp, icon: Briefcase, label: "Chef" },
                    { value: "intern" as EmpfaengerTyp, icon: Users, label: "Makler" },
                  ]).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setEmpfaengerTyp(value)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        empfaengerTyp === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
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
                      {kunden.map(k => (
                        <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <h3 className="font-bold text-foreground mb-1">{selectedMsg.titel}</h3>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(selectedMsg.created_at).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {selectedMsg.inhalt && <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{selectedMsg.inhalt}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Antworten</label>
                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Antwort schreiben..." rows={3} />
                <Button onClick={sendReply} size="sm" className="w-full" disabled={!replyText.trim()}>
                  <Send size={12} className="mr-1" /> Antworten
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
