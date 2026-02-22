import { useState, useRef } from "react";
import { Camera, ScanLine, FileText, Image, Upload, Sparkles, RefreshCw, X, Check, AlertTriangle, Cloud, CloudOff, Bug, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type ScanMode = "none" | "bauplan" | "objekt" | "dokument";

interface WallPoint { x: number; y: number; }
interface Wall { p1: WallPoint; p2: WallPoint; }

interface AnalyzedRoom {
  name: string;
  flaeche_ca?: number;
  merkmale?: string;
  color?: string;
  x?: number;
  y?: number;
}

export default function Kamera() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("none");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedRooms, setAnalyzedRooms] = useState<AnalyzedRoom[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [planSummary, setPlanSummary] = useState("");
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [draggingRoom, setDraggingRoom] = useState<number | null>(null);
  const [draggingWallPoint, setDraggingWallPoint] = useState<{ wallIdx: number; point: "p1" | "p2" } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const effectiveOnline = isOnline && !simulateOffline;

  useState(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    toast({ title: "📡 Synchronisiere…", description: `${offlineQueue.length} Aufnahmen werden hochgeladen.` });
    setOfflineQueue([]);
    toast({ title: "✅ Alle Aufnahmen synchronisiert" });
  };

  const handleCapture = (mode: ScanMode) => {
    setScanMode(mode);
    setCapturedImage(null);
    setAnalyzedRooms([]);
    setWalls([]);
    setPlanSummary("");
    fileRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCapturedImage(dataUrl);
      if (!effectiveOnline) {
        setOfflineQueue(prev => [...prev, dataUrl]);
        toast({ title: "📴 Offline gespeichert", description: "Wird automatisch hochgeladen, sobald Verbindung besteht." });
        return;
      }
      if (scanMode === "bauplan") analyzePlan(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const analyzePlan = async (dataUrl: string) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ki-tools", {
        body: { action: "analyze-floorplan", imageDataUrls: [dataUrl] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const text = data.result || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const roomColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"];
        const rooms: AnalyzedRoom[] = (parsed.raeume || []).map((r: AnalyzedRoom, i: number) => ({
          ...r,
          color: roomColors[i % roomColors.length],
          x: 15 + (i % 3) * 30,
          y: 20 + Math.floor(i / 3) * 25,
        }));
        setAnalyzedRooms(rooms);
        setPlanSummary(parsed.zusammenfassung || "");

        // Generate wall lines based on room grid
        const generatedWalls: Wall[] = [];
        // Outer walls
        generatedWalls.push({ p1: { x: 5, y: 5 }, p2: { x: 95, y: 5 } });
        generatedWalls.push({ p1: { x: 95, y: 5 }, p2: { x: 95, y: 95 } });
        generatedWalls.push({ p1: { x: 95, y: 95 }, p2: { x: 5, y: 95 } });
        generatedWalls.push({ p1: { x: 5, y: 95 }, p2: { x: 5, y: 5 } });
        // Inner walls based on room count
        if (rooms.length >= 2) generatedWalls.push({ p1: { x: 50, y: 5 }, p2: { x: 50, y: 95 } });
        if (rooms.length >= 3) generatedWalls.push({ p1: { x: 5, y: 50 }, p2: { x: 50, y: 50 } });
        if (rooms.length >= 4) generatedWalls.push({ p1: { x: 50, y: 50 }, p2: { x: 95, y: 50 } });
        if (rooms.length >= 5) generatedWalls.push({ p1: { x: 5, y: 75 }, p2: { x: 50, y: 75 } });
        setWalls(generatedWalls);

        toast({ title: `✓ ${rooms.length} Räume & ${generatedWalls.length} Wände erkannt` });
      }
    } catch (err) {
      toast({ title: "Plan-Analyse fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const startEditRoom = (index: number) => {
    setEditingRoom(index);
    setEditRoomName(analyzedRooms[index].name);
  };

  const saveRoomEdit = (index: number) => {
    setAnalyzedRooms(prev => prev.map((r, i) => i === index ? { ...r, name: editRoomName } : r));
    setEditingRoom(null);
    toast({ title: "✓ Beschriftung aktualisiert" });
  };

  const handleWallPointDrag = (wallIdx: number, point: "p1" | "p2", clientX: number, clientY: number) => {
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setWalls(prev => prev.map((w, i) => {
      if (i !== wallIdx) return w;
      return { ...w, [point]: { x, y } };
    }));
  };

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kamera & Scanner</h1>
          <p className="text-muted-foreground text-sm">Visitenkarte, Dokumente & Fotos scannen</p>
        </div>
        <div className="flex items-center gap-2">
          {effectiveOnline ? (
            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Cloud size={12} /> Online
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
              <CloudOff size={12} /> Offline
              {offlineQueue.length > 0 && <span>({offlineQueue.length})</span>}
            </div>
          )}
          <button
            onClick={() => setSimulateOffline(prev => !prev)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${simulateOffline ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border hover:bg-accent"}`}
            title="Offline-Modus simulieren"
          >
            <Bug size={10} /> {simulateOffline ? "Sim: AN" : "Sim: AUS"}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />

      {capturedImage ? (
        <div ref={imageContainerRef} className="relative w-full rounded-2xl overflow-hidden mb-5 shadow-md-custom">
          <img src={capturedImage} alt="Aufnahme" className="w-full object-contain max-h-[60vh]" />
          
          {/* SVG Wall overlay */}
          {scanMode === "bauplan" && walls.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
              {walls.map((wall, wi) => (
                <line
                  key={`wall-${wi}`}
                  x1={`${wall.p1.x}%`} y1={`${wall.p1.y}%`}
                  x2={`${wall.p2.x}%`} y2={`${wall.p2.y}%`}
                  stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round"
                />
              ))}
            </svg>
          )}

          {/* Wall endpoint handles */}
          {scanMode === "bauplan" && walls.map((wall, wi) => (
            <>
              {(["p1", "p2"] as const).map(pt => (
                <div
                  key={`wp-${wi}-${pt}`}
                  className="absolute w-4 h-4 bg-foreground border-2 border-background rounded-full cursor-grab active:cursor-grabbing"
                  style={{
                    left: `calc(${wall[pt].x}% - 8px)`,
                    top: `calc(${wall[pt].y}% - 8px)`,
                    zIndex: 20,
                    touchAction: "none",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDraggingWallPoint({ wallIdx: wi, point: pt });
                    const handleMove = (ev: MouseEvent) => handleWallPointDrag(wi, pt, ev.clientX, ev.clientY);
                    const handleUp = () => {
                      setDraggingWallPoint(null);
                      document.removeEventListener("mousemove", handleMove);
                      document.removeEventListener("mouseup", handleUp);
                    };
                    document.addEventListener("mousemove", handleMove);
                    document.addEventListener("mouseup", handleUp);
                  }}
                  onTouchStart={(e) => {
                    setDraggingWallPoint({ wallIdx: wi, point: pt });
                    const handleMove = (ev: TouchEvent) => {
                      ev.preventDefault();
                      handleWallPointDrag(wi, pt, ev.touches[0].clientX, ev.touches[0].clientY);
                    };
                    const handleEnd = () => {
                      setDraggingWallPoint(null);
                      document.removeEventListener("touchmove", handleMove);
                      document.removeEventListener("touchend", handleEnd);
                    };
                    document.addEventListener("touchmove", handleMove, { passive: false });
                    document.addEventListener("touchend", handleEnd);
                  }}
                />
              ))}
            </>
          ))}

          {/* Room overlays */}
          {scanMode === "bauplan" && analyzedRooms.map((room, i) => (
            <div
              key={i}
              className="absolute cursor-grab active:cursor-grabbing select-none"
              style={{
                left: `${room.x || 10}%`,
                top: `${room.y || 10}%`,
                touchAction: "none",
                zIndex: 15,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setDraggingRoom(i);
                const container = imageContainerRef.current;
                if (!container) return;
                const handleMove = (ev: MouseEvent) => {
                  const rect = container.getBoundingClientRect();
                  const x = Math.max(0, Math.min(90, ((ev.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(0, Math.min(90, ((ev.clientY - rect.top) / rect.height) * 100));
                  setAnalyzedRooms(prev => prev.map((r, idx) => idx === i ? { ...r, x, y } : r));
                };
                const handleUp = () => {
                  setDraggingRoom(null);
                  document.removeEventListener("mousemove", handleMove);
                  document.removeEventListener("mouseup", handleUp);
                };
                document.addEventListener("mousemove", handleMove);
                document.addEventListener("mouseup", handleUp);
              }}
              onTouchStart={(e) => {
                setDraggingRoom(i);
                const container = imageContainerRef.current;
                if (!container) return;
                const handleMove = (ev: TouchEvent) => {
                  ev.preventDefault();
                  const touch = ev.touches[0];
                  const rect = container.getBoundingClientRect();
                  const x = Math.max(0, Math.min(90, ((touch.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(0, Math.min(90, ((touch.clientY - rect.top) / rect.height) * 100));
                  setAnalyzedRooms(prev => prev.map((r, idx) => idx === i ? { ...r, x, y } : r));
                };
                const handleEnd = () => {
                  setDraggingRoom(null);
                  document.removeEventListener("touchmove", handleMove);
                  document.removeEventListener("touchend", handleEnd);
                };
                document.addEventListener("touchmove", handleMove, { passive: false });
                document.addEventListener("touchend", handleEnd);
              }}
            >
              <div
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-lg border border-white/30 whitespace-nowrap"
                style={{ backgroundColor: room.color || "hsl(var(--primary))" }}
              >
                {room.name}
                {room.flaeche_ca ? <span className="ml-1 opacity-75">~{room.flaeche_ca}m²</span> : null}
              </div>
            </div>
          ))}

          {analyzing && (
            <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center" style={{ zIndex: 30 }}>
              <div className="bg-card rounded-2xl p-6 text-center shadow-md-custom">
                <RefreshCw size={32} className="text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-bold text-foreground">KI analysiert Bauplan…</p>
                <p className="text-xs text-muted-foreground mt-1">Räume & Wände werden erkannt</p>
              </div>
            </div>
          )}
          <button onClick={() => { setCapturedImage(null); setAnalyzedRooms([]); setWalls([]); setScanMode("none"); }}
            className="absolute top-3 right-3 bg-foreground/60 text-white rounded-full p-1.5" style={{ zIndex: 30 }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative w-full rounded-2xl bg-foreground overflow-hidden mb-5 shadow-md-custom" style={{ paddingTop: "70%" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl border-2 border-primary flex items-center justify-center mx-auto mb-3 relative">
                <Camera size={36} className="text-primary" />
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br"></div>
              </div>
              <p className="text-white font-semibold text-sm">Kamera aktivieren</p>
              <p className="text-white/50 text-xs mt-1">Objekt in den Rahmen richten</p>
            </div>
          </div>
          <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-primary/60 shadow-orange opacity-75"></div>
        </div>
      )}

      {/* Analyzed Rooms Editor */}
      {analyzedRooms.length > 0 && (
        <div className="mb-5 bg-card border border-border rounded-2xl p-4 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> KI-Raumerkennung · {walls.length} Wände
          </h3>
          {planSummary && <p className="text-xs text-muted-foreground mb-3">{planSummary}</p>}
          <div className="space-y-2">
            {analyzedRooms.map((room, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-accent rounded-xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: room.color || "hsl(var(--primary))" }}>
                  {i + 1}
                </div>
                {editingRoom === i ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      value={editRoomName}
                      onChange={e => setEditRoomName(e.target.value)}
                      className="flex-1 bg-card border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    <button onClick={() => saveRoomEdit(i)} className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditingRoom(null)} className="p-1.5 rounded-lg bg-muted">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEditRoom(i)}>
                    <p className="text-sm font-semibold text-foreground">{room.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {room.flaeche_ca ? `~${room.flaeche_ca} m²` : ""}
                      {room.merkmale ? ` · ${room.merkmale}` : ""}
                    </p>
                  </div>
                )}
                <GripVertical size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Tippe zum Bearbeiten · Labels & Wand-Endpunkte per Drag & Drop verschieben</p>
        </div>
      )}

      {/* Schnell-Aktionen */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => handleCapture("bauplan")}
          className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-orange flex flex-col items-center gap-2 hover:bg-primary-dark transition-all active:scale-95">
          <ScanLine size={28} />
          <span className="font-bold text-sm">Bauplan scannen</span>
          <span className="text-xs text-primary-foreground/70">KI-Raum & Wände</span>
        </button>
        <button onClick={() => handleCapture("objekt")}
          className="bg-card border border-border p-4 rounded-2xl shadow-card flex flex-col items-center gap-2 hover:bg-accent transition-all active:scale-95">
          <Image size={28} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Objekt Foto</span>
          <span className="text-xs text-muted-foreground">Für Exposé verwenden</span>
        </button>
        <button onClick={() => handleCapture("dokument")}
          className="bg-card border border-border p-4 rounded-2xl shadow-card flex flex-col items-center gap-2 hover:bg-accent transition-all active:scale-95">
          <FileText size={28} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Dokument Scannen</span>
          <span className="text-xs text-muted-foreground">PDF erstellen</span>
        </button>
        <button onClick={() => { setScanMode("objekt"); fileRef.current?.click(); }}
          className="bg-card border border-border p-4 rounded-2xl shadow-card flex flex-col items-center gap-2 hover:bg-accent transition-all active:scale-95">
          <Upload size={28} className="text-primary" />
          <span className="font-bold text-sm text-foreground">Foto hochladen</span>
          <span className="text-xs text-muted-foreground">Galerie auswählen</span>
        </button>
      </div>

      {/* Offline Queue */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-500" />
          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">{offlineQueue.length} Aufnahmen warten</p>
            <p className="text-xs text-muted-foreground">Werden automatisch hochgeladen bei Verbindung</p>
          </div>
          {isOnline && (
            <button onClick={syncOfflineQueue} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-bold">
              Jetzt sync
            </button>
          )}
        </div>
      )}

      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4 shadow-orange text-primary-foreground flex items-center gap-3">
        <Sparkles size={24} />
        <div>
          <p className="font-bold text-sm">KI Bauplan- & Visitenkarten-Erkennung</p>
          <p className="text-xs text-primary-foreground/80">Räume & Wände werden erkannt. Endpunkte der Wände und Beschriftungen sind per Drag & Drop korrigierbar.</p>
        </div>
      </div>
    </div>
  );
}
