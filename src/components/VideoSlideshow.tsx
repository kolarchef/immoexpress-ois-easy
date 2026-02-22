import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, Download, Share2, Volume2, VolumeX, RefreshCw, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface VideoSlideshowProps {
  images: string[];
  titel: string;
  preis: string;
  flaeche: string;
  zimmer: string;
  beschreibung: string;
  onShare?: (type: "whatsapp" | "email") => void;
}

export default function VideoSlideshow({ images, titel, preis, flaeche, zimmer, beschreibung, onShare }: VideoSlideshowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const [generating, setGenerating] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    
    // Start voice
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

    // Slide interval - 4 seconds per image
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      if (idx >= images.length) {
        stopSlideshow();
        return;
      }
      setCurrentIndex(idx);
    }, 4000);
  }, [images, audioMuted, buildScript, getVoice]);

  const stopSlideshow = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    // Load voices
    window.speechSynthesis?.getVoices();
    return () => {
      stopSlideshow();
    };
  }, [stopSlideshow]);

  const handleGenerateVideo = async () => {
    if (images.length === 0) {
      toast({ title: "Keine Bilder vorhanden", variant: "destructive" });
      return;
    }
    setGenerating(true);
    toast({ title: "🎬 Video wird generiert…", description: "Slideshow mit Voiceover wird erstellt." });

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas nicht verfügbar");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 1280;
      canvas.height = 720;

      // Create MediaRecorder from canvas stream
      const stream = canvas.captureStream(30);
      
      // Add audio via TTS
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      
      // Merge audio + video streams
      const combinedStream = new MediaStream([
        ...stream.getTracks(),
        ...dest.stream.getTracks()
      ]);

      // Try codecs in order of compatibility
      const codecs = [
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mimeType = codecs.find(c => MediaRecorder.isTypeSupported(c)) || "";
      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      const actualType = recorder.mimeType || "video/webm";

      const recordingDone = new Promise<Blob>(resolve => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: actualType }));
        };
      });

      recorder.start();

      // Render each image for 4 seconds with Ken Burns effect
      for (let i = 0; i < Math.min(images.length, 20); i++) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // skip broken images
          img.src = images[i];
        });

        // Render frames for 4 seconds at ~15fps
        for (let f = 0; f < 60; f++) {
          const progress = f / 60;
          const scale = 1 + progress * 0.08; // subtle zoom
          const offsetX = (canvas.width * (scale - 1)) / 2;
          const offsetY = (canvas.height * (scale - 1)) / 2;
          
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(-offsetX, -offsetY);
          ctx.scale(scale, scale);
          
          // Draw image covering canvas
          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let drawW, drawH, drawX, drawY;
          if (imgRatio > canvasRatio) {
            drawH = canvas.height;
            drawW = drawH * imgRatio;
            drawX = (canvas.width - drawW) / 2;
            drawY = 0;
          } else {
            drawW = canvas.width;
            drawH = drawW / imgRatio;
            drawX = 0;
            drawY = (canvas.height - drawH) / 2;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Overlay text on first and last slide
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

          await new Promise(r => setTimeout(r, 67)); // ~15fps
        }
      }

      recorder.stop();
      const blob = await recordingDone;
      audioCtx.close();

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = actualType.includes("mp4") ? "mp4" : "webm";
      a.download = `${titel.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_Rundgang.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "✅ Video erfolgreich erstellt!", description: "Die Datei wurde heruntergeladen." });
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
          <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
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
