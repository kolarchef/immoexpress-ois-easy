import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { form, imageDataUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const hasImages = imageDataUrls && imageDataUrls.length > 0;

    // Systemanweisung auf Österreichisch
    const systemPrompt = `Du bist ein erfahrener Wiener Immobilienmakler und Textspezialist. 
Erstelle emotionale, verkaufsstarke Exposé-Texte im österreichischen Stil.
Verwende gehobene Sprache, typisch wienerische Ausdrücke und hebe Lage und Lebensgefühl hervor.
Beachte immer die österreichischen Rechtsvorgaben (MaklerG, EAVG).
Schreibe kompakt und überzeugend, maximal 600 Wörter.`;

    // Nachrichten zusammenstellen
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt }
    ];

    if (hasImages) {
      // Vision-KI: Bilder + Objektdaten
      const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        {
          type: "text",
          text: `Analysiere die hochgeladenen Immobilienfotos und erstelle einen verkaufsstarken Exposé-Text für folgendes Objekt:

**Objektdaten:**
- Titel: ${form.titel || "–"}
- Objektart: ${form.objektart || "–"}
- Bezirk/Lage: ${form.bezirk || "–"}
- Wohnfläche: ${form.flaeche ? form.flaeche + " m²" : "–"}
- Zimmer: ${form.zimmer || "–"}
- Vermarktung: ${form.verkaufsart || "Kauf"}
- Preis: ${form.verkaufsart === "Kauf" ? "€ " + (form.kaufpreis || "auf Anfrage") : "€ " + (form.miete || "auf Anfrage") + "/Monat"}
- Beschreibung: ${form.beschreibung || "–"}

**Anweisung:**
1. Analysiere die Fotos und beschreibe erkannte Ausstattungsmerkmale (Böden, Küche, Bad, Licht, etc.)
2. Erstelle einen emotionalen Fließtext im Wiener Makler-Stil
3. Betone die Lage (${form.bezirk || "Wien"}) mit Infrastruktur & Lebensqualität
4. Füge am Ende IMMER diesen Rechtshinweis ein:
"Alle Angaben ohne Gewähr. Provisionspflichtig gemäß Alleinvermittlungsauftrag (§ 14 MaklerG). Ein gültiger Energieausweis liegt vor (§ 6a EAVG)."

Formatiere mit GROSSBUCHSTABEN-Abschnitten: LAGE & INFRASTRUKTUR, AUSSTATTUNG & HIGHLIGHTS, PREISDETAILS, RECHTLICHER HINWEIS.`
        }
      ];

      // Bilder hinzufügen (max. 5)
      const limitedImages = imageDataUrls.slice(0, 5);
      for (const imgDataUrl of limitedImages) {
        imageContent.push({
          type: "image_url",
          image_url: { url: imgDataUrl }
        });
      }

      messages.push({ role: "user", content: imageContent });
    } else {
      // Nur Text-KI
      messages.push({
        role: "user",
        content: `Erstelle einen verkaufsstarken Exposé-Text für dieses österreichische Immobilienobjekt:

**Objektdaten:**
- Titel: ${form.titel || "–"}
- Objektart: ${form.objektart || "–"}
- Bezirk/Lage: ${form.bezirk || "–"}
- Wohnfläche: ${form.flaeche ? form.flaeche + " m²" : "–"}
- Zimmer: ${form.zimmer || "–"}
- Vermarktung: ${form.verkaufsart || "Kauf"}
- Preis: ${form.verkaufsart === "Kauf" ? "€ " + (form.kaufpreis || "auf Anfrage") : "€ " + (form.miete || "auf Anfrage") + "/Monat"}
- Beschreibung: ${form.beschreibung || "–"}

Formatiere mit GROSSBUCHSTABEN-Abschnitten: LAGE & INFRASTRUKTUR, AUSSTATTUNG & HIGHLIGHTS, PREISDETAILS, RECHTLICHER HINWEIS.
Füge am Ende IMMER den Rechtshinweis zu MaklerG § 14 und EAVG § 6a ein.`
      });
    }

    const model = hasImages ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

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
        return new Response(JSON.stringify({ error: "Rate-Limit erreicht. Bitte kurz warten und erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Guthaben aufgebraucht. Bitte Workspace-Guthaben aufladen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      throw new Error(`KI-Gateway Fehler [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text: generatedText, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expose-ki Fehler:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
