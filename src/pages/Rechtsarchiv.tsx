import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, FileText, Clock, ChevronRight, Scale, UserCheck, Lock,
  FileSignature, Search, Users, CheckCircle2, Eye, BarChart3, Receipt
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ArchivEntry = {
  id: string;
  typ: "haftung" | "widerruf" | "datenschutz" | "alleinvermittler";
  titel: string;
  zeitstempel: string;
  modul?: string;
  gp_nummer?: string;
  ip?: string;
  detail?: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  gesehen_von: string[];
};

const typConfig: Record<ArchivEntry["typ"], { label: string; icon: typeof Shield; color: string; tab: string }> = {
  haftung: { label: "Haftungsausschluss", icon: Scale, color: "text-red-500 bg-red-500/10", tab: "haftung" },
  widerruf: { label: "Widerrufsbelehrung", icon: FileSignature, color: "text-amber-500 bg-amber-500/10", tab: "widerruf" },
  datenschutz: { label: "Datenschutz", icon: Lock, color: "text-blue-500 bg-blue-500/10", tab: "datenschutz" },
  alleinvermittler: { label: "Alleinvermittler", icon: UserCheck, color: "text-emerald-500 bg-emerald-500/10", tab: "alleinvermittler" },
};

export default function Rechtsarchiv() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ArchivEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArchivEntry | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedMakler, setExpandedMakler] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadEntries();
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    setIsAdmin(!!data?.length);
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data: consents } = await supabase
        .from("audit_legal_consent")
        .select("*")
        .order("created_at", { ascending: false });

      // Load profiles for user names
      const userIds = [...new Set((consents || []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { name: p.display_name || p.email || "Unbekannt", email: p.email }])
      );

      const mapped: ArchivEntry[] = (consents || []).map((c) => {
        const profile = profileMap.get(c.user_id);
        return {
          id: c.id,
          typ: c.modul === "datenschutz" ? "datenschutz" : c.modul === "widerruf" ? "widerruf" : c.modul === "alleinvermittler" ? "alleinvermittler" : "haftung",
          titel: c.modul === "datenschutz" ? "DSGVO-Einwilligung" : c.modul === "widerruf" ? "Widerrufsbelehrung" : c.modul === "alleinvermittler" ? "Alleinvermittlerauftrag" : `Haftungsausschluss – ${c.modul || "SOS Recht"}`,
          zeitstempel: c.created_at,
          modul: c.modul || "SOS Recht",
          gp_nummer: c.gp_nummer || undefined,
          ip: c.ip_address || undefined,
          detail: `Status: ${c.confirmation_status}`,
          user_id: c.user_id,
          user_name: profile?.name || "Unbekannt",
          user_email: profile?.email || undefined,
          gesehen_von: (c as any).gesehen_von || [],
        };
      });

      setEntries(mapped);
    } catch (err) {
      console.error("Fehler beim Laden des Rechtsarchivs:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsSeen = async (entry: ArchivEntry) => {
    if (!user || entry.gesehen_von.includes(user.id)) return;
    const updated = [...entry.gesehen_von, user.id];
    await supabase
      .from("audit_legal_consent")
      .update({ gesehen_von: updated } as any)
      .eq("id", entry.id);
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, gesehen_von: updated } : e))
    );
  };

  const handleSelect = (entry: ArchivEntry) => {
    const isOpen = selected?.id === entry.id;
    setSelected(isOpen ? null : entry);
    if (!isOpen) markAsSeen(entry);
  };

  const unseenCount = useMemo(() => {
    if (!user) return 0;
    return entries.filter((e) => !e.gesehen_von.includes(user.id)).length;
  }, [entries, user]);

  const unseenByType = useMemo(() => {
    if (!user) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const e of entries) {
      if (!e.gesehen_von.includes(user.id)) {
        counts[e.typ] = (counts[e.typ] || 0) + 1;
      }
    }
    return counts;
  }, [entries, user]);

  // Filter entries by search
  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.titel.toLowerCase().includes(q) ||
        e.user_name?.toLowerCase().includes(q) ||
        e.user_email?.toLowerCase().includes(q) ||
        e.gp_nummer?.toLowerCase().includes(q) ||
        e.modul?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Group by type
  const byType = useMemo(() => {
    const groups: Record<string, ArchivEntry[]> = {};
    for (const e of filtered) {
      if (!groups[e.typ]) groups[e.typ] = [];
      groups[e.typ].push(e);
    }
    return groups;
  }, [filtered]);

  // Group by makler within a type
  const groupByMakler = (items: ArchivEntry[]) => {
    const groups: Record<string, ArchivEntry[]> = {};
    for (const e of items) {
      const key = e.user_name || "Unbekannt";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  // Stats for overview
  const stats = useMemo(() => ({
    total: entries.length,
    unseen: unseenCount,
    haftung: entries.filter((e) => e.typ === "haftung").length,
    widerruf: entries.filter((e) => e.typ === "widerruf").length,
    datenschutz: entries.filter((e) => e.typ === "datenschutz").length,
    alleinvermittler: entries.filter((e) => e.typ === "alleinvermittler").length,
    maklerCount: new Set(entries.map((e) => e.user_id)).size,
  }), [entries, unseenCount]);

  return (
    <div className="p-4 pb-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-destructive flex items-center justify-center shadow-lg">
          <FileText size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">§ Rechtsarchiv</h1>
          <p className="text-xs text-muted-foreground">Compliance-Archiv · 7 Jahre Aufbewahrung</p>
        </div>
        {unseenCount > 0 && (
          <Badge className="bg-orange-500 text-white border-orange-500 text-sm px-2.5">
            {unseenCount} neu
          </Badge>
        )}
      </div>

      {/* Global Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Name, E-Mail, GP-Nr. oder Modul suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto mb-4">
          <TabsTrigger value="overview" className="flex-1 text-xs gap-1">
            <BarChart3 size={14} /> Übersicht
          </TabsTrigger>
          {Object.entries(typConfig).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="flex-1 text-xs gap-1 relative">
              <cfg.icon size={14} /> {cfg.tab === "haftung" ? "Haftung" : cfg.tab === "widerruf" ? "Widerruf" : cfg.tab === "datenschutz" ? "DSGVO" : "Alleinv."}
              {(unseenByType[key] || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unseenByType[key]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {loading ? (
            <LoadingState />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Gesamt-Einträge" value={stats.total} icon={FileText} />
                <StatCard label="Ungelesen" value={stats.unseen} icon={Eye} color="text-orange-500" />
                <StatCard label="Makler aktiv" value={stats.maklerCount} icon={Users} />
                <StatCard label="Haftungsausschlüsse" value={stats.haftung} icon={Scale} />
              </div>

              {/* Category summary cards */}
              <div className="space-y-2 mt-4">
                {Object.entries(typConfig).map(([key, cfg]) => {
                  const count = entries.filter((e) => e.typ === key).length;
                  const unseen = unseenByType[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-all text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                        <cfg.icon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{count} Einträge</p>
                      </div>
                      {unseen > 0 && (
                        <Badge className="bg-orange-500 text-white border-orange-500">{unseen}</Badge>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Category Tabs */}
        {Object.entries(typConfig).map(([key, cfg]) => (
          <TabsContent key={key} value={key}>
            {loading ? (
              <LoadingState />
            ) : (byType[key] || []).length === 0 ? (
              <EmptyState label={cfg.label} />
            ) : (
              <MaklerGroupedList
                entries={byType[key] || []}
                cfg={cfg}
                selected={selected}
                onSelect={handleSelect}
                expandedMakler={expandedMakler}
                setExpandedMakler={setExpandedMakler}
                currentUserId={user?.id || ""}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* --- Sub Components --- */

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof FileText; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color || "text-muted-foreground"} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function MaklerGroupedList({
  entries, cfg, selected, onSelect, expandedMakler, setExpandedMakler, currentUserId
}: {
  entries: ArchivEntry[];
  cfg: { label: string; icon: typeof Shield; color: string };
  selected: ArchivEntry | null;
  onSelect: (e: ArchivEntry) => void;
  expandedMakler: string | null;
  setExpandedMakler: (v: string | null) => void;
  currentUserId: string;
}) {
  const groups = useMemo(() => {
    const g: Record<string, ArchivEntry[]> = {};
    for (const e of entries) {
      const key = e.user_name || "Unbekannt";
      if (!g[key]) g[key] = [];
      g[key].push(e);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  return (
    <div className="space-y-2">
      {groups.map(([maklerName, items]) => {
        const isExpanded = expandedMakler === maklerName;
        const unseenCount = items.filter((e) => !e.gesehen_von.includes(currentUserId)).length;
        const allSeen = unseenCount === 0;

        return (
          <div key={maklerName} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedMakler(isExpanded ? null : maklerName)}
              className="w-full flex items-center gap-3 p-3.5 hover:bg-accent/50 transition-all text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${allSeen ? "bg-emerald-500/10" : "bg-orange-500/10"}`}>
                <Users size={16} className={allSeen ? "text-emerald-500" : "text-orange-500"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{maklerName}</p>
                <p className="text-xs text-muted-foreground">{items.length} Einträge</p>
              </div>
              {unseenCount > 0 && (
                <Badge className="bg-orange-500 text-white border-orange-500 text-[10px]">{unseenCount} neu</Badge>
              )}
              {allSeen && <CheckCircle2 size={16} className="text-emerald-500" />}
              <ChevronRight size={16} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-border divide-y divide-border animate-fade-in">
                {items.map((entry) => {
                  const isSeen = entry.gesehen_von.includes(currentUserId);
                  const IconComp = cfg.icon;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => onSelect(entry)}
                      className={`w-full text-left p-3 hover:bg-accent/30 transition-all ${!isSeen ? "bg-orange-500/5" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSeen ? "bg-emerald-500" : "bg-orange-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{entry.titel}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.zeitstempel), "dd.MM.yyyy, HH:mm 'Uhr'", { locale: de })}
                            {entry.gp_nummer && <span className="ml-2">· GP {entry.gp_nummer}</span>}
                          </p>
                        </div>
                        {!isSeen && <span className="text-[10px] text-orange-500 font-bold">NEU</span>}
                        <ChevronRight size={14} className={`text-muted-foreground transition-transform ${selected?.id === entry.id ? "rotate-90" : ""}`} />
                      </div>

                      {selected?.id === entry.id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-1.5 animate-fade-in ml-5">
                          <DetailRow label="Makler" value={entry.user_name || "–"} />
                          <DetailRow label="E-Mail" value={entry.user_email || "–"} />
                          <DetailRow label="Modul" value={entry.modul || "–"} />
                          <DetailRow label="GP-Nummer" value={entry.gp_nummer || "–"} />
                          <DetailRow label="IP-Adresse" value={entry.ip || "–"} />
                          <DetailRow label="Status" value={entry.detail || "–"} />
                          <DetailRow label="Zeitstempel" value={format(new Date(entry.zeitstempel), "dd.MM.yyyy HH:mm:ss", { locale: de })} />
                          <DetailRow label="Gesehen" value={`${entry.gesehen_von.length} Nutzer`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Clock size={20} className="animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Lade Archiv…</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-16">
      <Shield size={40} className="mx-auto text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">Keine {label}-Einträge gefunden.</p>
    </div>
  );
}
