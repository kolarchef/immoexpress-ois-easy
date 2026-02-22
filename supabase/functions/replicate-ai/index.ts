import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Get user's Replicate API key from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("replicate_api_key")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.replicate_api_key) {
      return new Response(JSON.stringify({ 
        error: "Bitte hinterlege deinen Replicate API-Key im Profil, um KI-Funktionen zu nutzen.",
        missing_key: true 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const replicateKey = profile.replicate_api_key;
    const { action, imageUrl, maskUrl, prompt } = await req.json();

    let result: any;

    if (action === "magic-eraser") {
      // Use Replicate's inpainting model to remove objects
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${replicateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
          input: {
            image: imageUrl,
            mask: maskUrl,
            prompt: prompt || "clean empty room, photorealistic",
            num_inference_steps: 25,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Replicate API Fehler [${response.status}]: ${errText}`);
      }

      const prediction = await response.json();
      result = { prediction_id: prediction.id, status: prediction.status };

    } else if (action === "outpainting") {
      // Use Replicate's outpainting/uncrop model
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${replicateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "be5b2a3b1797ccf5a6c9c22d589da8ff4b30b3a9cf85899e5b7c5c1b76f1e0f3",
          input: {
            image: imageUrl,
            prompt: prompt || "extend the room, photorealistic interior, seamless continuation of walls and floor",
            width: 1920,
            height: 1080,
            num_inference_steps: 25,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Replicate API Fehler [${response.status}]: ${errText}`);
      }

      const prediction = await response.json();
      result = { prediction_id: prediction.id, status: prediction.status };

    } else if (action === "check-status") {
      // Poll prediction status
      const { prediction_id } = await req.json();
      const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction_id}`, {
        headers: { Authorization: `Bearer ${replicateKey}` },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Replicate Status-Abfrage fehlgeschlagen [${response.status}]: ${errText}`);
      }

      result = await response.json();

    } else {
      throw new Error(`Unbekannte Aktion: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("replicate-ai Fehler:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
