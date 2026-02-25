import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Fingerprint, LogIn, Train } from "lucide-react";
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

    // Voiceover: play once with fade-in
    const audio = new Audio("/audio/voiceover_login.mp3");
    audio.volume = 0;
    const fadeIn = () => {
      const interval = setInterval(() => {
        if (audio.volume < 0.95) {
          audio.volume = Math.min(audio.volume + 0.05, 1);
        } else {
          audio.volume = 1;
          clearInterval(interval);
        }
      }, 80);
    };
    audio.addEventListener("canplaythrough", () => {
      audio.play().then(fadeIn).catch(() => {});
    }, { once: true });
    audio.load();

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/login_3.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50 z-[1]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm space-y-6 px-4">
        {/* Logo & Branding */}
        <div className="text-center space-y-3">
          <img
            src={logoImg}
            alt="ImmoExpress"
            className="h-20 w-20 rounded-2xl mx-auto shadow-lg ring-2 ring-[hsl(43,90%,55%)]/40"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ImmoExpress <span className="text-[hsl(43,90%,55%)]">brainy</span>
          </h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-xs mx-auto">
            Willkommen bei Immo Express brainy. Dein Einstieg in die Welt der exklusiven Immobilienvermittlung. Sicher, schnell und mit der vollen Power unseres Express.
          </p>
        </div>

        {/* Biometric Login Button */}
        {biometricAvailable && hasBiometricCred && isLogin && (
          <button
            onClick={handleBiometricLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-[hsl(43,90%,55%)]/30 rounded-2xl p-4 hover:bg-white/15 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-[hsl(43,90%,55%)]/20 flex items-center justify-center">
              <Fingerprint size={28} className="text-[hsl(43,90%,55%)]" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white text-sm">Mit Biometrie anmelden</div>
              <div className="text-xs text-white/60">Fingerabdruck oder FaceID</div>
            </div>
          </button>
        )}

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-4"
        >
          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-white/80 text-sm">Name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Max Mustermann"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[hsl(43,90%,55%)]"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80 text-sm">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@immoexpress.at"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[hsl(43,90%,55%)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80 text-sm">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[hsl(43,90%,55%)]"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 bg-[hsl(43,90%,55%)] hover:bg-[hsl(43,90%,48%)] text-black font-bold rounded-xl h-12 text-base shadow-lg shadow-[hsl(43,90%,55%)]/25"
          >
            <Train size={18} />
            {loading ? "Laden..." : isLogin ? "Einsteigen & Losfahren" : "Registrieren"}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-white/60">
          {isLogin ? "Noch kein Konto?" : "Bereits registriert?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[hsl(43,90%,55%)] font-semibold hover:underline"
          >
            {isLogin ? "Registrieren" : "Anmelden"}
          </button>
        </p>

        {/* Tagline */}
        <p className="text-center text-xs text-white/40 pt-2">
          Logge dich ein und bring dein Immobilien-Business auf die Überholspur.
        </p>
      </div>
    </div>
  );
}
