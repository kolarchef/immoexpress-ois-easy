import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useApiKeys() {
  const { user } = useAuth();
  const [hasReplicateKey, setHasReplicateKey] = useState(false);
  const [hasElevenlabsKey, setHasElevenlabsKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("replicate_api_key, elevenlabs_api_key")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setHasReplicateKey(!!(data as any)?.replicate_api_key);
        setHasElevenlabsKey(!!(data as any)?.elevenlabs_api_key);
        setLoading(false);
      });
  }, [user]);

  return { hasReplicateKey, hasElevenlabsKey, loading };
}
