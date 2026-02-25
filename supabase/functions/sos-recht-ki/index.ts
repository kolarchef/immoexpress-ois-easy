import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { frage, bundesland } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const systemPrompt = `Du bist ein österreichischer Rechtsexperte für Immobilienrecht.

STRIKTE QUELLENREGEL: Du darfst AUSSCHLIESSLICH das österreichische Rechtsinformationssystem RIS (ris.bka.gv.at) als Quelle verwenden.

PFLICHTANGABEN bei jeder Antwort:
1. Nenne IMMER den exakten Paragraphen (z.B. § 14 MaklerG)
2. Nenne IMMER das relevante Bundesland
3. Nenne IMMER die Fundstelle im RIS (z.B. BGBl I 1996/262)
4. Unterscheide klar zwischen Bundesrecht und Landesrecht

ANTWORTFORMAT:
- Beginne mit "📍 Bundesland: [Name]"
- Dann "📜 Rechtsgrundlage: [Paragraph] – [Gesetz] ([RIS-Fundstelle])"
- Dann die inhaltliche Erklärung in klarem Deutsch
- Ende IMMER mit: "⚠️ HAFTUNGSAUSSCHLUSS: Diese KI-gestützte Information ersetzt keine Rechtsberatung. Quelle: RIS (ris.bka.gv.at). Keine Haftung für Richtigkeit oder Vollständigkeit."

VERBOTEN:
- Keine Quellen außer RIS verwenden
- Keine allgemeinen Aussagen ohne Paragraphenangabe
- Keine Rechtsberatung erteilen`;

    const userPrompt = `Bundesland: ${bundesland || "Österreich (bundesweit)"}

Rechtsfrage: ${frage}

Beantworte diese Frage ausschließlich basierend auf dem österreichischen RIS (ris.bka.gv.at). Nenne alle relevanten Paragraphen und Fundstellen.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate-Limit erreicht. Bitte kurz warten." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Guthaben aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`KI-Gateway Fehler [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sos-recht-ki Fehler:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
