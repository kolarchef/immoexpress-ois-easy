import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, LogOut, Server, Sparkles, Link } from "lucide-react";

export default function Profil() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("");
  const [videoWebhookUrl, setVideoWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setDisplayName((data as any).display_name || "");
        setImapHost((data as any).imap_host || "");
        setImapPort(String((data as any).imap_port || 993));
        setImapUser((data as any).imap_user || "");
        setSmtpHost((data as any).smtp_host || "");
        setSmtpPort(String((data as any).smtp_port || 587));
        setSmtpUser((data as any).smtp_user || "");
        setElevenlabsApiKey((data as any).elevenlabs_api_key || "");
        setVideoWebhookUrl((data as any).video_webhook_url || "");
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      imap_host: imapHost || null,
      imap_port: Number(imapPort) || 993,
      imap_user: imapUser || null,
      smtp_host: smtpHost || null,
      smtp_port: Number(smtpPort) || 587,
      smtp_user: smtpUser || null,
      elevenlabs_api_key: elevenlabsApiKey || null,
      video_webhook_url: videoWebhookUrl || null,
    } as any).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil gespeichert");
    setLoading(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in" style={{ paddingBottom: 200 }}>
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <User size={22} className="text-primary" /> Mein Profil
      </h1>

      <section className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <div>
          <Label>Anzeigename</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>E-Mail</Label>
          <Input value={user?.email || ""} disabled className="mt-1 opacity-60" />
        </div>
      </section>

      {/* KI & Video Profi-Optionen */}
      <section className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <h2 className="font-bold text-foreground flex items-center gap-2"><Sparkles size={18} className="text-primary" /> KI & Video (Profi-Optionen)</h2>
        <p className="text-xs text-muted-foreground">Optional: Premium-Stimme via ElevenLabs und externe Video-KI via Webhook</p>
        <div>
          <Label className="flex items-center gap-1.5"><Sparkles size={12} /> ElevenLabs API Key</Label>
          <Input
            type="password"
            value={elevenlabsApiKey}
            onChange={e => setElevenlabsApiKey(e.target.value)}
            placeholder="sk_..."
            className="mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Für Premium-Voiceover im Video-Rundgang. Erhältlich unter elevenlabs.io</p>
        </div>
        <div>
          <Label className="flex items-center gap-1.5"><Link size={12} /> Webhook-URL für Video-KI</Label>
          <Input
            value={videoWebhookUrl}
            onChange={e => setVideoWebhookUrl(e.target.value)}
            placeholder="https://api.runway.ml/..."
            className="mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Für Runway/HeyGen Video-Generierung (optional)</p>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-4">
        <h2 className="font-bold text-foreground flex items-center gap-2"><Server size={18} className="text-primary" /> E-Mail Server (IMAP/SMTP)</h2>
        <p className="text-xs text-muted-foreground">Für die zukünftige E-Mail-Synchronisation im Messenger</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>IMAP Host</Label><Input value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.gmail.com" className="mt-1" /></div>
          <div><Label>IMAP Port</Label><Input value={imapPort} onChange={e => setImapPort(e.target.value)} className="mt-1" /></div>
          <div><Label>IMAP Benutzer</Label><Input value={imapUser} onChange={e => setImapUser(e.target.value)} placeholder="max@firma.at" className="mt-1" /></div>
          <div />
          <div><Label>SMTP Host</Label><Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="mt-1" /></div>
          <div><Label>SMTP Port</Label><Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="mt-1" /></div>
          <div><Label>SMTP Benutzer</Label><Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="max@firma.at" className="mt-1" /></div>
        </div>
      </section>

      <div className="flex gap-3">
        <Button onClick={save} disabled={loading}>{loading ? "Speichern..." : "Profil speichern"}</Button>
        <Button variant="outline" onClick={signOut} className="text-destructive"><LogOut size={16} className="mr-2" /> Abmelden</Button>
      </div>
    </div>
  );
}
