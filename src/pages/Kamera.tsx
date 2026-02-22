import { useState, useRef, useEffect } from "react";
import { Camera, ScanLine, FileText, Image, Upload, Sparkles, RefreshCw, X, Check, AlertTriangle, Cloud, CloudOff, Bug, GripVertical, Plus, Trash2, Pencil, Save, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type ScanMode = "none" | "bauplan" | "objekt" | "dokument";

interface WallPoint { x: number; y: number; }
interface Wall { p1: WallPoint; p2: WallPoint; color: string; thickness: number; }

interface AnalyzedRoom {
  name: string;
  flaeche_ca?: number;
  merkmale?: string;
  color?: string;
  x?: number;
  y?: number;
}

const WALL_COLORS = ["#E67E22", "#1a1a2e", "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6"];
const DEFAULT_WALL_COLOR = "#E67E22"; // Orange – Firmafarbe
const DEFAULT_WALL_THICKNESS = 3;

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

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [selectedWall, setSelectedWall] = useState<number | null>(null);
  const [addingWall, setAddingWall] = useState(false);
  const [newWallStart, setNewWallStart] = useState<WallPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [annotationId, setAnnotationId] = useState<string | null>(null);

  const effectiveOnline = isOnline && !simulateOffline;

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
    setEditMode(false);
    setSelectedWall(null);
    setAddingWall(false);
    setAnnotationId(null);
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

        // Use KI-detected walls if available, otherwise generate from room count
        let generatedWalls: Wall[] = [];
        if (parsed.waende && parsed.waende.length > 0) {
          generatedWalls = parsed.waende.map((w: { p1: WallPoint; p2: WallPoint }) => ({
            p1: w.p1,
            p2: w.p2,
            color: DEFAULT_WALL_COLOR,
            thickness: DEFAULT_WALL_THICKNESS,
          }));
        } else {
          // Fallback: generate basic walls
          const base: { p1: WallPoint; p2: WallPoint }[] = [
            { p1: { x: 5, y: 5 }, p2: { x: 95, y: 5 } },
            { p1: { x: 95, y: 5 }, p2: { x: 95, y: 95 } },
            { p1: { x: 95, y: 95 }, p2: { x: 5, y: 95 } },
            { p1: { x: 5, y: 95 }, p2: { x: 5, y: 5 } },
          ];
          if (rooms.length >= 2) base.push({ p1: { x: 50, y: 5 }, p2: { x: 50, y: 95 } });
          if (rooms.length >= 3) base.push({ p1: { x: 5, y: 50 }, p2: { x: 50, y: 50 } });
          if (rooms.length >= 4) base.push({ p1: { x: 50, y: 50 }, p2: { x: 95, y: 50 } });
          generatedWalls = base.map(w => ({ ...w, color: DEFAULT_WALL_COLOR, thickness: DEFAULT_WALL_THICKNESS }));
        }
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

  // --- Edit mode functions ---
  const addWallAtClick = (clientX: number, clientY: number) => {
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    if (!newWallStart) {
      setNewWallStart({ x, y });
      toast({ title: "Startpunkt gesetzt", description: "Klicke auf den Endpunkt der neuen Linie." });
    } else {
      setWalls(prev => [...prev, { p1: newWallStart, p2: { x, y }, color: DEFAULT_WALL_COLOR, thickness: DEFAULT_WALL_THICKNESS }]);
      setNewWallStart(null);
      setAddingWall(false);
      toast({ title: "✓ Linie hinzugefügt" });
    }
  };

  const deleteWall = (idx: number) => {
    setWalls(prev => prev.filter((_, i) => i !== idx));
    setSelectedWall(null);
    toast({ title: "✓ Linie gelöscht" });
  };

  const updateWallColor = (idx: number, color: string) => {
    setWalls(prev => prev.map((w, i) => i === idx ? { ...w, color } : w));
  };

  const updateWallThickness = (idx: number, thickness: number) => {
    setWalls(prev => prev.map((w, i) => i === idx ? { ...w, thickness } : w));
  };

  // --- Save/Load annotations ---
  const saveAnnotations = async () => {
    if (!user) { toast({ title: "Bitte einloggen", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        image_url: capturedImage,
        walls: JSON.parse(JSON.stringify(walls)),
        rooms: JSON.parse(JSON.stringify(analyzedRooms)),
        summary: planSummary,
      };

      if (annotationId) {
        const { error } = await supabase.from("bauplan_annotationen").update(payload).eq("id", annotationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("bauplan_annotationen").insert(payload).select("id").single();
        if (error) throw error;
        if (data) setAnnotationId(data.id);
      }
      toast({ title: "✅ Bauplan gespeichert", description: "Alle Anpassungen wurden in der Datenbank gesichert." });
    } catch (err) {
      toast({ title: "Speichern fehlgeschlagen", description: err instanceof Error ? err.message : "Fehler", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
        <div
          ref={imageContainerRef}
          className="relative w-full rounded-2xl overflow-hidden mb-3 shadow-md-custom"
          onClick={(e) => {
            if (addingWall && editMode) {
              addWallAtClick(e.clientX, e.clientY);
            }
          }}
        >
          <img src={capturedImage} alt="Aufnahme" className="w-full object-contain max-h-[60vh]" />
          
          {/* SVG Wall overlay */}
          {scanMode === "bauplan" && walls.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
              {walls.map((wall, wi) => (
                <line
                  key={`wall-${wi}`}
                  x1={`${wall.p1.x}%`} y1={`${wall.p1.y}%`}
                  x2={`${wall.p2.x}%`} y2={`${wall.p2.y}%`}
                  stroke={wall.color}
                  strokeWidth={wall.thickness}
                  strokeLinecap="round"
                  opacity={selectedWall === wi ? 1 : 0.85}
                  className={selectedWall === wi ? "drop-shadow-lg" : ""}
                />
              ))}
              {/* New wall preview line */}
              {addingWall && newWallStart && (
                <circle cx={`${newWallStart.x}%`} cy={`${newWallStart.y}%`} r="6" fill={DEFAULT_WALL_COLOR} opacity="0.7" />
              )}
            </svg>
          )}

          {/* Wall endpoint handles */}
          {scanMode === "bauplan" && walls.map((wall, wi) => (
            <div key={`wg-${wi}`}>
              {(["p1", "p2"] as const).map(pt => (
                <div
                  key={`wp-${wi}-${pt}`}
                  className="absolute w-4 h-4 rounded-full cursor-grab active:cursor-grabbing border-2 border-background"
                  style={{
                    left: `calc(${wall[pt].x}% - 8px)`,
                    top: `calc(${wall[pt].y}% - 8px)`,
                    zIndex: 20,
                    touchAction: "none",
                    backgroundColor: wall.color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode) setSelectedWall(wi);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                    e.stopPropagation();
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
            </div>
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
                e.stopPropagation();
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
                e.stopPropagation();
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
          <button onClick={() => { setCapturedImage(null); setAnalyzedRooms([]); setWalls([]); setScanMode("none"); setEditMode(false); }}
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

      {/* Edit Mode Toolbar */}
      {scanMode === "bauplan" && walls.length > 0 && (
        <div className="mb-3 bg-card border border-border rounded-2xl p-3 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Pencil size={12} className="text-primary" /> Bearbeitungs-Modus
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditMode(!editMode); setSelectedWall(null); setAddingWall(false); setNewWallStart(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${editMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
              >
                {editMode ? "Bearbeiten: AN" : "Bearbeiten: AUS"}
              </button>
              <button
                onClick={saveAnnotations}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50"
              >
                <Save size={12} /> {saving ? "…" : "Speichern"}
              </button>
            </div>
          </div>

          {editMode && (
            <div className="space-y-2">
              {/* Add / Delete wall buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAddingWall(!addingWall); setNewWallStart(null); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${addingWall ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  <Plus size={12} /> {addingWall ? "Klicke auf Plan…" : "Linie hinzufügen"}
                </button>
                {selectedWall !== null && (
                  <button
                    onClick={() => deleteWall(selectedWall)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
                  >
                    <Trash2 size={12} /> Löschen
                  </button>
                )}
              </div>

              {/* Selected wall properties */}
              {selectedWall !== null && walls[selectedWall] && (
                <div className="bg-accent rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-foreground">Linie #{selectedWall + 1}</p>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Palette size={10} /> Farbe</p>
                    <div className="flex items-center gap-1.5">
                      {WALL_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateWallColor(selectedWall, c)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${walls[selectedWall].color === c ? "border-foreground scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Dicke: {walls[selectedWall].thickness}px</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 6, 8].map(t => (
                        <button
                          key={t}
                          onClick={() => updateWallThickness(selectedWall, t)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${walls[selectedWall].thickness === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {selectedWall === null && !addingWall && (
                <p className="text-[10px] text-muted-foreground">Klicke auf einen Wand-Endpunkt, um Farbe und Dicke zu ändern.</p>
              )}
            </div>
          )}
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
          <p className="text-xs text-primary-foreground/80">Räume & Wände werden erkannt. Nutze den Bearbeitungs-Modus für Farbe, Dicke & neue Linien.</p>
        </div>
      </div>
    </div>
  );
}
