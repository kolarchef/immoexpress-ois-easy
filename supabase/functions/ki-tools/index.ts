import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, imageDataUrls, messageText, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
    let model = "google/gemini-3-flash-preview";

    if (action === "describe-images") {
      // Bilderkennung für Exposé-Fotos
      model = "google/gemini-2.5-pro";
      const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        {
          type: "text",
          text: `Analysiere diese Immobilienfotos und erstelle für JEDES Bild eine kurze, verkaufsstarke Beschreibung (1-2 Sätze) im Stil eines Wiener Immobilienmaklers.

Antworte als JSON-Array mit Objekten: [{"index": 0, "label": "Kurzes Label", "description": "Beschreibung"}]

Erkenne automatisch: Raumtyp (Bad, Küche, Wohnzimmer, Schlafzimmer, Balkon etc.), Ausstattung (Parkett, Fliesen, moderne Küche etc.), Besonderheiten (Licht, Aussicht, Raumgröße).`
        }
      ];
      
      const limited = (imageDataUrls || []).slice(0, 10);
      for (const imgUrl of limited) {
        imageContent.push({ type: "image_url", image_url: { url: imgUrl } });
      }
      messages = [
        { role: "system", content: "Du bist ein erfahrener Wiener Immobilienmakler. Antworte NUR mit validem JSON." },
        { role: "user", content: imageContent }
      ];
    } else if (action === "extract-contact") {
      // KI-Extraktion von Kontaktdaten aus Nachricht
      messages = [
        { role: "system", content: "Du extrahierst Kontaktdaten aus Texten. Antworte NUR mit validem JSON: {\"name\": \"...\", \"email\": \"...\", \"phone\": \"...\", \"notes\": \"...\"}. Wenn ein Feld nicht gefunden wird, setze es auf null." },
        { role: "user", content: `Extrahiere Name, E-Mail und Telefonnummer aus folgendem Text:\n\n${messageText}` }
      ];
    } else if (action === "suggest-reply") {
      // KI-Antwortvorschlag
      messages = [
        { role: "system", content: "Du bist ein professioneller Wiener Immobilienmakler. Formuliere eine höfliche, professionelle Antwort auf die Kundenanfrage. Halte dich kurz (max. 3-4 Sätze). Verwende gehobenes Österreichisches Deutsch." },
        { role: "user", content: `Kundenanfrage:\n"${messageText}"\n\n${context ? `Kontext: ${context}` : ""}Erstelle einen Antwortvorschlag.` }
      ];
    } else {
      throw new Error("Unbekannte Aktion: " + action);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: false }),
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

    return new Response(JSON.stringify({ result: text, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ki-tools Fehler:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
