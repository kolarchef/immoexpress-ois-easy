import { useState } from "react";
import { Wand2, Crop, Expand, RefreshCw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MagicToolOverlayProps {
  open: boolean;
  photoUrl: string | null;
  onClose: () => void;
  onApply?: (editedUrl: string) => void;
}

export default function MagicToolOverlay({ open, photoUrl, onClose, onApply }: MagicToolOverlayProps) {
  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicEditing, setMagicEditing] = useState(false);
  const [smartCropping, setSmartCropping] = useState(false);
  const [outpainting, setOutpainting] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  if (!open || !photoUrl) return null;

  const invokeKi = async (action: string, context?: string) => {
    const body: Record<string, unknown> = { action, imageDataUrls: [editedImage || photoUrl] };
    if (context) body.context = context;
    const { data, error } = await supabase.functions.invoke("ki-tools", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.editedImage as string | undefined;
  };

  const handleMagicEdit = async () => {
    setMagicEditing(true);
    try {
      const result = await invokeKi("magic-edit", magicPrompt || "Entferne störende Objekte, verbessere das Foto für ein professionelles Immobilien-Exposé.");
      if (result) { setEditedImage(result); toast({ title: "✨ Magic Edit fertig" }); }
      else toast({ title: "Kein bearbeitetes Bild erhalten", variant: "destructive" });
    } catch (err) {
      toast({ title: "Magic Edit fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally { setMagicEditing(false); }
  };

  const handleSmartCrop = async () => {
    setSmartCropping(true);
    try {
      const result = await invokeKi("smart-crop");
      if (result) { setEditedImage(result); toast({ title: "✅ Smart Crop fertig" }); }
    } catch (err) {
      toast({ title: "Smart Crop fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally { setSmartCropping(false); }
  };

  const handleOutpainting = async () => {
    setOutpainting(true);
    try {
      const result = await invokeKi("outpainting", "Erweitere dieses Immobilienfoto zu einer beeindruckenden Weitwinkel-Aufnahme.");
      if (result) { setEditedImage(result); toast({ title: "🖼️ Outpainting fertig" }); }
    } catch (err) {
      toast({ title: "Outpainting fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally { setOutpainting(false); }
  };

  const handleApply = () => {
    if (editedImage) {
      onApply?.(editedImage);
      toast({ title: "✓ Bearbeitetes Bild übernommen" });
    }
    handleClose();
  };

  const handleClose = () => {
    setEditedImage(null);
    setMagicPrompt("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in" onClick={handleClose}>
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Wand2 size={18} className="text-primary" /> Magic Tools
          </h2>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-accent"><X size={18} /></button>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-border flex-1 min-h-0">
          <img src={editedImage || photoUrl} alt="Bearbeitung" className="w-full h-full object-contain bg-card" />
        </div>

        <div className="mt-3 space-y-3">
          <input
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="z.B. Entferne den Müll, verbessere die Beleuchtung…"
            value={magicPrompt} onChange={(e) => setMagicPrompt(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleMagicEdit} disabled={magicEditing}
              className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-bold shadow-orange hover:opacity-90 transition-all disabled:opacity-50">
              {magicEditing ? <><RefreshCw size={12} className="animate-spin" /> …</> : <><Wand2 size={12} /> Magic Edit</>}
            </button>
            <button onClick={handleSmartCrop} disabled={smartCropping}
              className="flex items-center justify-center gap-1.5 bg-accent text-foreground border border-border rounded-xl py-2.5 text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50">
              {smartCropping ? <><RefreshCw size={12} className="animate-spin" /> …</> : <><Crop size={12} /> Crop 9:16</>}
            </button>
            <button onClick={handleOutpainting} disabled={outpainting}
              className="flex items-center justify-center gap-1.5 bg-accent text-foreground border border-border rounded-xl py-2.5 text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50">
              {outpainting ? <><RefreshCw size={12} className="animate-spin" /> …</> : <><Expand size={12} /> Outpaint</>}
            </button>
          </div>

          {editedImage && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleApply}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:opacity-90 transition-all">
                <Check size={14} /> Übernehmen
              </button>
              <button onClick={() => setEditedImage(null)}
                className="flex items-center justify-center gap-2 bg-accent text-foreground border border-border rounded-xl py-2.5 text-sm font-bold hover:bg-secondary transition-all">
                <X size={14} /> Verwerfen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
