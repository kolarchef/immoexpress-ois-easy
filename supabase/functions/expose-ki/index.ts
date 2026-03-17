import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      form,
      imageDataUrls,
      laenge,
      context = {},
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nicht konfiguriert");

    const {
      zielgruppe,
      verkaufsFokus,
      sprachnotizen,
      analyseOutput,
      standortAnalyse,
      marktAnalyse,
      fotosAnalysieren,
      standortEinbeziehen,
      marktBerücksichtigen,
    } = context;

    const hasImages = fotosAnalysieren && imageDataUrls && imageDataUrls.length > 0;
    const isKurz = laenge === "kurz";

    // ─── Build the ultimate system prompt ───────────────────────────────
    const zielgruppenStil: Record<string, string> = {
      "Investor": "Betone Rendite, Vermietbarkeit, Mietertrag, m²-Preis und Wertsteigerungspotenzial. Nutze sachliche, zahlengestützte Sprache.",
      "Familie": "Betone Raumaufteilung, Spielplätze, Schulen, Sicherheit und Nachbarschaft. Nutze warme, einladende Sprache.",
      "Erstkäufer": "Erkläre verständlich, betone Finanzierbarkeit, Erstbezugsmöglichkeiten und Einzugsfertigkeit. Nutze ermutigende Sprache.",
      "Luxus-Segment": "Betone Exklusivität, hochwertige Materialien, Designelemente, Privatsphäre und Prestige-Lage. Nutze elegante, distinguierte Sprache.",
    };

    const fokusStil: Record<string, string> = {
      "Rendite & Zahlen": "Strukturiere den Text mit klaren Zahlen, Renditeberechnungen, Vergleichswerten und ROI-Prognosen.",
      "Emotion & Wohngefühl": "Erzähle eine Geschichte: Wie fühlt sich das Leben hier an? Male Bilder von Morgenkaffee auf der Terrasse, Familienabenden und Nachbarschaftsflair.",
      "Lage & Infrastruktur": "Detailliere Öffis, Gehminuten zu U-Bahn/Bus, Schulen, Kindergärten, Ärzte, Supermärkte, Parks und Kulturangebote.",
    };

    let systemPrompt = `Du bist ein preisgekrönter Wiener Immobilientexter mit 20 Jahren Erfahrung bei den exklusivsten Maklerbüros Österreichs.

DEIN AUFTRAG: Erstelle einen druckfertigen Exposé-Text, der ohne jede Nachbearbeitung direkt in ein professionelles PDF übernommen werden kann.

QUALITÄTSSTANDARDS:
- Gehobene, österreichische Sprache mit Wiener Charme (aber nicht übertrieben)
- Jeder Satz muss einen Mehrwert bieten – kein Fülltext
- Nutze konkrete Details statt generische Phrasen
- Gliedere klar mit GROSSBUCHSTABEN-Abschnitten
- Der Text muss beim ersten Lesen überzeugen

PFLICHTABSCHNITTE:
1. TRAUMIMMOBILIE IM HERZEN VON [BEZIRK] (emotionaler Einstieg)
2. LAGE & INFRASTRUKTUR (konkretes Umfeld)
3. AUSSTATTUNG & HIGHLIGHTS (Details aus Fotos/Beschreibung)
4. PREISDETAILS & KONDITIONEN
5. RECHTLICHER HINWEIS

${isKurz
  ? "LÄNGE: KOMPAKT – maximal 250 Wörter. Nur das Wesentliche, aber perfekt formuliert."
  : "LÄNGE: AUSFÜHRLICH – 600-900 Wörter mit reichhaltigen Details und emotionaler Tiefe."}

RECHTLICHER PFLICHTHINWEIS (immer am Ende):
"Alle Angaben ohne Gewähr. Provisionspflichtig gemäß Alleinvermittlungsauftrag (§ 14 MaklerG). Ein gültiger Energieausweis liegt vor (§ 6a EAVG)."`;

    // Zielgruppen-Optimierung
    if (zielgruppe && zielgruppenStil[zielgruppe]) {
      systemPrompt += `\n\nZIELGRUPPEN-OPTIMIERUNG (${zielgruppe}):\n${zielgruppenStil[zielgruppe]}`;
    }

    // Fokus-Optimierung
    if (verkaufsFokus && fokusStil[verkaufsFokus]) {
      systemPrompt += `\n\nINHALTLICHER FOKUS (${verkaufsFokus}):\n${fokusStil[verkaufsFokus]}`;
    }

    // ─── Build the user prompt ──────────────────────────────────────────
    let userPromptText = `Erstelle jetzt den finalen Exposé-Text für dieses Objekt:

**OBJEKTDATEN:**
- Titel: ${form.titel || "–"}
- Objektart: ${form.objektart || "–"}
- Bezirk/Lage: ${form.bezirk || "–"}
- Adresse: ${[form.strasse, form.hnr, form.plz, form.ort].filter(Boolean).join(", ") || "–"}
- Wohnfläche: ${form.flaeche ? form.flaeche + " m²" : "–"}
- Zimmer: ${form.zimmer || "–"}
- Vermarktung: ${form.verkaufsart || "Kauf"}
- Preis: ${form.verkaufsart === "Kauf" ? "€ " + (form.kaufpreis || "auf Anfrage") : "€ " + (form.miete || "auf Anfrage") + "/Monat"}
- Provision: ${form.provisionsstellung || "–"}`;

    if (form.beschreibung) {
      userPromptText += `\n\n**OBJEKTBESCHREIBUNG:**\n${form.beschreibung}`;
    }

    // Sprachnotizen als emotionale Basis
    if (sprachnotizen) {
      userPromptText += `\n\n**PERSÖNLICHE EINDRÜCKE VOR ORT (Sprachnotiz-Transkript):**
Nutze diese authentischen Eindrücke des Maklers als emotionale Grundlage für den Text. Verwebe sie natürlich in die Beschreibung:
"${sprachnotizen}"`;
    }

    // Standort-Analyse
    if (standortEinbeziehen && standortAnalyse) {
      userPromptText += `\n\n**STANDORT- & INFRASTRUKTURANALYSE:**
Integriere diese Umgebungsdaten detailliert in den Abschnitt LAGE & INFRASTRUKTUR:
${standortAnalyse}`;
    }

    // Marktanalyse / Intelligence Center Output
    if (marktBerücksichtigen && analyseOutput) {
      userPromptText += `\n\n**MARKTANALYSE & INTELLIGENCE-DATEN:**
Nutze diese Analyse-Daten, um Marktvergleiche, Preisentwicklungen und Investment-Argumente einzubauen:
${analyseOutput}`;
    }

    // Foto-Analyse Anweisung
    if (hasImages) {
      userPromptText += `\n\n**FOTO-ANALYSE:**
Analysiere die ${imageDataUrls.length} hochgeladenen Immobilienfotos im Detail:
- Erkenne Materialien (Parkett, Fliesen, Marmor etc.)
- Beschreibe Lichteinfall und Raumgefühl
- Identifiziere Ausstattungsmerkmale (Einbauküche, Badewanne, Balkon etc.)
- Verwebe diese visuellen Details natürlich in den Exposé-Text`;
    }

    userPromptText += `\n\n**OUTPUT-ANFORDERUNG:**
Liefere ausschließlich den fertigen Exposé-Fließtext. Keine Meta-Kommentare, keine Erklärungen, kein "Hier ist der Text". Beginne direkt mit der Überschrift.`;

    // ─── Assemble messages ──────────────────────────────────────────────
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt }
    ];

    if (hasImages) {
      const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: userPromptText }
      ];
      const limitedImages = imageDataUrls.slice(0, 5);
      for (const imgDataUrl of limitedImages) {
        imageContent.push({ type: "image_url", image_url: { url: imgDataUrl } });
      }
      messages.push({ role: "user", content: imageContent });
    } else {
      messages.push({ role: "user", content: userPromptText });
    }

    // Use Pro for images (vision), Flash for text-only
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Guthaben aufgebraucht. Bitte Workspace-Guthaben aufladen." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
