import { useState, useEffect } from "react";
import { BarChart3, Eye, MessageCircle, Mail, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Stat {
  id: string;
  kunde_name: string | null;
  typ: string;
  kanal: string | null;
  aufrufe: number;
  letzter_aufruf: string;
}

interface ObjektStatistikenProps {
  objektId: string;
}

export default function ObjektStatistiken({ objektId }: ObjektStatistikenProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !objektId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("objekt_statistiken")
        .select("*")
        .eq("objekt_id", objektId)
        .order("letzter_aufruf", { ascending: false });
      if (data) setStats(data as Stat[]);
      setLoading(false);
    };
    load();
  }, [user, objektId]);

  const totalAufrufe = stats.reduce((sum, s) => sum + s.aufrufe, 0);
  const whatsappCount = stats.filter(s => s.kanal === "whatsapp").reduce((sum, s) => sum + s.aufrufe, 0);
  const emailCount = stats.filter(s => s.kanal === "email").reduce((sum, s) => sum + s.aufrufe, 0);
  const videoCount = stats.filter(s => s.typ === "video").reduce((sum, s) => sum + s.aufrufe, 0);
  const exposeCount = stats.filter(s => s.typ === "expose").reduce((sum, s) => sum + s.aufrufe, 0);

  if (loading) {
    return <div className="text-center py-6 text-muted-foreground text-xs">Statistiken laden…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <Eye size={18} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalAufrufe}</p>
          <p className="text-[10px] text-muted-foreground">Gesamt-Aufrufe</p>
        </div>
        <div className="bg-accent rounded-xl p-3 text-center">
          <TrendingUp size={18} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{stats.length}</p>
          <p className="text-[10px] text-muted-foreground">Kontakte erreicht</p>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="bg-card border border-border rounded-xl p-3">
        <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <BarChart3 size={13} className="text-primary" /> Kanal-Aufschlüsselung
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle size={11} className="text-green-600" /> WhatsApp
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${totalAufrufe > 0 ? (whatsappCount / totalAufrufe * 100) : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-foreground w-6 text-right">{whatsappCount}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail size={11} className="text-blue-500" /> E-Mail
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalAufrufe > 0 ? (emailCount / totalAufrufe * 100) : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-foreground w-6 text-right">{emailCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Type Breakdown */}
      <div className="flex gap-2">
        <div className="flex-1 bg-accent rounded-xl px-3 py-2 text-center">
          <p className="text-sm font-bold text-foreground">{exposeCount}</p>
          <p className="text-[10px] text-muted-foreground">Exposé</p>
        </div>
        <div className="flex-1 bg-accent rounded-xl px-3 py-2 text-center">
          <p className="text-sm font-bold text-foreground">{videoCount}</p>
          <p className="text-[10px] text-muted-foreground">Video</p>
        </div>
      </div>

      {/* Recent Activity */}
      {stats.length > 0 ? (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Letzte Aktivitäten</h4>
          <div className="space-y-1.5">
            {stats.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 bg-accent rounded-lg text-xs">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${s.kanal === "whatsapp" ? "bg-green-500/20" : "bg-blue-500/20"}`}>
                  {s.kanal === "whatsapp" ? <MessageCircle size={11} className="text-green-600" /> : <Mail size={11} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{s.kunde_name || "Unbekannt"}</p>
                  <p className="text-[10px] text-muted-foreground">{s.typ === "video" ? "Video" : "Exposé"} · {s.aufrufe}× angesehen</p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(s.letzter_aufruf).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Noch keine Interaktionen aufgezeichnet.</p>
      )}
    </div>
  );
}
