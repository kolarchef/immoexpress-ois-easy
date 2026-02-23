import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, Download, Share2, Volume2, VolumeX, RefreshCw, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo_immoexpress_zug.jpeg";

export type VideoFormat = "16:9" | "9:16";

interface VideoSlideshowProps {
  images: string[];
  titel: string;
  preis: string;
  flaeche: string;
  zimmer: string;
  beschreibung: string;
  maklerName?: string;
  maklerEmail?: string;
  onShare?: (type: "whatsapp" | "email") => void;
  videoFormat?: VideoFormat;
  onFormatChange?: (format: VideoFormat) => void;
}

export default function VideoSlideshow({ images, titel, preis, flaeche, zimmer, beschreibung, maklerName, maklerEmail, onShare, videoFormat = "16:9", onFormatChange }: VideoSlideshowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const [generating, setGenerating] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.src = logoImg;
    img.onload = () => { logoRef.current = img; };
  }, []);

  const buildScript = useCallback(() => {
    const lines: string[] = [];
    lines.push(`Willkommen zum virtuellen Rundgang: ${titel}.`);
    if (preis) lines.push(`Der Kaufpreis beträgt ${Number(preis).toLocaleString("de-AT")} Euro.`);
    if (flaeche) lines.push(`Die Wohnfläche umfasst ${flaeche} Quadratmeter.`);
    if (zimmer) lines.push(`Das Objekt verfügt über ${zimmer} Zimmer.`);
    if (beschreibung) {
      const shortDesc = beschreibung.slice(0, 300);
      lines.push(shortDesc);
    }
    lines.push("Vielen Dank für Ihr Interesse. Kontaktieren Sie uns gerne für einen persönlichen Besichtigungstermin.");
    return lines.join(" ");
  }, [titel, preis, flaeche, zimmer, beschreibung]);

  const getVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const germanVoices = voices.filter(v => v.lang.startsWith("de"));
    if (germanVoices.length === 0) return voices[0] || null;
    if (voiceGender === "female") {
      return germanVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("anna") || v.name.toLowerCase().includes("petra")) || germanVoices[0];
    }
    return germanVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("hans") || v.name.toLowerCase().includes("markus")) || germanVoices[germanVoices.length > 1 ? 1 : 0];
  }, [voiceGender]);

  const startSlideshow = useCallback(() => {
    if (images.length === 0) return;
    setIsPlaying(true);
    setCurrentIndex(0);
    if (!audioMuted && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(buildScript());
      utterance.lang = "de-DE";
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      const voice = getVoice();
      if (voice) utterance.voice = voice;
      utterance.onend = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      if (idx >= images.length) { stopSlideshow(); return; }
      setCurrentIndex(idx);
    }, 4000);
  }, [images, audioMuted, buildScript, getVoice]);

  const stopSlideshow = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => { stopSlideshow(); };
  }, [stopSlideshow]);

  const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Logo watermark top-right
    if (logoRef.current) {
      const logoH = 40;
      const logoW = (logoRef.current.width / logoRef.current.height) * logoH;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(logoRef.current, w - logoW - 16, 16, logoW, logoH);
      ctx.globalAlpha = 1.0;
    }
  };

  const drawEndCard = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Dark background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Logo centered
    if (logoRef.current) {
      const logoH = 80;
      const logoW = (logoRef.current.width / logoRef.current.height) * logoH;
      ctx.drawImage(logoRef.current, (w - logoW) / 2, h * 0.2, logoW, logoH);
    }

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(titel, w / 2, h * 0.5);

    // Price
    if (preis) {
      ctx.font = "28px sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(`€${Number(preis).toLocaleString("de-AT")}`, w / 2, h * 0.58);
    }

    // Agent info
    ctx.fillStyle = "#aaa";
    ctx.font = "18px sans-serif";
    const agentText = maklerName || "ImmoExpress";
    ctx.fillText(agentText, w / 2, h * 0.72);
    if (maklerEmail) {
      ctx.font = "16px sans-serif";
      ctx.fillText(maklerEmail, w / 2, h * 0.78);
    }

    ctx.fillStyle = "#666";
    ctx.font = "14px sans-serif";
    ctx.fillText("www.immoexpress.at", w / 2, h * 0.88);
    ctx.textAlign = "start";
  };

  const handleGenerateVideo = async () => {
    if (images.length === 0) {
      toast({ title: "Keine Bilder vorhanden", variant: "destructive" });
      return;
    }
    setGenerating(true);
    toast({ title: "🎬 Video wird generiert…", description: "Slideshow mit Branding wird erstellt." });

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas nicht verfügbar");
      const ctx = canvas.getContext("2d")!;
      
      // Set canvas size based on format
      if (videoFormat === "9:16") {
        canvas.width = 720;
        canvas.height = 1280;
      } else {
        canvas.width = 1280;
        canvas.height = 720;
      }

      const stream = canvas.captureStream(30);
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const combinedStream = new MediaStream([...stream.getTracks(), ...dest.stream.getTracks()]);

      const codecs = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp8", "video/webm"];
      const mimeType = codecs.find(c => MediaRecorder.isTypeSupported(c)) || "";
      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const actualType = recorder.mimeType || "video/webm";

      const recordingDone = new Promise<Blob>(resolve => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: actualType }));
      });

      recorder.start();

      // Render slides with Ken Burns + watermark
      for (let i = 0; i < Math.min(images.length, 20); i++) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = images[i];
        });

        for (let f = 0; f < 60; f++) {
          const progress = f / 60;
          const scale = 1 + progress * 0.08;
          const offsetX = (canvas.width * (scale - 1)) / 2;
          const offsetY = (canvas.height * (scale - 1)) / 2;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(-offsetX, -offsetY);
          ctx.scale(scale, scale);

          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let drawW, drawH, drawX, drawY;
          if (imgRatio > canvasRatio) {
            drawH = canvas.height; drawW = drawH * imgRatio;
            drawX = (canvas.width - drawW) / 2; drawY = 0;
          } else {
            drawW = canvas.width; drawH = drawW / imgRatio;
            drawX = 0; drawY = (canvas.height - drawH) / 2;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Title overlay on first slide
          if (i === 0 && f < 30) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, canvas.height - 120, canvas.width, 120);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 32px sans-serif";
            ctx.fillText(titel, 40, canvas.height - 70);
            if (preis) {
              ctx.font = "24px sans-serif";
              ctx.fillText(`€${Number(preis).toLocaleString("de-AT")}`, 40, canvas.height - 35);
            }
          }

          // Watermark on every frame
          drawWatermark(ctx, canvas.width, canvas.height);

          await new Promise(r => setTimeout(r, 67));
        }
      }

      // End card - 3 seconds
      for (let f = 0; f < 45; f++) {
        drawEndCard(ctx, canvas.width, canvas.height);
        await new Promise(r => setTimeout(r, 67));
      }

      recorder.stop();
      const blob = await recordingDone;
      audioCtx.close();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = actualType.includes("mp4") ? "mp4" : "webm";
      a.download = `${titel.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Rundgang.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "✅ Video erfolgreich erstellt!", description: "Mit Branding & End-Card heruntergeladen." });
    } catch (err) {
      console.error("Video generation error:", err);
      toast({ title: "❌ Video-Erstellung fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Slideshow Player */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-foreground aspect-video">
        <img
          src={images[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-all duration-1000"
          style={{ transform: isPlaying ? `scale(1.05)` : "scale(1)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

        {/* Logo watermark top-right */}
        <img src={logoImg} alt="ImmoExpress" className="absolute top-3 right-3 h-8 opacity-70 rounded" />

        {/* Overlay controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-white font-bold text-sm drop-shadow">{titel}</p>
            {preis && <p className="text-white/80 text-xs">€{Number(preis).toLocaleString("de-AT")} · {flaeche}m² · {zimmer} Zi.</p>}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setAudioMuted(!audioMuted)} className="p-2 rounded-xl bg-foreground/40 backdrop-blur-sm hover:bg-foreground/60">
              {audioMuted ? <VolumeX size={14} className="text-white" /> : <Volume2 size={14} className="text-white" />}
            </button>
            <button onClick={isPlaying ? stopSlideshow : startSlideshow} className="p-2 rounded-xl bg-primary shadow-orange hover:opacity-90">
              {isPlaying ? <Pause size={14} className="text-primary-foreground" /> : <Play size={14} className="text-primary-foreground" />}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute top-2 left-2 right-2 flex gap-0.5">
          {images.slice(0, 20).map((_, i) => (
            <div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i <= currentIndex ? "bg-primary" : "bg-white/30"}`} />
          ))}
        </div>

        {isSpeaking && (
          <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
            <Volume2 size={10} className="animate-pulse" /> Voiceover
          </div>
        )}
      </div>

      {/* Voice Gender Toggle */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Sprecherstimme</p>
          <p className="text-xs text-muted-foreground">{voiceGender === "female" ? "Weibliche Stimme" : "Männliche Stimme"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">♀️</span>
          <Switch checked={voiceGender === "male"} onCheckedChange={c => setVoiceGender(c ? "male" : "female")} />
          <span className="text-xs text-muted-foreground">♂️</span>
        </div>
      </div>

      {/* Format Selection (9:16 / 16:9) */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-foreground">Videoformat</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFormatChange?.("16:9")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              videoFormat === "16:9"
                ? "bg-primary text-primary-foreground border-primary shadow-orange"
                : "bg-accent text-foreground border-border hover:bg-secondary"
            }`}
          >
            <span className="inline-block w-6 h-4 border-2 border-current rounded-sm" /> 16:9 Quer
          </button>
          <button
            onClick={() => onFormatChange?.("9:16")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
              videoFormat === "9:16"
                ? "bg-primary text-primary-foreground border-primary shadow-orange"
                : "bg-accent text-foreground border-border hover:bg-secondary"
            }`}
          >
            <span className="inline-block w-4 h-6 border-2 border-current rounded-sm" /> 9:16 Hoch
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {videoFormat === "9:16" ? "Social Media (Instagram Reels, TikTok, Stories)" : "YouTube, Website, Präsentation"}
        </p>
      </div>

      {/* Action Buttons */}
      <button onClick={handleGenerateVideo} disabled={generating}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold shadow-orange hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
        {generating ? (
          <><RefreshCw size={16} className="animate-spin" /> Video wird erstellt…</>
        ) : (
          <><Sparkles size={16} /> KI-Video-Rundgang generieren</>
        )}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onShare?.("whatsapp")}
          className="bg-green-600 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all active:scale-95">
          <Share2 size={14} /> WhatsApp
        </button>
        <button onClick={() => onShare?.("email")}
          className="bg-card border border-border text-foreground rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-accent transition-all active:scale-95">
          <Share2 size={14} /> E-Mail
        </button>
      </div>

      {/* Hidden canvas for video generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
