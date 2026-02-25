import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldCheck, Users, BarChart3, Settings, TrendingUp,
  Building2, FileText, Clock, ChevronRight, UserCog
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};

type RoleRow = { user_id: string; role: string };

type StatBlock = { label: string; value: string | number; icon: any; trend?: string };

export default function AdminCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<StatBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [profRes, roleRes, objekteRes, kundenRes, termineRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, email, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("objekte").select("id", { count: "exact", head: true }),
      supabase.from("crm_kunden").select("id", { count: "exact", head: true }),
      supabase.from("termine").select("id", { count: "exact", head: true }),
    ]);

    setProfiles((profRes.data as ProfileRow[]) || []);

    const roleMap: Record<string, string> = {};
    ((roleRes.data as RoleRow[]) || []).forEach(r => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);

    setStats([
      { label: "Makler gesamt", value: (profRes.data?.length || 0), icon: Users },
      { label: "Objekte", value: objekteRes.count || 0, icon: Building2 },
      { label: "Kunden", value: kundenRes.count || 0, icon: TrendingUp },
      { label: "Termine", value: termineRes.count || 0, icon: Clock },
    ]);

    setLoading(false);
  };

  const quickLinks = [
    { label: "Audit-Logs", desc: "Alle Bestätigungen & Aktionen", icon: FileText, path: "/admin/audit-logs" },
    { label: "SOS-Recht Audit", desc: "Haftungsbestätigungen prüfen", icon: ShieldCheck, path: "/admin/sos-audit" },
    { label: "Bestell-Admin", desc: "Bestellungen verwalten", icon: Settings, path: "/bestell-admin" },
    { label: "Team-Performance", desc: "Makler-Leistungen im Überblick", icon: BarChart3, path: "/team-performance" },
  ];

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
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <UserCog size={18} className="text-primary" /> Nutzer ({profiles.length})
        </h2>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
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
                variant={roles[p.user_id] === "admin" ? "destructive" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {roles[p.user_id] || "makler"}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
