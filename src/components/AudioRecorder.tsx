import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function AudioRecorder({ onTranscript, className = "" }: Props) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech-to-Text nicht unterstützt", description: "Bitte Chrome oder Edge verwenden.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "de-AT";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        toast({ title: "Spracherkennung Fehler", description: event.error, variant: "destructive" });
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      setInterim("");
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    toast({ title: "🎙️ Aufnahme gestartet", description: "Sprich jetzt – Text wird in Echtzeit erkannt." });
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
    setInterim("");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          recording
            ? "bg-destructive text-destructive-foreground animate-pulse"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
      >
        {recording ? <MicOff size={14} /> : <Mic size={14} />}
        {recording ? "Stoppen" : "Diktieren"}
      </button>
      {recording && interim && (
        <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
          {interim}…
        </span>
      )}
    </div>
  );
}
