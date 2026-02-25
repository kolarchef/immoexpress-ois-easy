import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldCheck, Users, BarChart3, Settings, TrendingUp,
  Building2, FileText, Clock, ChevronRight, UserCog,
  Plus, Search, GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type GpRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  status: string;
  gesperrt: boolean;
  elearning_zugang: boolean;
  lernerfolg: string | null;
  gp_number: string | null;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};

type RoleRow = { user_id: string; role: string };

type StatBlock = { label: string; value: string | number; icon: any };

type Filter = "alle" | "makler" | "trainees" | "gesperrt";

export default function AdminCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [partners, setPartners] = useState<GpRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<StatBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("alle");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [profRes, roleRes, gpRes, objekteRes, kundenRes, termineRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, email, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("geschaeftspartner").select("id, user_id, name, email, status, gesperrt, elearning_zugang, lernerfolg, gp_number"),
      supabase.from("objekte").select("id", { count: "exact", head: true }),
      supabase.from("crm_kunden").select("id", { count: "exact", head: true }),
      supabase.from("termine").select("id", { count: "exact", head: true }),
    ]);

    setProfiles((profRes.data as ProfileRow[]) || []);
    setPartners((gpRes.data as GpRow[]) || []);

    const roleMap: Record<string, string> = {};
    ((roleRes.data as RoleRow[]) || []).forEach(r => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);

    setStats([
      { label: "Makler gesamt", value: profRes.data?.length || 0, icon: Users },
      { label: "Objekte", value: objekteRes.count || 0, icon: Building2 },
      { label: "Kunden", value: kundenRes.count || 0, icon: TrendingUp },
      { label: "Termine", value: termineRes.count || 0, icon: Clock },
    ]);

    setLoading(false);
  };

  const getProgress = (lernerfolg: string | null): number => {
    if (!lernerfolg) return 0;
    const num = parseInt(lernerfolg.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : Math.min(num, 100);
  };

  const getPartnerForProfile = (userId: string) =>
    partners.find(p => p.user_id === userId);

  const toggleGesperrt = async (gpId: string, current: boolean) => {
    const { error } = await supabase
      .from("geschaeftspartner")
      .update({ gesperrt: !current })
      .eq("id", gpId);
    if (error) { toast.error("Fehler beim Ändern des Status"); return; }
    toast.success(!current ? "Zugang gesperrt" : "Zugang aktiviert");
    setPartners(prev => prev.map(p => p.id === gpId ? { ...p, gesperrt: !current } : p));
  };

  const toggleElearning = async (gpId: string, current: boolean) => {
    const { error } = await supabase
      .from("geschaeftspartner")
      .update({ elearning_zugang: !current })
      .eq("id", gpId);
    if (error) { toast.error("Fehler beim Ändern"); return; }
    toast.success(!current ? "E-Learning freigeschaltet" : "E-Learning deaktiviert");
    setPartners(prev => prev.map(p => p.id === gpId ? { ...p, elearning_zugang: !current } : p));
  };

  const filteredProfiles = useMemo(() => {
    let list = profiles.map(p => {
      const gp = getPartnerForProfile(p.user_id);
      return { ...p, gp, progress: gp ? getProgress(gp.lernerfolg) : 0 };
    });

    // filter
    if (filter === "makler") list = list.filter(p => (p.gp?.status || roles[p.user_id] || "makler") === "makler");
    if (filter === "trainees") list = list.filter(p => p.gp?.status === "trainee");
    if (filter === "gesperrt") list = list.filter(p => p.gp?.gesperrt === true);

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.display_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.gp?.gp_number || "").toLowerCase().includes(q)
      );
    }

    // sort: trainees with 100% first, then by name
    list.sort((a, b) => {
      if (a.progress === 100 && b.progress !== 100) return -1;
      if (b.progress === 100 && a.progress !== 100) return 1;
      return (a.display_name || "").localeCompare(b.display_name || "");
    });

    return list;
  }, [profiles, partners, roles, filter, search]);

  const quickLinks = [
    { label: "Audit-Logs", desc: "Alle Bestätigungen & Aktionen", icon: FileText, path: "/admin/audit-logs" },
    { label: "SOS-Recht Audit", desc: "Haftungsbestätigungen prüfen", icon: ShieldCheck, path: "/admin/sos-audit" },
    { label: "Bestell-Admin", desc: "Bestellungen verwalten", icon: Settings, path: "/bestell-admin" },
    { label: "Team-Performance", desc: "Makler-Leistungen im Überblick", icon: BarChart3, path: "/team-performance" },
  ];

  const filters: { key: Filter; label: string }[] = [
    { key: "alle", label: "Alle" },
    { key: "makler", label: "Makler" },
    { key: "trainees", label: "Trainees" },
    { key: "gesperrt", label: "Gesperrt" },
  ];

  const getRoleBadge = (userId: string, gp?: GpRow) => {
    if (gp?.gesperrt) return { label: "Gesperrt", variant: "destructive" as const };
    const role = roles[userId];
    if (role === "admin") return { label: "Admin", variant: "destructive" as const };
    if (gp?.status === "trainee") return { label: "Trainee", variant: "secondary" as const };
    return { label: "Makler", variant: "secondary" as const };
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4 animate-pulse" style={{ paddingBottom: 150 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto animate-fade-in" style={{ paddingBottom: 150 }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldCheck size={24} className="text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin-Center</h1>
          <p className="text-xs text-muted-foreground">Nutzerverwaltung · Statistiken · System</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl p-4 shadow-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon size={16} className="text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Verwaltung</h2>
        <div className="space-y-2">
          {quickLinks.map(({ label, desc, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card border border-border hover:border-primary/30 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* Nutzerverwaltung */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <UserCog size={18} className="text-primary" /> Nutzer ({filteredProfiles.length})
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => navigate("/netzwerk")}
          >
            <Plus size={14} /> Neu
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name, E-Mail oder GP-Nr. suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* User List */}
        <div className="space-y-2">
          {filteredProfiles.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Keine Nutzer gefunden.</p>
          )}
          {filteredProfiles.map((p) => {
            const gp = p.gp;
            const badge = getRoleBadge(p.user_id, gp);
            const isTrainee = gp?.status === "trainee";
            const progress = p.progress;

            return (
              <div
                key={p.user_id}
                className={`p-4 rounded-2xl bg-card shadow-card border transition-all ${
                  gp?.gesperrt ? "border-destructive/30 opacity-70" : "border-border"
                }`}
              >
                {/* Top row */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    gp?.gesperrt ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    <span className={`text-sm font-bold ${gp?.gesperrt ? "text-destructive" : "text-primary"}`}>
                      {(p.display_name || p.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {p.display_name || p.email || p.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <Badge
                    variant={badge.variant}
                    className={`text-[10px] shrink-0 ${
                      badge.label === "Gesperrt" ? "" :
                      badge.label === "Admin" ? "bg-primary/20 text-primary border-primary/30" : ""
                    }`}
                  >
                    {badge.label}
                  </Badge>
                </div>

                {/* Trainee progress */}
                {isTrainee && (
                  <div className="mt-3 flex items-center gap-3">
                    <GraduationCap size={14} className="text-primary shrink-0" />
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className={`text-xs font-bold min-w-[36px] text-right ${
                      progress === 100 ? "text-green-600" : "text-muted-foreground"
                    }`}>
                      {progress}%
                    </span>
                  </div>
                )}

                {/* Toggles */}
                {gp && (
                  <div className="mt-3 flex items-center gap-6 pt-2 border-t border-border/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={!gp.gesperrt}
                        onCheckedChange={() => toggleGesperrt(gp.id, gp.gesperrt)}
                      />
                      <span className={`text-xs font-medium ${!gp.gesperrt ? "text-green-600" : "text-destructive"}`}>
                        {!gp.gesperrt ? "Aktiv" : "Gesperrt"}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={gp.elearning_zugang}
                        onCheckedChange={() => toggleElearning(gp.id, gp.elearning_zugang)}
                      />
                      <span className="text-xs font-medium text-muted-foreground">E-Learning</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
