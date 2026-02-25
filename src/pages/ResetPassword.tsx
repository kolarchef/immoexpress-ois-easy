import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoImg from "@/assets/logo_immoexpress.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValid(true);
    }
    // Also listen for auth state to catch the recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValid(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Passwort erfolgreich geändert!");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src="/videos/login_3.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50 z-[1]" />

      <div className="relative z-10 w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-3">
          <img src={logoImg} alt="ImmoExpress" className="h-20 w-20 rounded-2xl mx-auto shadow-lg ring-2 ring-[hsl(43,90%,55%)]/40" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Neues <span className="text-[hsl(43,90%,55%)]">Passwort</span>
          </h1>
        </div>

        {valid ? (
          <form onSubmit={handleReset} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw" className="text-white/80 text-sm">Neues Passwort</Label>
              <Input id="new-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[hsl(43,90%,55%)]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw" className="text-white/80 text-sm">Passwort bestätigen</Label>
              <Input id="confirm-pw" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[hsl(43,90%,55%)]" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[hsl(43,90%,55%)] hover:bg-[hsl(43,90%,48%)] text-black font-bold rounded-xl h-12 text-base shadow-lg shadow-[hsl(43,90%,55%)]/25">
              {loading ? "Speichern..." : "Passwort speichern"}
            </Button>
          </form>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-center space-y-4">
            <p className="text-white/70 text-sm">Ungültiger oder abgelaufener Link. Bitte fordere einen neuen Reset-Link an.</p>
            <Button onClick={() => navigate("/auth")} className="bg-[hsl(43,90%,55%)] hover:bg-[hsl(43,90%,48%)] text-black font-bold rounded-xl">
              Zum Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
