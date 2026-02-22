import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, Mail, LogOut, Server, Sparkles, Link, Key, AlertTriangle,
  CheckCircle2, XCircle, Webhook, MessageCircle, Image, Video
} from "lucide-react";

function StatusDot({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-green-500 text-[11px] font-semibold">
      <CheckCircle2 size={14} /> Verbunden
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-destructive text-[11px] font-semibold">
      <XCircle size={14} /> Nicht verbunden
    </span>
  );
}

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
  const [replicateApiKey, setReplicateApiKey] = useState("");
  const [falApiKey, setFalApiKey] = useState("");
  const [makeWebhookUrl, setMakeWebhookUrl] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
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
        setReplicateApiKey((data as any).replicate_api_key || "");
        setFalApiKey((data as any).fal_api_key || "");
        setMakeWebhookUrl((data as any).make_webhook_url || "");
        setWhatsappApiKey((data as any).whatsapp_api_key || "");
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
      replicate_api_key: replicateApiKey || null,
      fal_api_key: falApiKey || null,
      make_webhook_url: makeWebhookUrl || null,
      whatsapp_api_key: whatsappApiKey || null,
      video_webhook_url: videoWebhookUrl || null,
    } as any).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil gespeichert");
    setLoading(false);
  };

  const integrations = [
    { key: "replicate", label: "Replicate", icon: Video, active: !!replicateApiKey, desc: "Video-KI (Rundgänge, 3D)" },
    { key: "fal", label: "Fal.ai", icon: Image, active: !!falApiKey, desc: "Bild-KI (Magic Eraser, Outpainting)" },
    { key: "elevenlabs", label: "ElevenLabs", icon: Sparkles, active: !!elevenlabsApiKey, desc: "Voice-KI (Voiceover)" },
    { key: "make", label: "Make.com", icon: Webhook, active: !!makeWebhookUrl, desc: "Automatisierung & Routing" },
    { key: "whatsapp", label: "WhatsApp API", icon: MessageCircle, active: !!whatsappApiKey, desc: "Premium-Versand (optional)" },
  ];

  const missingCount = integrations.filter(i => !i.active && i.key !== "whatsapp").length;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 animate-fade-in" style={{ paddingBottom: 200 }}>
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <User size={22} className="text-primary" /> Mein Profil
      </h1>

      {/* Profil-Basics */}
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

      {/* Integration Dashboard */}
      <section className="bg-card rounded-2xl p-5 shadow-card border border-border space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Key size={18} className="text-primary" /> Integration Dashboard
          </h2>
          {missingCount > 0 && (
            <span className="text-[11px] bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <AlertTriangle size={12} /> {missingCount} fehlen
            </span>
          )}
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {integrations.map(i => (
            <div key={i.key} className="bg-muted/50 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <i.icon size={14} className="text-primary" />
                <span className="text-xs font-bold text-foreground">{i.label}</span>
              </div>
              <StatusDot active={i.active} />
              <p className="text-[10px] text-muted-foreground">{i.desc}</p>
            </div>
          ))}
        </div>

        {/* Replicate */}
        <div>
          <Label className="flex items-center gap-1.5">
            <Video size={12} /> Replicate API Token
            <StatusDot active={!!replicateApiKey} />
          </Label>
          <Input type="password" value={replicateApiKey} onChange={e => setReplicateApiKey(e.target.value)} placeholder="r8_..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">Video-KI für Rundgänge. Erhältlich unter <span className="font-semibold">replicate.com/account/api-tokens</span></p>
        </div>

        {/* Fal.ai */}
        <div>
          <Label className="flex items-center gap-1.5">
            <Image size={12} /> Fal.ai API Key
            <StatusDot active={!!falApiKey} />
          </Label>
          <Input type="password" value={falApiKey} onChange={e => setFalApiKey(e.target.value)} placeholder="fal_..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">Für Magic Eraser & Outpainting. Erhältlich unter <span className="font-semibold">fal.ai/dashboard</span></p>
        </div>

        {/* ElevenLabs */}
        <div>
          <Label className="flex items-center gap-1.5">
            <Sparkles size={12} /> ElevenLabs API Key
            <StatusDot active={!!elevenlabsApiKey} />
          </Label>
          <Input type="password" value={elevenlabsApiKey} onChange={e => setElevenlabsApiKey(e.target.value)} placeholder="sk_..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">Für Premium-Voiceover. Erhältlich unter <span className="font-semibold">elevenlabs.io</span></p>
        </div>

        {/* Make.com Webhook */}
        <div>
          <Label className="flex items-center gap-1.5">
            <Webhook size={12} /> Make.com Webhook URL
            <StatusDot active={!!makeWebhookUrl} />
          </Label>
          <Input value={makeWebhookUrl} onChange={e => setMakeWebhookUrl(e.target.value)} placeholder="https://hook.eu2.make.com/..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">Zentraler Router: Videos → Replicate, Bilder → Fal.ai</p>
        </div>

        {/* WhatsApp */}
        <div className="border-t border-border pt-4">
          <Label className="flex items-center gap-1.5">
            <MessageCircle size={12} /> WhatsApp API Key <span className="text-[10px] text-muted-foreground ml-1">(Optional – Premium)</span>
          </Label>
          <Input type="password" value={whatsappApiKey} onChange={e => setWhatsappApiKey(e.target.value)} placeholder="whatsapp_..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">
            Standard-Sharing funktioniert kostenlos via Link. Für automatisierten Versand kannst du hier deinen API-Key hinterlegen.
          </p>
        </div>

        {/* Video Webhook (legacy) */}
        <div>
          <Label className="flex items-center gap-1.5"><Link size={12} /> Video Webhook URL (Legacy)</Label>
          <Input value={videoWebhookUrl} onChange={e => setVideoWebhookUrl(e.target.value)} placeholder="https://api.runway.ml/..." className="mt-1" />
          <p className="text-[10px] text-muted-foreground mt-1">Runway/HeyGen (optional, wird durch Make.com ersetzt)</p>
        </div>
      </section>

      {/* E-Mail Server */}
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
