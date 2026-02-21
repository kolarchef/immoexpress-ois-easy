import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, Check } from "lucide-react";

interface Nachricht {
  id: string;
  titel: string;
  inhalt: string | null;
  typ: string | null;
  gelesen: boolean | null;
  created_at: string;
}

export default function MessengerDrawer({ trigger }: { trigger: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Nachricht[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("nachrichten").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setMessages(data as Nachricht[]);
  };

  useEffect(() => { if (open && user) load(); }, [open, user]);

  const markRead = async (id: string) => {
    await supabase.from("nachrichten").update({ gelesen: true }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, gelesen: true } : m));
  };

  const unreadCount = messages.filter(m => !m.gelesen).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle size={20} className="text-primary" /> Nachrichten
            {unreadCount > 0 && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Keine Nachrichten</p>
            </div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                onClick={() => !m.gelesen && markRead(m.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${m.gelesen ? "bg-muted border-border opacity-60" : "bg-accent border-primary/20 hover:bg-secondary"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-semibold ${m.gelesen ? "text-muted-foreground" : "text-foreground"}`}>{m.titel}</h3>
                  {m.gelesen && <Check size={14} className="text-primary flex-shrink-0 mt-0.5" />}
                </div>
                {m.inhalt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.inhalt}</p>}
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  {new Date(m.created_at).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
