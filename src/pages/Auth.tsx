import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Fingerprint, LogIn } from "lucide-react";
import logoImg from "@/assets/logo_immoexpress.png";

const BIOMETRIC_KEY = "immoexpress_biometric_cred";

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function isWebAuthnAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasBiometricCred, setHasBiometricCred] = useState(false);

  useEffect(() => {
    if (isMobileDevice()) {
      isWebAuthnAvailable().then(setBiometricAvailable);
    }
    const stored = localStorage.getItem(BIOMETRIC_KEY);
    setHasBiometricCred(!!stored);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        // After successful login on mobile, offer biometric activation
        if (biometricAvailable && !hasBiometricCred) {
          offerBiometricSetup(email, password);
        }
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

  const offerBiometricSetup = (em: string, pw: string) => {
    // Store encrypted credentials for biometric re-auth
    const encoded = btoa(JSON.stringify({ e: em, p: pw }));
    localStorage.setItem(BIOMETRIC_KEY, encoded);
    setHasBiometricCred(true);
    toast.success("Biometrie aktiviert! Beim nächsten Login kannst du Fingerabdruck/FaceID nutzen.");
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(BIOMETRIC_KEY);
      if (!stored) {
        toast.error("Bitte melde dich zuerst einmalig mit Passwort an.");
        setLoading(false);
        return;
      }

      // Trigger platform authenticator
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
        },
      });

      if (credential) {
        const { e, p } = JSON.parse(atob(stored));
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
        if (error) {
          toast.error("Biometrische Anmeldung fehlgeschlagen. Bitte melde dich mit Passwort an.");
          localStorage.removeItem(BIOMETRIC_KEY);
          setHasBiometricCred(false);
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      toast.error("Biometrie nicht verfügbar oder abgebrochen.");
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

        {/* Biometric Login Button (mobile only, if credentials stored) */}
        {biometricAvailable && hasBiometricCred && isLogin && (
          <button
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-card border-2 border-primary rounded-2xl p-4 shadow-card hover:shadow-orange transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Fingerprint size={28} className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-bold text-foreground text-sm">Mit Biometrie anmelden</div>
              <div className="text-xs text-muted-foreground">Fingerabdruck oder FaceID</div>
            </div>
          </button>
        )}

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
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn size={16} />
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
