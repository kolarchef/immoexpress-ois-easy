import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoImg from "@/assets/logo_immoexpress.png";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Bestätigungs-E-Mail gesendet! Bitte prüfe dein Postfach.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src={logoImg} alt="ImmoExpress" className="h-16 w-16 rounded-2xl mx-auto shadow-orange" />
          <h1 className="text-xl font-bold text-foreground">ImmoExpress brainy</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Melde dich an, um fortzufahren" : "Erstelle dein Maklerkonto"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Max Mustermann" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@immoexpress.at" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Laden..." : isLogin ? "Anmelden" : "Registrieren"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
            {isLogin ? "Registrieren" : "Anmelden"}
          </button>
        </p>
      </div>
    </div>
  );
}
